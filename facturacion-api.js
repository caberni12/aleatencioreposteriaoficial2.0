(() => {
  const cfg=()=>window.ALE_ATENCIO_CONFIG||{};
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const adminToken=()=>localStorage.getItem('aleAdminToken')||sessionStorage.getItem('aleAdminToken')||'';
  let state={loaded:false,ambiente:'CERTIFICACION',proveedor_activo:null,mostrar_todos_documentos:false,proveedores:[]};
  let fclCredentialState={bootstrap_ready:null,prueba_ready:false,produccion_ready:false};

  function makeError(message,status=0,payload=null){const e=new Error(String(message||payload?.error||'FACTURACION_API_ERROR'));e.status=status;e.payload=payload;return e}
  function validUrl(v){return /^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/[A-Za-z0-9_-]+\/?$/i.test(String(v||'').trim())}
  function managerUrl(){return String(cfg().FACTURACION_PROVIDERS_API_URL||'').trim().replace(/\/+$/,'')}
  function providerUrl(code){
    const map=cfg().FACTURACION_PROVIDERS||{},item=map?.[code];
    if(!item)return'';
    const key=String(item.api||'');return String(cfg()?.[key]||'').trim().replace(/\/+$/,'');
  }
  async function rawCall(url,action,data={},token='',timeoutMs=45000){
    if(!validUrl(url))throw makeError('API_FACTURACION_NO_CONFIGURADA');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const headers={'Content-Type':'application/json'};if(token)headers['X-Ale-Session']=String(token);
      const r=await fetch(url,{method:'POST',mode:'cors',cache:'no-store',credentials:'omit',headers,body:JSON.stringify({action,data,token}),signal:controller.signal});
      const text=await r.text();let payload={};try{payload=text?JSON.parse(text):{}}catch(_){throw makeError('RESPUESTA_FACTURACION_INVALIDA',r.status,{raw:text.slice(0,800)})}
      if(!r.ok||payload?.ok===false)throw makeError(payload?.error||`HTTP_${r.status}`,r.status,payload);return payload;
    }catch(e){if(e?.name==='AbortError')throw makeError('FACTURACION_API_TIMEOUT');throw e}finally{clearTimeout(timer)}
  }
  async function manager(action,data={},token=adminToken(),timeoutMs=20000){const url=managerUrl();if(!validUrl(url))throw makeError('FACTURACION_PROVIDERS_API_NO_CONFIGURADA');return rawCall(url,action,data,token,timeoutMs)}
  async function load(force=false,token=adminToken()){
    if(state.loaded&&!force)return state;
    const out=await manager('status',{},token,20000);
    state={loaded:true,ambiente:out.ambiente||'CERTIFICACION',proveedor_activo:out.proveedor_activo||null,mostrar_todos_documentos:Boolean(out.mostrar_todos_documentos),proveedores:Array.isArray(out.proveedores)?out.proveedores:[]};
    render();
    return state;
  }
  function activeCodeCached(){return state.proveedor_activo||null}
  function activeProvider(){return state.proveedores.find(x=>String(x.codigo)===String(state.proveedor_activo))||null}
  function label(code){return state.proveedores.find(x=>String(x.codigo)===String(code))?.nombre||(code==='SII_PROPIO'?'Facturación Propia':code==='FACTURACION_CL'?'Facturacion.cl':String(code||'—'))}
  async function activate(code,token=adminToken()){
    const out=await manager('activate',{codigo:code},token,20000);await load(true,token);window.dispatchEvent(new CustomEvent('ale:billing-provider-changed',{detail:{codigo:code}}));return out;
  }
  async function saveEnvironment(ambiente,token=adminToken()){
    const env=String(ambiente||'').toUpperCase()==='PRODUCCION'?'PRODUCCION':'CERTIFICACION';const out=await manager('environment_save',{ambiente:env},token,20000);await load(true,token);const sii=$('#siiEnvironment');if(sii)sii.value=env;window.dispatchEvent(new CustomEvent('ale:billing-environment-changed',{detail:{ambiente:env}}));return out;
  }
  async function saveDocumentsView(mostrar,token=adminToken()){
    const value=Boolean(mostrar);const out=await manager('documents_view_save',{mostrar_todos_documentos:value},token,20000);await load(true,token);window.dispatchEvent(new CustomEvent('ale:billing-documents-view-changed',{detail:{mostrar_todos_documentos:value}}));return out;
  }
  async function saveProvider(data,token=adminToken()){const out=await manager('provider_save',data,token,20000);await load(true,token);return out}
  async function testConnection(code,token=adminToken()){
    const c=String(code||'').toUpperCase();
    if(c==='SII_PROPIO'){
      if(!window.SiiAPI?.configured())throw makeError('FACTURACION_PROPIA_API_NO_CONFIGURADA');
      const out=await window.SiiAPI.status(token);return{ok:true,provider:c,version:out?.version||out?.config?.version||'facturacion-sii'};
    }
    if(c==='FACTURACION_CL')return rawCall(providerUrl(c),'health',{},token,30000);
    throw makeError('PROVEEDOR_NO_SOPORTADO');
  }
  async function fclGateway(action,data={},token=adminToken(),timeoutMs=30000){return rawCall(providerUrl('FACTURACION_CL'),action,data,token,timeoutMs)}
  function fclEnvIds(env){const prod=String(env).toUpperCase()==='PRODUCCION';return{usuario:prod?'#fclProduccionUsuario':'#fclPruebaUsuario',rut:prod?'#fclProduccionRut':'#fclPruebaRut',clave:prod?'#fclProduccionClave':'#fclPruebaClave',status:prod?'#fclProduccionStatus':'#fclPruebaStatus',result:prod?'#fclProduccionResult':'#fclPruebaResult'}}
  function setFclStatus(env,ready,label){const ids=fclEnvIds(env),el=$(ids.status);if(!el)return;el.textContent=label||(ready?'Guardadas':'Pendientes');el.classList.toggle('is-ready',!!ready);el.classList.toggle('is-warning',!ready);el.classList.remove('is-error')}
  function setFclResult(env,message,type=''){const el=$(fclEnvIds(env).result);if(!el)return;el.textContent=message||'';el.classList.toggle('is-ok',type==='ok');el.classList.toggle('is-error',type==='error')}
  function clearFclCredentialInputs(env){const ids=fclEnvIds(env);[ids.usuario,ids.rut,ids.clave].forEach(id=>{const el=$(id);if(el)el.value=''});const pass=$(ids.clave);if(pass)pass.type='password'}
  async function loadFclCredentialStatus(){
    const section=$('#billingFacturacionClCredentials');if(!section)return fclCredentialState;
    let secure=null,gateway=null;
    try{secure=await window.AleAPI.post('facturacionclcredentialsstatus',{},adminToken())}catch(err){secure={ok:false,bootstrap_ready:false,error:String(err?.message||err)}}
    try{gateway=await fclGateway('config',{},adminToken(),20000)}catch(err){gateway={ok:false,error:String(err?.message||err)}}
    const prueba=Boolean(gateway?.credentials_ready_prueba??secure?.prueba_ready),produccion=Boolean(gateway?.credentials_ready_produccion??secure?.produccion_ready);
    fclCredentialState={bootstrap_ready:secure?.bootstrap_ready===true,prueba_ready:prueba,produccion_ready:produccion};
    setFclStatus('PRUEBA',prueba);setFclStatus('PRODUCCION',produccion);
    const bootstrap=$('#fclSecretBootstrap');if(bootstrap)bootstrap.classList.toggle('hidden',secure?.bootstrap_ready!==false);
    section.querySelectorAll('[data-fcl-credentials-save],[data-fcl-credentials-delete]').forEach(b=>b.disabled=secure?.bootstrap_ready===false);
    return fclCredentialState;
  }
  async function saveFclCredentials(env,button){
    const ids=fclEnvIds(env),usuario=$(ids.usuario)?.value?.trim()||'',rut=$(ids.rut)?.value?.trim()||'',clave=$(ids.clave)?.value||'';
    if(!usuario||!rut||!clave.trim())throw makeError('Completa Usuario, RUT y Clave antes de guardar');
    button.disabled=true;setFclResult(env,'Guardando en Supabase Secrets…');
    try{
      await window.AleAPI.post('facturacionclcredentialsset',{environment:env,usuario,rut,clave},adminToken(),{timeoutMs:30000});
      clearFclCredentialInputs(env);setFclResult(env,'✓ Credenciales guardadas. Los valores fueron eliminados de los campos del navegador.','ok');
      await new Promise(r=>setTimeout(r,700));await loadFclCredentialStatus();
      return true;
    }finally{button.disabled=false}
  }
  async function testFclLogin(env,button){
    button.disabled=true;setFclResult(env,'Autenticando contra https://rest.facturacion.cl/login …');
    try{
      let out;let last;
      for(let attempt=0;attempt<3;attempt++){try{out=await fclGateway('test_login',{environment:env},adminToken(),30000);last=null;break}catch(err){last=err;if(attempt<2)await new Promise(r=>setTimeout(r,700*(attempt+1)))}}
      if(last)throw last;
      setFclStatus(env,true,'Login OK');setFclResult(env,`✓ Login REST correcto${out?.remote_version?` · servicio ${out.remote_version}`:''}. El token quedó solamente en el gateway.`,'ok');
      return out;
    }catch(err){setFclStatus(env,false,'Error');const code=String(err?.message||err);setFclResult(env,`✕ ${code}`,'error');throw err}finally{button.disabled=false}
  }
  async function deleteFclCredentials(env,button){
    if(!confirm(`¿Eliminar las credenciales de ${env==='PRODUCCION'?'PRODUCCIÓN':'PRUEBA'} de Facturacion.cl del servidor?`))return;
    button.disabled=true;try{await window.AleAPI.post('facturacionclcredentialsdelete',{environment:env},adminToken(),{timeoutMs:30000});clearFclCredentialInputs(env);setFclResult(env,'Credenciales eliminadas del servidor.','');await loadFclCredentialStatus()}finally{button.disabled=false}
  }
  async function orderPreview(ref,token=adminToken()){
    if(!state.loaded)await load(false,token);const code=activeCodeCached();
    if(code==='SII_PROPIO'){if(!window.SiiAPI?.configured())throw makeError('FACTURACION_PROPIA_API_NO_CONFIGURADA');return window.SiiAPI.orderPreview(ref,token)}
    if(code==='FACTURACION_CL')return rawCall(providerUrl(code),'order_preview',{pedido_id:String(ref||'')},token,30000);
    throw makeError('PROVEEDOR_FACTURACION_NO_ACTIVO');
  }
  async function issue(data,token=adminToken()){
    if(!state.loaded)await load(false,token);const code=activeCodeCached();
    if(code==='SII_PROPIO'){
      if(!window.SiiAPI?.configured())throw makeError('FACTURACION_PROPIA_API_NO_CONFIGURADA');
      const out=await window.SiiAPI.issue(data,token);return{...out,provider_code:code,provider_name:label(code)};
    }
    if(code==='FACTURACION_CL'){
      const payload={pedido_id:data.pedido_id,tipo_dte:Number(data.tipo_dte||0)};
      if(data.referencia)payload.referencia=data.referencia;
      const out=await rawCall(providerUrl(code),'emit_order',payload,token,90000);return{...out,provider_code:code,provider_name:label(code)};
    }
    throw makeError('PROVEEDOR_FACTURACION_NO_ACTIVO');
  }
  async function pdfForProvider(code,tipo,folio,token=adminToken()){
    const c=String(code||'').toUpperCase();
    if(c!=='FACTURACION_CL')throw makeError('PDF_EXTERNO_NO_APLICA');
    return rawCall(providerUrl(c),'pdf',{tipo_dte:Number(tipo),folio:Number(folio),cedible:false},token,60000);
  }
  async function pdf(tipo,folio,token=adminToken()){
    if(!state.loaded)await load(false,token);return pdfForProvider(activeCodeCached(),tipo,folio,token);
  }
  async function documentsForProvider(code,token=adminToken()){
    const c=String(code||'').toUpperCase();
    if(c==='SII_PROPIO'){
      if(!window.SiiAPI?.configured())throw makeError('FACTURACION_PROPIA_API_NO_CONFIGURADA');
      const out=window.SiiAPI.documents?await window.SiiAPI.documents(token,200):await window.SiiAPI.status(token);
      const rows=out.documentos||out.documents||[];
      return rows.map(x=>({...x,provider_code:'SII_PROPIO',provider_name:label('SII_PROPIO'),external_provider:false}));
    }
    if(c==='FACTURACION_CL'){
      const out=await rawCall(providerUrl(c),'documents',{limit:200},token,30000);
      return (out.documents||[]).map(x=>({...x,provider_code:'FACTURACION_CL',provider_name:label('FACTURACION_CL'),external_provider:true,razon_social_receptor:x.receptor_razon||'',rut_receptor:x.receptor_rut||''}));
    }
    return[];
  }
  async function documents(token=adminToken()){
    if(!state.loaded)await load(false,token);
    const codes=state.mostrar_todos_documentos?['SII_PROPIO','FACTURACION_CL']:[activeCodeCached()].filter(Boolean);
    const settled=await Promise.allSettled(codes.map(code=>documentsForProvider(code,token)));
    const docs=[],errors=[];
    settled.forEach((result,index)=>{if(result.status==='fulfilled')docs.push(...result.value);else errors.push({provider:codes[index],error:String(result.reason?.message||result.reason||'ERROR')})});
    if(!docs.length&&errors.length===codes.length)throw makeError(errors.map(x=>`${x.provider}:${x.error}`).join(' | '));
    docs.sort((a,b)=>new Date(b.fecha_emision||b.creado_en||0).getTime()-new Date(a.fecha_emision||a.creado_en||0).getTime());
    return{ok:true,documents:docs,mostrar_todos_documentos:state.mostrar_todos_documentos,errors};
  }
  function render(){
    const env=$('#billingEnvironment');if(env)env.value=state.ambiente||'CERTIFICACION';const hiddenSii=$('#siiEnvironment');if(hiddenSii)hiddenSii.value=state.ambiente||'CERTIFICACION';
    const active=$('#billingActiveProviderName');if(active)active.textContent=label(state.proveedor_activo);const activeModal=$('#billingActiveProviderNameModal');if(activeModal)activeModal.textContent=label(state.proveedor_activo);
    const allDocs=$('#billingShowAllDocuments');if(allDocs)allDocs.checked=Boolean(state.mostrar_todos_documentos);const scope=$('#billingDocumentsScope');if(scope)scope.textContent=state.mostrar_todos_documentos?'Todos los proveedores':'Solo proveedor activo';
    const tbody=$('#billingProviderTable');if(tbody){tbody.innerHTML=state.proveedores.map(p=>{const api=providerUrl(p.codigo),checked=p.activo?'checked':'',disabled=!p.habilitado?'disabled':'',status=p.habilitado?'Habilitado':'Inactivo';return `<tr><td><div class="billing-provider-name"><strong>${esc(p.nombre)}</strong><small>${esc(p.codigo)}</small></div></td><td><span class="billing-provider-type">${esc(p.tipo)}</span></td><td><span class="billing-api-status ${api?'ok':'warn'}">${api?'Configurada':'Pendiente'}</span></td><td><span class="billing-provider-state ${p.habilitado?'':'off'}">${status}</span></td><td><label class="billing-provider-switch" title="Activo"><input type="checkbox" data-billing-provider-active="${esc(p.codigo)}" ${checked} ${disabled}><span></span></label></td><td><div class="billing-provider-actions"><button class="btn btn-light btn-compact" type="button" data-billing-provider-edit="${esc(p.codigo)}"><i class="bi bi-pencil-square"></i> Editar</button><button class="btn btn-light btn-compact" type="button" data-billing-provider-test="${esc(p.codigo)}"><i class="bi bi-plug"></i> Probar conexión</button></div></td></tr>`}).join('')||'<tr><td colspan="6">Sin proveedores configurados.</td></tr>'}
    const badge=$('#billingEnvironmentBadge');if(badge){badge.textContent=state.ambiente==='PRODUCCION'?'PRODUCCIÓN':'CERTIFICACIÓN';badge.classList.toggle('production',state.ambiente==='PRODUCCION');badge.classList.toggle('certification',state.ambiente!=='PRODUCCION')}
    if(typeof window.updateSiiIssueModeUi==='function')try{window.updateSiiIssueModeUi()}catch(_){}
  }
  function openProvidersModal(){const modal=$('#billingProvidersModal');if(!modal)return;modal.classList.remove('hidden');document.body.classList.add('sii-modal-open');}
  function closeProvidersModal(){const modal=$('#billingProvidersModal');if(modal)modal.classList.add('hidden');if(!document.querySelector('.sii-modal:not(.hidden)'))document.body.classList.remove('sii-modal-open');}
  function openProviderEditor(code){
    const p=state.proveedores.find(x=>String(x.codigo)===String(code));if(!p)return;
    const modal=$('#billingProviderEditor');if(!modal)return;
    $('#billingProviderCode').value=p.codigo||'';$('#billingProviderName').value=p.nombre||'';$('#billingProviderType').value=p.tipo||'';$('#billingProviderEnabled').value=p.habilitado?'SI':'NO';$('#billingProviderNotes').value=p.observaciones||'';
    const fcl=$('#billingFacturacionClCredentials');if(fcl)fcl.classList.toggle('hidden',String(p.codigo).toUpperCase()!=='FACTURACION_CL');
    clearFclCredentialInputs('PRUEBA');clearFclCredentialInputs('PRODUCCION');
    modal.classList.remove('hidden');document.body.classList.add('sii-modal-open');
    if(String(p.codigo).toUpperCase()==='FACTURACION_CL')loadFclCredentialStatus().catch(()=>{});
  }
  function closeProviderEditor(){clearFclCredentialInputs('PRUEBA');clearFclCredentialInputs('PRODUCCION');const modal=$('#billingProviderEditor');if(modal)modal.classList.add('hidden');if(!document.querySelector('.sii-modal:not(.hidden)'))document.body.classList.remove('sii-modal-open')}
  async function persistProviderEditor(token=adminToken()){
    const codigo=$('#billingProviderCode')?.value||'',nombre=$('#billingProviderName')?.value?.trim()||'',habilitado=$('#billingProviderEnabled')?.value==='SI',observaciones=$('#billingProviderNotes')?.value?.trim()||'';
    if(!codigo)throw makeError('PROVEEDOR_REQUERIDO');if(!nombre)throw makeError('NOMBRE_REQUERIDO');
    const out=await saveProvider({codigo,nombre,habilitado,observaciones},token);closeProviderEditor();return out;
  }
  function notify(msg){if(typeof window.toast==='function')return window.toast(msg);const el=$('#adminToast');if(el){el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)}}
  document.addEventListener('change',async e=>{
    const historySwitch=e.target.closest?.('#billingShowAllDocuments');
    if(historySwitch){
      historySwitch.disabled=true;
      try{await saveDocumentsView(historySwitch.checked);notify(historySwitch.checked?'✓ Historial global activado':'✓ Historial limitado al proveedor activo')}catch(err){historySwitch.checked=!historySwitch.checked;notify(`✕ ${err.message||err}`)}finally{historySwitch.disabled=false}
      return;
    }
    const input=e.target.closest?.('[data-billing-provider-active]');if(!input)return;
    if(!input.checked){input.checked=true;return}
    const code=input.dataset.billingProviderActive;input.disabled=true;
    try{await activate(code);notify(`✓ Proveedor activo: ${label(code)}`)}catch(err){notify(`✕ ${err.message||err}`);await load(true).catch(()=>{})}finally{input.disabled=false}
  });
  document.addEventListener('click',async e=>{
    const providersClose=e.target.closest?.('[data-billing-providers-close]');if(providersClose){closeProvidersModal();return}
    const providersOpen=e.target.closest?.('#billingProvidersOpen');if(providersOpen){providersOpen.disabled=true;try{await load(true);openProvidersModal()}catch(err){notify(`✕ ${err.message||err}`)}finally{providersOpen.disabled=false}return}
    const close=e.target.closest?.('[data-billing-provider-close]');if(close){closeProviderEditor();return}
    const eye=e.target.closest?.('[data-fcl-secret-eye]');if(eye){const input=$('#'+eye.dataset.fclSecretEye);if(input){input.type=input.type==='password'?'text':'password';const i=eye.querySelector('i');if(i)i.className=`bi ${input.type==='password'?'bi-eye':'bi-eye-slash'}`}return}
    const fclSave=e.target.closest?.('[data-fcl-credentials-save]');if(fclSave){try{await saveFclCredentials(fclSave.dataset.fclCredentialsSave,fclSave);notify('✓ Credenciales Facturacion.cl guardadas en el servidor')}catch(err){setFclResult(fclSave.dataset.fclCredentialsSave,`✕ ${err.message||err}`,'error');notify(`✕ ${err.message||err}`)}return}
    const fclTest=e.target.closest?.('[data-fcl-login-test]');if(fclTest){try{await testFclLogin(fclTest.dataset.fclLoginTest,fclTest);notify(`✓ Login Facturacion.cl ${fclTest.dataset.fclLoginTest} correcto`)}catch(err){notify(`✕ Facturacion.cl: ${err.message||err}`)}return}
    const fclDelete=e.target.closest?.('[data-fcl-credentials-delete]');if(fclDelete){try{await deleteFclCredentials(fclDelete.dataset.fclCredentialsDelete,fclDelete);notify('✓ Credenciales eliminadas')}catch(err){notify(`✕ ${err.message||err}`)}return}
    const edit=e.target.closest?.('[data-billing-provider-edit]');if(edit){openProviderEditor(edit.dataset.billingProviderEdit);return}
    const save=e.target.closest?.('#billingProviderSave');if(save){save.disabled=true;try{await persistProviderEditor();notify('✓ Proveedor guardado')}catch(err){notify(`✕ ${err.message||err}`)}finally{save.disabled=false}return}
    const test=e.target.closest?.('[data-billing-provider-test]');if(test){test.disabled=true;try{const out=await testConnection(test.dataset.billingProviderTest);notify(`✓ Conexión correcta · ${label(test.dataset.billingProviderTest)}${out?.version?` · ${out.version}`:''}`)}catch(err){notify(`✕ ${label(test.dataset.billingProviderTest)}: ${err.message||err}`)}finally{test.disabled=false}return}
    if(e.target.closest?.('#billingProvidersRefresh')){load(true).catch(err=>notify(`✕ ${err.message||err}`));return}
    if(e.target.closest?.('#billingEnvironmentSave')){const b=e.target.closest('#billingEnvironmentSave');b.disabled=true;try{await saveEnvironment($('#billingEnvironment')?.value);notify('✓ Ambiente de facturación guardado')}catch(err){notify(`✕ ${err.message||err}`)}finally{b.disabled=false}return}
    const nav=e.target.closest?.('[data-view="billing-sii"]');if(nav)setTimeout(()=>load(true).catch(err=>notify(`✕ ${err.message||err}`)),10);
  });
  window.FacturacionAPI={load,manager,activate,saveEnvironment,saveDocumentsView,saveProvider,testConnection,loadFclCredentialStatus,saveFclCredentials,testFclLogin,orderPreview,issue,pdf,pdfForProvider,documents,documentsForProvider,activeCodeCached,activeProvider,label,providerUrl,openProvidersModal,closeProvidersModal,openProviderEditor,closeProviderEditor,get state(){return state}};
  document.addEventListener('DOMContentLoaded',()=>load(false).catch(()=>{}));
})();

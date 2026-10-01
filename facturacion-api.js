(() => {
  const cfg=()=>window.ALE_ATENCIO_CONFIG||{};
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const adminToken=()=>localStorage.getItem('aleAdminToken')||sessionStorage.getItem('aleAdminToken')||'';
  let state={loaded:false,ambiente:'CERTIFICACION',proveedor_activo:null,mostrar_todos_documentos:false,proveedores:[]};
  let fclCredentialState={bootstrap_ready:null,prueba_ready:false,produccion_ready:false};
  let fclStatusCache={ts:0,data:null};
  const FCL_DEMO_CREDENTIALS={usuario:'desisws',rut:'11111111-1',clave:'123456xx'};
  let fclVisibleEnvironment='PRODUCCION';

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
  async function saveGeneralIva(value,token=adminToken()){
    const pct=Number(value);
    if(!Number.isFinite(pct)||pct<0||pct>100)throw makeError('IVA_GENERAL_INVALIDO');
    if(!window.AleAPI?.post)throw makeError('API_CONFIGURACION_NO_DISPONIBLE');
    await window.AleAPI.post('saveConfig',{iva_porcentaje:pct},token);
    const billing=$('#billingIva'),quick=$('#billingIvaQuick'),settings=$('#sIva'),status=$('#billingIvaStatus');
    if(billing)billing.value=String(pct);if(quick)quick.value=String(pct);if(settings)settings.value=String(pct);if(status)status.textContent=`${pct}%`;
    window.dispatchEvent(new CustomEvent('ale:billing-iva-changed',{detail:{iva_porcentaje:pct}}));
    return pct;
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
  function fclGatewayVersionCompatible(version){const m=String(version||'').match(/ALE-FACTURACION-CL-GATEWAY-R9\.18\.(\d+)/i);return !!m&&Number(m[1])>=185}
  function fclEnvIds(env){const prod=String(env).toUpperCase()==='PRODUCCION';return{usuario:prod?'#fclProduccionUsuario':'#fclPruebaUsuario',rut:prod?'#fclProduccionRut':'#fclPruebaRut',clave:prod?'#fclProduccionClave':'#fclPruebaClave',status:prod?'#fclProduccionStatus':'#fclPruebaStatus',result:prod?'#fclProduccionResult':'#fclPruebaResult'}}
  function setFclStatus(env,ready,label){const ids=fclEnvIds(env),el=$(ids.status);if(!el)return;el.textContent=label||(ready?'Guardadas':'Pendientes');el.classList.toggle('is-ready',!!ready);el.classList.toggle('is-warning',!ready);el.classList.remove('is-error')}
  function setFclResult(env,message,type=''){const el=$(fclEnvIds(env).result);if(!el)return;el.textContent=message||'';el.classList.toggle('is-ok',type==='ok');el.classList.toggle('is-error',type==='error')}
  function clearFclCredentialInputs(env){const ids=fclEnvIds(env);[ids.usuario,ids.clave].forEach(id=>{const el=$(id);if(el)el.value=''});const pass=$(ids.clave);if(pass)pass.type='password'}
  function showFclEnvironment(env='PRODUCCION',fillDemo=false){
    const selected=String(env||'PRODUCCION').toUpperCase()==='PRUEBA'?'PRUEBA':'PRODUCCION';
    fclVisibleEnvironment=selected;
    const prod=$('#fclProduccionCard'),demo=$('#fclPruebaCard'),toggle=$('#fclDemoToggle');
    if(prod)prod.classList.toggle('hidden',selected!=='PRODUCCION');
    if(demo)demo.classList.toggle('hidden',selected!=='PRUEBA');
    if(toggle){toggle.classList.toggle('is-demo',selected==='PRUEBA');toggle.setAttribute?.('aria-pressed',selected==='PRUEBA'?'true':'false');const span=toggle.querySelector?.('span');if(span)span.textContent=selected==='PRUEBA'?'Volver a Producción':'Usar credenciales DEMO';const icon=toggle.querySelector?.('i');if(icon)icon.className=`bi ${selected==='PRUEBA'?'bi-arrow-left':'bi-flask'}`}
    if(selected==='PRUEBA'&&fillDemo){
      const ids=fclEnvIds('PRUEBA');
      const u=$(ids.usuario),r=$(ids.rut),c=$(ids.clave);
      if(u)u.value=FCL_DEMO_CREDENTIALS.usuario;if(r)r.value=FCL_DEMO_CREDENTIALS.rut;if(c){c.value=FCL_DEMO_CREDENTIALS.clave;c.type='password'}
      setFclResult('PRUEBA','Credenciales DEMO cargadas. Pulsa “Conectar DEMO” para validar el acceso.','');
    }
  }
  async function loadFclCredentialStatus(force=false){
    const section=$('#billingFacturacionClCredentials');if(!section)return fclCredentialState;
    if(!force&&fclStatusCache.data&&(Date.now()-fclStatusCache.ts)<45000){
      fclCredentialState=fclStatusCache.data;
      setFclStatus('PRUEBA',fclCredentialState.prueba_ready);setFclStatus('PRODUCCION',fclCredentialState.produccion_ready);
      const bootstrap=$('#fclSecretBootstrap');if(bootstrap)bootstrap.classList.toggle('hidden',fclCredentialState.bootstrap_ready!==false);
      section.querySelectorAll('[data-fcl-credentials-save],[data-fcl-credentials-delete]').forEach(b=>b.disabled=fclCredentialState.bootstrap_ready===false);
      return fclCredentialState;
    }
    let secure=null,gateway=null;
    try{secure=await window.AleAPI.post('facturacionclcredentialsstatus',{},adminToken())}catch(err){secure={ok:false,bootstrap_ready:false,error:String(err?.message||err)}}
    try{gateway=await fclGateway('config',{},adminToken(),20000)}catch(err){gateway={ok:false,error:String(err?.message||err)}}
    const prueba=Boolean(gateway?.credentials_ready_prueba??secure?.prueba_ready),produccion=Boolean(gateway?.credentials_ready_produccion??secure?.produccion_ready);
    fclCredentialState={bootstrap_ready:secure?.bootstrap_ready===true,prueba_ready:prueba,produccion_ready:produccion};
    fclStatusCache={ts:Date.now(),data:{...fclCredentialState}};
    setFclStatus('PRUEBA',prueba);setFclStatus('PRODUCCION',produccion);
    for(const [env,key] of [['PRUEBA','rut_prueba'],['PRODUCCION','rut_produccion']]){const input=$(fclEnvIds(env).rut);if(input&&document.activeElement!==input&&(!input.value||(env==='PRUEBA'&&input.value==='1-9'))&&gateway?.[key])input.value=gateway[key]}
    const bootstrap=$('#fclSecretBootstrap');if(bootstrap)bootstrap.classList.toggle('hidden',secure?.bootstrap_ready!==false);
    section.querySelectorAll('[data-fcl-credentials-save],[data-fcl-credentials-delete]').forEach(b=>b.disabled=secure?.bootstrap_ready===false);
    return fclCredentialState;
  }
  async function saveFclCredentials(env,button){
    const ids=fclEnvIds(env),usuario=$(ids.usuario)?.value?.trim()||'',rut=$(ids.rut)?.value?.trim()||'',clave=$(ids.clave)?.value||'';
    if(!usuario||!rut||!clave.trim())throw makeError('Completa Usuario, RUT y Clave antes de guardar');
    button.disabled=true;setFclResult(env,'Guardando credenciales y conectando…');
    try{
      await window.AleAPI.post('facturacionclcredentialsset',{environment:env,usuario,rut,clave},adminToken(),{timeoutMs:30000});
      clearFclCredentialInputs(env);setFclResult(env,'Credenciales guardadas. Validando conexión…');
      await loadFclCredentialStatus(true);
      const out=await testFclLogin(env,button);
      if(out.integration_ready!==true)throw makeError('Login válido. Falta completar el esquema base de integración Facturacion.cl (SQL 40) antes de emitir');
      await saveEnvironment(env==='PRODUCCION'?'PRODUCCION':'CERTIFICACION');
      if(activeCodeCached()!=='FACTURACION_CL')await activate('FACTURACION_CL');
      setFclStatus(env,true,'Conectado');setFclResult(env,`✓ Facturacion.cl conectado y activo en ${env==='PRODUCCION'?'PRODUCCIÓN':'PRUEBA'}. Ya puedes generar documentos.`,'ok');
      return out;
    }finally{button.disabled=false}
  }
  async function testFclLogin(env,button){
    button.disabled=true;setFclResult(env,'Autenticando contra https://rest.facturacion.cl/login …');
    try{
      const out=await fclGateway('test_login',{environment:env},adminToken(),60000);
      setFclStatus(env,true,'Login OK');setFclResult(env,`✓ Login REST correcto${out?.remote_version?` · servicio ${out.remote_version}`:''}${out?.integration_ready!==true?' · Falta instalar el SQL 40 para habilitar la emisión.':'. Integración lista para emitir.'}`,'ok');
      return out;
    }catch(err){setFclStatus(env,false,'Error');const code=String(err?.message||err);setFclResult(env,`✕ ${code}`,'error');throw err}finally{button.disabled=false}
  }
  async function deleteFclCredentials(env,button){
    if(!confirm(`¿Eliminar las credenciales de ${env==='PRODUCCION'?'PRODUCCIÓN':'PRUEBA'} de Facturacion.cl del servidor?`))return;
    button.disabled=true;try{await window.AleAPI.post('facturacionclcredentialsdelete',{environment:env},adminToken(),{timeoutMs:30000});clearFclCredentialInputs(env);setFclResult(env,'Credenciales eliminadas del servidor.','');await loadFclCredentialStatus(true)}finally{button.disabled=false}
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
      const ready=await fclGateway('config',{},token,20000);
      if(!fclGatewayVersionCompatible(ready.version))throw makeError(`Gateway Facturacion.cl incompatible o no disponible (${ready.version||'sin versión'}). Actualiza facturacion-cl-gateway.`);
      if(ready.integration_ready!==true)throw makeError('Falta el esquema base de integración Facturacion.cl (SQL 40). Instálalo antes de emitir.');
      const payload={pedido_id:data.pedido_id,tipo_dte:Number(data.tipo_dte||0),incluir_cedible:Boolean(data.incluir_cedible)};
      for(const key of ['rut_receptor','razon_social_receptor','giro_receptor','direccion_receptor','comuna_receptor','ciudad_receptor','referencia','monto_nota','tipo_despacho','ind_traslado','transporte'])if(data[key]!==undefined)payload[key]=data[key];
      const out=await rawCall(providerUrl(code),'emit_order',payload,token,120000);return{...out,provider_code:code,provider_name:label(code)};
    }
    throw makeError('PROVEEDOR_FACTURACION_NO_ACTIVO');
  }
  async function pdfForProvider(code,tipo,folio,token=adminToken(),options={}){
    const c=String(code||'').toUpperCase();
    if(c!=='FACTURACION_CL')throw makeError('PDF_EXTERNO_NO_APLICA');
    return rawCall(providerUrl(c),'pdf',{tipo_dte:Number(tipo),folio:Number(folio),cedible:false,...options},token,90000);
  }
  async function pdf(tipo,folio,token=adminToken()){
    if(!state.loaded)await load(false,token);return pdfForProvider(activeCodeCached(),tipo,folio,token);
  }
  async function linkForProvider(tipo,folio,options={},token=adminToken()){return fclGateway('link',{tipo_dte:Number(tipo),folio:Number(folio),...options},token,60000)}
  async function ticketForProvider(tipo,folio,options={},token=adminToken()){return fclGateway('ticket',{tipo_dte:Number(tipo),folio:Number(folio),...options},token,60000)}
  async function documentDetail(id,token=adminToken()){return fclGateway('detail',{document_id:id},token,20000)}
  async function reconcileDocument(id,folio,token=adminToken()){return fclGateway('reconcile',{document_id:id,folio:Number(folio),confirmado:true},token,90000)}
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
  function openProvidersModal(){const modal=$('#billingProvidersModal');if(!modal)return;const billingIva=$('#billingIva'),quickIva=$('#billingIvaQuick'),settingsIva=$('#sIva');const current=settingsIva?.value||quickIva?.value||'19';if(billingIva)billingIva.value=current;if(quickIva&&!quickIva.value)quickIva.value=current;modal.classList.remove('hidden');document.body.classList.add('sii-modal-open');}
  function closeProvidersModal(){const modal=$('#billingProvidersModal');if(modal)modal.classList.add('hidden');if(!document.querySelector('.sii-modal:not(.hidden)'))document.body.classList.remove('sii-modal-open');}
  function openProviderEditor(code,credentialsOnly=false){
    const p=state.proveedores.find(x=>String(x.codigo)===String(code));if(!p)return;
    const modal=$('#billingProviderEditor');if(!modal)return;
    $('#billingProviderCode').value=p.codigo||'';$('#billingProviderName').value=p.nombre||'';$('#billingProviderType').value=p.tipo||'';$('#billingProviderEnabled').value=p.habilitado?'SI':'NO';$('#billingProviderNotes').value=p.observaciones||'';
    const quick=credentialsOnly&&String(p.codigo).toUpperCase()==='FACTURACION_CL';
    modal.classList.toggle('fcl-quick-connect',quick);
    const fields=$('#billingProviderGeneralFields');if(fields)fields.classList.toggle('hidden',quick);
    const save=$('#billingProviderSave');if(save)save.classList.toggle('hidden',quick);
    const title=$('#billingProviderEditorTitle');if(title)title.textContent=quick?'Conectar Facturacion.cl':'Editar proveedor';
    const fcl=$('#billingFacturacionClCredentials');if(fcl)fcl.classList.toggle('hidden',String(p.codigo).toUpperCase()!=='FACTURACION_CL');
    clearFclCredentialInputs('PRUEBA');clearFclCredentialInputs('PRODUCCION');showFclEnvironment('PRODUCCION');
    modal.classList.remove('hidden');document.body.classList.add('sii-modal-open');
    if(String(p.codigo).toUpperCase()==='FACTURACION_CL')setTimeout(()=>loadFclCredentialStatus(false).catch(()=>{}),0);
  }
  function closeProviderEditor(){clearFclCredentialInputs('PRUEBA');clearFclCredentialInputs('PRODUCCION');showFclEnvironment('PRODUCCION');const modal=$('#billingProviderEditor');if(modal){modal.classList.add('hidden');modal.classList.remove('fcl-quick-connect')}if(!document.querySelector('.sii-modal:not(.hidden)'))document.body.classList.remove('sii-modal-open')}
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
    const connect=e.target.closest?.('#billingFacturacionClConnect');if(connect){connect.disabled=true;try{if(!state.loaded)await load(false);if(!state.proveedores.some(p=>p.codigo==='FACTURACION_CL'))await load(true);if(!state.proveedores.some(p=>p.codigo==='FACTURACION_CL'))throw makeError('Facturacion.cl todavía no está instalado como proveedor');openProviderEditor('FACTURACION_CL',true)}catch(err){notify(`✕ ${err.message||err}`)}finally{connect.disabled=false}return}
    const close=e.target.closest?.('[data-billing-provider-close]');if(close){closeProviderEditor();return}
    const eye=e.target.closest?.('[data-fcl-secret-eye]');if(eye){const input=$('#'+eye.dataset.fclSecretEye);if(input){input.type=input.type==='password'?'text':'password';const i=eye.querySelector('i');if(i)i.className=`bi ${input.type==='password'?'bi-eye':'bi-eye-slash'}`}return}
    const demoToggle=e.target.closest?.('#fclDemoToggle');if(demoToggle){showFclEnvironment(fclVisibleEnvironment==='PRODUCCION'?'PRUEBA':'PRODUCCION',fclVisibleEnvironment==='PRODUCCION');return}
    const fclSave=e.target.closest?.('[data-fcl-credentials-save]');if(fclSave){try{await saveFclCredentials(fclSave.dataset.fclCredentialsSave,fclSave);notify('✓ Facturacion.cl conectado y listo para emitir')}catch(err){setFclResult(fclSave.dataset.fclCredentialsSave,`✕ ${err.message||err}`,'error');notify(`✕ ${err.message||err}`)}return}
    const fclTest=e.target.closest?.('[data-fcl-login-test]');if(fclTest){try{await testFclLogin(fclTest.dataset.fclLoginTest,fclTest);notify(`✓ Login Facturacion.cl ${fclTest.dataset.fclLoginTest} correcto`)}catch(err){notify(`✕ Facturacion.cl: ${err.message||err}`)}return}
    const fclDelete=e.target.closest?.('[data-fcl-credentials-delete]');if(fclDelete){try{await deleteFclCredentials(fclDelete.dataset.fclCredentialsDelete,fclDelete);notify('✓ Credenciales eliminadas')}catch(err){notify(`✕ ${err.message||err}`)}return}
    const edit=e.target.closest?.('[data-billing-provider-edit]');if(edit){openProviderEditor(edit.dataset.billingProviderEdit);return}
    const save=e.target.closest?.('#billingProviderSave');if(save){save.disabled=true;try{await persistProviderEditor();notify('✓ Proveedor guardado')}catch(err){notify(`✕ ${err.message||err}`)}finally{save.disabled=false}return}
    const test=e.target.closest?.('[data-billing-provider-test]');if(test){test.disabled=true;try{const out=await testConnection(test.dataset.billingProviderTest);notify(`✓ Conexión correcta · ${label(test.dataset.billingProviderTest)}${out?.version?` · ${out.version}`:''}`)}catch(err){notify(`✕ ${label(test.dataset.billingProviderTest)}: ${err.message||err}`)}finally{test.disabled=false}return}
    if(e.target.closest?.('#billingProvidersRefresh')){load(true).catch(err=>notify(`✕ ${err.message||err}`));return}
    if(e.target.closest?.('#billingIvaQuickSave')){const b=e.target.closest('#billingIvaQuickSave');b.disabled=true;try{const pct=await saveGeneralIva($('#billingIvaQuick')?.value||$('#billingIva')?.value||$('#sIva')?.value||19);notify(`✓ IVA general actualizado a ${pct}%`)}catch(err){notify(`✕ ${err.message||err}`)}finally{b.disabled=false}return}
    if(e.target.closest?.('#billingEnvironmentSave')){const b=e.target.closest('#billingEnvironmentSave');b.disabled=true;try{const pct=await saveGeneralIva($('#billingIva')?.value||$('#billingIvaQuick')?.value||$('#sIva')?.value||19);await saveEnvironment($('#billingEnvironment')?.value);notify(`✓ Facturación guardada · IVA ${pct}%`)}catch(err){notify(`✕ ${err.message||err}`)}finally{b.disabled=false}return}
    const nav=e.target.closest?.('[data-view="billing-sii"]');if(nav)setTimeout(()=>load(true).catch(err=>notify(`✕ ${err.message||err}`)),10);
  });
  window.FacturacionAPI={load,manager,activate,saveEnvironment,saveDocumentsView,saveGeneralIva,saveProvider,testConnection,loadFclCredentialStatus,saveFclCredentials,testFclLogin,orderPreview,issue,pdf,pdfForProvider,linkForProvider,ticketForProvider,documentDetail,reconcileDocument,documents,documentsForProvider,activeCodeCached,activeProvider,label,providerUrl,openProvidersModal,closeProvidersModal,openProviderEditor,closeProviderEditor,get state(){return state}};
  document.addEventListener('DOMContentLoaded',()=>load(false).catch(()=>{}));
})();

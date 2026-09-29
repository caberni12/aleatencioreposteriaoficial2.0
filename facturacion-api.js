(() => {
  const cfg=()=>window.ALE_ATENCIO_CONFIG||{};
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const adminToken=()=>localStorage.getItem('aleAdminToken')||sessionStorage.getItem('aleAdminToken')||'';
  let state={loaded:false,ambiente:'CERTIFICACION',proveedor_activo:null,mostrar_todos_documentos:false,proveedores:[]};

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
    modal.classList.remove('hidden');document.body.classList.add('sii-modal-open');
  }
  function closeProviderEditor(){const modal=$('#billingProviderEditor');if(modal)modal.classList.add('hidden');if(!document.querySelector('.sii-modal:not(.hidden)'))document.body.classList.remove('sii-modal-open')}
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
    const edit=e.target.closest?.('[data-billing-provider-edit]');if(edit){openProviderEditor(edit.dataset.billingProviderEdit);return}
    const save=e.target.closest?.('#billingProviderSave');if(save){save.disabled=true;try{await persistProviderEditor();notify('✓ Proveedor guardado')}catch(err){notify(`✕ ${err.message||err}`)}finally{save.disabled=false}return}
    const test=e.target.closest?.('[data-billing-provider-test]');if(test){test.disabled=true;try{const out=await testConnection(test.dataset.billingProviderTest);notify(`✓ Conexión correcta · ${label(test.dataset.billingProviderTest)}${out?.version?` · ${out.version}`:''}`)}catch(err){notify(`✕ ${label(test.dataset.billingProviderTest)}: ${err.message||err}`)}finally{test.disabled=false}return}
    if(e.target.closest?.('#billingProvidersRefresh')){load(true).catch(err=>notify(`✕ ${err.message||err}`));return}
    if(e.target.closest?.('#billingEnvironmentSave')){const b=e.target.closest('#billingEnvironmentSave');b.disabled=true;try{await saveEnvironment($('#billingEnvironment')?.value);notify('✓ Ambiente de facturación guardado')}catch(err){notify(`✕ ${err.message||err}`)}finally{b.disabled=false}return}
    const nav=e.target.closest?.('[data-view="billing-sii"]');if(nav)setTimeout(()=>load(true).catch(err=>notify(`✕ ${err.message||err}`)),10);
  });
  window.FacturacionAPI={load,manager,activate,saveEnvironment,saveDocumentsView,saveProvider,testConnection,orderPreview,issue,pdf,pdfForProvider,documents,documentsForProvider,activeCodeCached,activeProvider,label,providerUrl,openProvidersModal,closeProvidersModal,openProviderEditor,closeProviderEditor,get state(){return state}};
  document.addEventListener('DOMContentLoaded',()=>load(false).catch(()=>{}));
})();

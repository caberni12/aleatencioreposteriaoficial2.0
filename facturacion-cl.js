(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const money = (n) => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n||0));
  const esc = (s) => String(s??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#039;"}[m]));
  const token = () => localStorage.getItem('aleAdminToken') || sessionStorage.getItem('aleAdminToken') || '';
  const gatewayUrl = () => {
    const base = String(window.ALE_ATENCIO_CONFIG?.API_URL || '').trim();
    if (/\/functions\/v1\//.test(base)) return base.replace(/\/functions\/v1\/[^/?#]+.*$/,'/functions/v1/facturacion-cl-gateway');
    return '';
  };
  function toast(msg){
    if (typeof window.toast === 'function') return window.toast(msg);
    const el=$('#adminToast'); if(el){el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3200)}
    else console.log(msg);
  }
  async function call(action,data={},timeoutMs=30000){
    const url=gatewayUrl(); if(!url) throw new Error('FACTURACION_CL_GATEWAY_NO_CONFIGURADO');
    const t=token(); if(!t) throw new Error('SESION_REQUERIDA');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const r=await fetch(url,{method:'POST',mode:'cors',cache:'no-store',credentials:'omit',headers:{'Content-Type':'application/json','X-Ale-Session':t},body:JSON.stringify({action,data}),signal:controller.signal});
      const text=await r.text(); let payload={};try{payload=text?JSON.parse(text):{}}catch(_){throw new Error('RESPUESTA_GATEWAY_INVALIDA')}
      if(!r.ok||payload?.ok===false)throw new Error(payload?.error||`HTTP_${r.status}`);return payload;
    }catch(e){if(e?.name==='AbortError')throw new Error('FACTURACION_CL_TIMEOUT');throw e}finally{clearTimeout(timer)}
  }
  function setState(id,text,kind=''){
    const el=$(id);if(!el)return;el.textContent=text;el.classList.remove('is-ok','is-warn','is-error');if(kind)el.classList.add('is-'+kind);
  }
  function providerLabel(p){return p==='SII_PROPIO'?'SII propio':'Facturacion.cl'}
  function syncSiiStandby(provider){
    const standby=provider!=='SII_PROPIO';
    const launcher=$('#siiOwnEmitLauncher'); if(launcher){launcher.disabled=standby;launcher.classList.toggle('is-standby',standby);launcher.title=standby?'Facturacion.cl es el proveedor tributario activo':'Emisión propia habilitada'}
    const badge=$('#siiOwnProviderBadge'); if(badge){badge.textContent=standby?'STANDBY':'ACTIVO';badge.classList.toggle('active',!standby)}
  }
  async function loadConfig(){
    const out=await call('config_get',{},15000),c=out.config||{};
    if($('#fclProvider'))$('#fclProvider').value=c.proveedor_activo||'FACTURACION_CL';
    if($('#fclEnvironment'))$('#fclEnvironment').value=c.facturacion_cl_ambiente||'PRUEBA';
    setState('#fclProviderStatus',providerLabel(c.proveedor_activo||'FACTURACION_CL'),c.proveedor_activo==='FACTURACION_CL'?'ok':'warn');
    setState('#fclCredentialsStatus',out.credentials_ready?'Configuradas':'Pendientes',out.credentials_ready?'ok':'warn');
    setState('#fclSiiStatus',c.sii_propio_estado||'STANDBY',c.sii_propio_estado==='ACTIVO'?'ok':'warn');
    const url=$('#fclGatewayUrl');if(url)url.textContent=out.gateway_url||gatewayUrl()||'—';
    syncSiiStandby(c.proveedor_activo||'FACTURACION_CL');
    return out;
  }
  async function health(){
    setState('#fclServiceStatus','Verificando…');
    try{const out=await call('health',{},20000);setState('#fclServiceStatus',out.ok?'Conectado':'Con observación',out.ok?'ok':'warn');setState('#fclRemoteVersion',out.remote_version||'API disponible',out.ok?'ok':'warn');const b=$('#fclEnvironmentBadge');if(b)b.textContent=out.environment||'—';return out}catch(e){setState('#fclServiceStatus','Sin conexión','error');setState('#fclRemoteVersion',String(e.message||e),'error');throw e}
  }
  async function refreshDocs(){
    const tbody=$('#fclDocumentsTable');if(!tbody)return;tbody.innerHTML='<tr><td colspan="9">Cargando…</td></tr>';
    try{const out=await call('documents',{limit:120},20000),rows=out.documents||[];if(!rows.length){tbody.innerHTML='<tr><td colspan="9">Aún no hay documentos emitidos por Facturacion.cl.</td></tr>';return}
      tbody.innerHTML=rows.map(r=>`<tr><td>${esc(new Date(r.creado_en).toLocaleString('es-CL'))}</td><td>${esc(r.tipo_dte)}</td><td><strong>${esc(r.folio??'—')}</strong></td><td>${esc(r.pedido_id||'—')}</td><td><div><strong>${esc(r.receptor_razon||'—')}</strong><small>${esc(r.receptor_rut||'')}</small></div></td><td>${money(r.total)}</td><td><span class="fcl-pill ${String(r.estado).toLowerCase()==='emitido'?'ok':'err'}">${esc(r.estado)}</span></td><td>${esc(r.ambiente)}</td><td>${r.folio?`<button class="btn btn-light btn-compact" data-fcl-pdf data-tipo="${esc(r.tipo_dte)}" data-folio="${esc(r.folio)}">PDF</button>`:''}</td></tr>`).join('');
    }catch(e){tbody.innerHTML=`<tr><td colspan="9">${esc(e.message||e)}</td></tr>`}
  }
  function noteFields(){const t=Number($('#fclTipoDte')?.value||0),wrap=$('#fclReferenceFields');if(wrap)wrap.classList.toggle('hidden',![56,61].includes(t))}
  async function emit(){
    const btn=$('#fclEmit');if(btn)btn.disabled=true;
    try{
      const pedido=$('#fclPedido')?.value.trim();if(!pedido)throw new Error('Ingresa ID o número de pedido');
      const tipo=Number($('#fclTipoDte')?.value||0),folio=Number($('#fclFolio')?.value||0)||0;
      const data={pedido_id:pedido,tipo_dte:tipo,folio};
      if([56,61].includes(tipo)){
        const rf=Number($('#fclRefFolio')?.value||0),rt=Number($('#fclRefTipo')?.value||0);if(!rf||!rt)throw new Error('La nota requiere tipo y folio de referencia');
        data.referencia={tipo_dte:rt,folio:rf,fecha:$('#fclRefFecha')?.value||'',codigo:Number($('#fclRefCodigo')?.value||1),razon:$('#fclRefRazon')?.value||'Referencia documento'};
      }
      const out=await call('emit_order',data,70000),d=out.document||{};toast(`✓ ${tipo} emitido · Folio ${d.folio||out.provider?.folio||'asignado'}`);await refreshDocs();
    }catch(e){toast(`Facturacion.cl: ${e.message||e}`)}finally{if(btn)btn.disabled=false}
  }
  async function saveConfig(){
    const btn=$('#fclSaveConfig');if(btn)btn.disabled=true;
    try{const provider=$('#fclProvider')?.value||'FACTURACION_CL',ambiente=$('#fclEnvironment')?.value||'PRUEBA';await call('config_save',{proveedor_activo:provider,ambiente,incluir_link:true},15000);toast('✓ Configuración de facturación guardada');await loadConfig();await health().catch(()=>{})}catch(e){toast(`No fue posible guardar: ${e.message||e}`)}finally{if(btn)btn.disabled=false}
  }
  async function openPdf(tipo,folio){
    try{toast('Obteniendo PDF desde Facturacion.cl…');const out=await call('pdf',{tipo_dte:Number(tipo),folio:Number(folio),cedible:false},45000);if(!out.pdf_base64)throw new Error('PDF_BASE64_NO_DISPONIBLE_EN_RESPUESTA');const bin=atob(out.pdf_base64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){toast(`PDF: ${e.message||e}`)}
  }
  let loaded=false;
  async function loadAll(force=false){if(loaded&&!force)return;loaded=true;await loadConfig().catch(e=>toast(`Facturacion.cl: ${e.message||e}`));await Promise.allSettled([health(),refreshDocs()])}
  document.addEventListener('click',(e)=>{
    const nav=e.target.closest?.('[data-view="billing-facturacion-cl"]');if(nav)setTimeout(()=>loadAll(true),20);
    if(e.target.closest?.('#fclRefresh'))loadAll(true);
    if(e.target.closest?.('#fclSaveConfig'))saveConfig();
    if(e.target.closest?.('#fclEmit'))emit();
    const pdf=e.target.closest?.('[data-fcl-pdf]');if(pdf)openPdf(pdf.dataset.tipo,pdf.dataset.folio);
  });
  document.addEventListener('change',(e)=>{if(e.target?.id==='fclTipoDte')noteFields()});
  window.AleFacturacionCl={call,load:()=>loadAll(true),emitOrder:async(pedidoId,tipoDte=33)=>call('emit_order',{pedido_id:pedidoId,tipo_dte:tipoDte},70000)};
  document.addEventListener('DOMContentLoaded',()=>{noteFields();loadConfig().catch(()=>{})});
})();

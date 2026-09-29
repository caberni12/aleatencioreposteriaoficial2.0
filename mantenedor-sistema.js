(() => {
  'use strict';
  const VERSION='R9.18.174';
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const cfg=()=>window.ALE_ATENCIO_CONFIG||{};
  const token=()=>localStorage.getItem('aleAdminToken')||sessionStorage.getItem('aleAdminToken')||'';
  const endpoint=()=>String(cfg().SYSTEM_MAINTENANCE_API_URL||'').trim().replace(/\/+$/,'');
  const modal=()=>$('#systemMaintenanceModal');
  let state={preview:null,backups:[],audit:[],loading:false};

  function notify(msg){
    if(typeof window.toast==='function')return window.toast(msg);
    const el=$('#adminToast');if(!el)return;
    el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3400);
  }
  function fmtInt(n){return new Intl.NumberFormat('es-CL').format(Number(n||0))}
  function fmtDate(v){if(!v)return'—';try{return new Intl.DateTimeFormat('es-CL',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch(_){return String(v)}}
  function apiError(code){
    const map={
      SOLO_ADMINISTRADOR:'Solo un usuario ADMIN puede utilizar el Mantenedor del Sistema.',
      CLAVE_REQUERIDA:'Ingresa tu contraseña actual.',CLAVE_INVALIDA:'La contraseña ingresada no es válida.',
      RESPALDO_REQUERIDO:'Selecciona un respaldo antes de continuar.',RESPALDO_VALIDO_REQUERIDO:'El respaldo seleccionado no está disponible.',
      RESPALDO_PREVIO_VENCIDO:'El respaldo es demasiado antiguo. Genera uno nuevo.',
      CONFIRMACION_INVALIDA:'Escribe exactamente REINICIAR SISTEMA.',SESION_EXPIRADA:'La sesión venció. Ingresa nuevamente.',SESION_INVALIDA:'La sesión ya no es válida.'
    };
    return map[code]||code||'No fue posible completar la operación.';
  }
  async function call(action,data={},timeoutMs=120000){
    const url=endpoint();if(!/^https:\/\//i.test(url))throw new Error('MANTENEDOR_SISTEMA_NO_CONFIGURADO');
    const t=token();if(!t)throw new Error('SESION_REQUERIDA');
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const r=await fetch(url,{method:'POST',mode:'cors',cache:'no-store',credentials:'omit',headers:{'Content-Type':'application/json','X-Ale-Session':t},body:JSON.stringify({action,data,token:t}),signal:controller.signal});
      const text=await r.text();let payload={};try{payload=text?JSON.parse(text):{}}catch(_){payload={error:text||`HTTP_${r.status}`}}
      if(!r.ok||payload?.ok===false)throw new Error(payload?.error||`HTTP_${r.status}`);
      return payload;
    }catch(err){if(err?.name==='AbortError')throw new Error('TIEMPO_DE_ESPERA_AGOTADO');throw err}finally{clearTimeout(timer)}
  }

  const moduleDefs=[
    {name:'Usuarios y permisos',icon:'bi-people',kind:'protected',note:'Se conservan para poder iniciar sesión.',keys:['usuarios']},
    {name:'Productos',icon:'bi-box-seam',kind:'protected',note:'Se conserva catálogo, precios, imágenes, tamaños y recetas. Stock queda en 0.',keys:['productos','tamanos','recetas']},
    {name:'Clientes',icon:'bi-person-lines-fill',kind:'reset',note:'Se eliminan clientes de prueba no vinculados a usuarios; perfiles protegidos quedan con estadísticas en 0.',keys:['clientes_no_vinculados_a_usuario']},
    {name:'Solicitudes',icon:'bi-inbox',kind:'reset',note:'Se eliminan las solicitudes de prueba.',keys:['solicitudes']},
    {name:'Cotizaciones',icon:'bi-file-earmark-text',kind:'reset',note:'Se eliminan las cotizaciones de prueba.',keys:['cotizaciones']},
    {name:'Pedidos',icon:'bi-bag-check',kind:'reset',note:'Se eliminan pedidos, detalle, estados y enlaces de pago.',keys:['pedidos','pedido_items','pedido_estado_historial','pedido_enlaces_pago']},
    {name:'Mayorista',icon:'bi-shop',kind:'reset',note:'Se limpian movimientos, pagos, documentos y notificaciones; la configuración se conserva.',keys:['mayorista_credito_movimientos','mayorista_credito_pagos','mayorista_documentos','mayorista_notificaciones']},
    {name:'Facturación',icon:'bi-receipt',kind:'reset',note:'Se eliminan DTE de prueba y eventos. Proveedores, APIs, certificado y CAF se conservan.',keys:['facturacion_cl_documentos','facturacion_cl_eventos','sii_documentos','sii_envios']},
    {name:'Inventario',icon:'bi-boxes',kind:'reset',note:'Se eliminan movimientos, reservas y existencias. Stock final 0.',keys:['inventario_operaciones','inventario_movimientos','inventario_existencias','inventario_reservas']},
    {name:'Bodegas',icon:'bi-building',kind:'protected',note:'Se conservan bodegas y configuración de canales.',keys:['bodegas']},
    {name:'Libro Mayor',icon:'bi-journal-text',kind:'reset',note:'Queda sin movimientos porque se limpia la historia de inventario.',keys:['inventario_movimientos']},
    {name:'Reportes y Dashboard',icon:'bi-graph-up-arrow',kind:'reset',note:'Los indicadores vuelven a 0 al eliminar la operación y analítica de prueba.',keys:['web_analytics_events']},
    {name:'Pasarela de pago',icon:'bi-credit-card',kind:'reset',note:'Se eliminan transacciones de prueba; configuración y secretos se conservan.',keys:['pagos_transbank']},
    {name:'Proveedores y Compras',icon:'bi-truck',kind:'reset',note:'Los proveedores se conservan; se eliminan compras e ingresos de prueba.',keys:['compras_proveedor','compra_items']},
    {name:'Insumos y Costos',icon:'bi-basket',kind:'protected',note:'Se conserva catálogo y costo vigente; stock queda en 0 e historial de prueba se limpia.',keys:['insumos']},
    {name:'Galería / Web / Catálogo',icon:'bi-images',kind:'protected',note:'Se conservan imágenes, contenido público, categorías, banners y galería.',keys:[]},
    {name:'Configuración',icon:'bi-sliders',kind:'protected',note:'Se conservan parámetros del negocio, URLs, formatos y políticas.',keys:[]},
    {name:'Auditoría',icon:'bi-shield-check',kind:'reset',note:'Se limpia auditoría de pruebas y se conserva el registro protegido del reinicio.',keys:[]}
  ];

  function moduleCount(def){
    const source=def.kind==='protected'?(state.preview?.protegido||{}):(state.preview?.operacional||{});
    return def.keys.reduce((a,k)=>a+Number(source[k]||0),0);
  }
  function renderModules(){
    const host=$('#systemMaintenanceModules');if(!host)return;
    host.innerHTML=moduleDefs.map(m=>`<article class="system-module-card ${m.kind}"><i class="bi ${m.icon}"></i><div><strong>${esc(m.name)}</strong><span class="system-module-state">${m.kind==='protected'?'Se conserva':'Se reinicia'}</span><small>${esc(m.note)}${m.keys.length?` · ${fmtInt(moduleCount(m))} registros`:''}</small></div></article>`).join('');
  }
  function statePill(v){const s=String(v||'').toUpperCase();const cls=/COMPLETO|OK/.test(s)?'ok':/ERROR|DENEGADO/.test(s)?'error':'pending';return`<span class="system-maintenance-state-pill ${cls}">${esc(s||'—')}</span>`}
  function renderBackups(){
    const rows=state.backups||[];
    const tbody=$('#systemMaintenanceBackupsTable');
    if(tbody)tbody.innerHTML=rows.length?rows.map(b=>`<tr><td><strong>${esc(b.folio||'—')}</strong><br><small>${esc(String(b.checksum||'').slice(0,12))}</small></td><td>${esc(fmtDate(b.creado_en))}</td><td>${fmtInt(b.registros_total)}</td><td>${statePill(b.estado)}</td><td><button class="btn btn-light btn-compact" type="button" data-system-backup-download="${esc(b.id)}"><i class="bi bi-download"></i> Descargar respaldo</button></td></tr>`).join(''):'<tr><td colspan="5">Sin respaldos.</td></tr>';
    const sel=$('#systemResetBackup');if(sel){const current=sel.value;sel.innerHTML='<option value="">Selecciona un respaldo</option>'+rows.filter(x=>String(x.estado).toUpperCase()==='COMPLETO').map(b=>`<option value="${esc(b.id)}">${esc(b.folio)} · ${esc(fmtDate(b.creado_en))}</option>`).join('');if(rows.some(x=>String(x.id)===current))sel.value=current}
    const last=rows[0];$('#systemMaintenanceLastBackup')&&($('#systemMaintenanceLastBackup').textContent=last?.folio||'—');$('#systemMaintenanceLastBackupDate')&&($('#systemMaintenanceLastBackupDate').textContent=last?fmtDate(last.creado_en):'Sin respaldo');
  }
  function renderAudit(){
    const rows=state.audit||[];const tbody=$('#systemMaintenanceAuditTable');
    if(tbody)tbody.innerHTML=rows.length?rows.map(a=>`<tr><td>${esc(fmtDate(a.creado_en))}</td><td>${esc(a.actor_usuario||'—')}</td><td>${esc(a.evento||'—')}</td><td>${statePill(a.estado)}</td><td>${esc(a.motivo||'—')}</td></tr>`).join(''):'<tr><td colspan="5">Sin eventos.</td></tr>';
    const last=rows[0];$('#systemMaintenanceLastEvent')&&($('#systemMaintenanceLastEvent').textContent=last?.evento||'—');$('#systemMaintenanceLastEventDate')&&($('#systemMaintenanceLastEventDate').textContent=last?fmtDate(last.creado_en):'Sin registros');
  }
  function render(){
    $('#systemMaintenanceOperationalCount')&&($('#systemMaintenanceOperationalCount').textContent=fmtInt(state.preview?.registros_operacionales||0));
    renderModules();renderBackups();renderAudit();validateReset();
  }
  async function refresh(showMessage=false){
    if(state.loading)return;state.loading=true;
    try{const out=await call('preview',{},45000);state.preview=out;state.backups=Array.isArray(out.backups)?out.backups:[];state.audit=Array.isArray(out.audit)?out.audit:[];render();if(showMessage)notify('✓ Mantenedor actualizado')}
    finally{state.loading=false}
  }
  function open(){const m=modal();if(!m)return;m.classList.remove('hidden');document.body.classList.add('sii-modal-open');showPane('overview');refresh(false).catch(err=>notify('✕ '+apiError(err.message)))}
  function close(){modal()?.classList.add('hidden');if(!document.querySelector('.sii-modal:not(.hidden)'))document.body.classList.remove('sii-modal-open')}
  function showPane(name){$$('[data-system-maintenance-tab]').forEach(x=>x.classList.toggle('active',x.dataset.systemMaintenanceTab===name));$$('[data-system-maintenance-pane]').forEach(x=>x.classList.toggle('active',x.dataset.systemMaintenancePane===name))}
  function validateReset(){
    const ok=!!$('#systemResetConsent')?.checked&&String($('#systemResetConfirmation')?.value||'').trim().toUpperCase()==='REINICIAR SISTEMA'&&!!$('#systemResetBackup')?.value&&!!String($('#systemResetPassword')?.value||'')&&!!String($('#systemResetReason')?.value||'').trim();
    const b=$('#systemResetExecute');if(b)b.disabled=!ok;
  }
  async function createBackup(btn){
    const password=String($('#systemBackupPassword')?.value||''),motivo=String($('#systemBackupReason')?.value||'').trim();if(!password)throw new Error('CLAVE_REQUERIDA');
    btn.disabled=true;try{const out=await call('backup',{password,motivo},180000);if($('#systemBackupPassword'))$('#systemBackupPassword').value='';notify(`✓ Respaldo generado: ${out.folio||''}`);await refresh(false);showPane('backup')}finally{btn.disabled=false}
  }
  async function downloadBackup(id,btn){
    btn.disabled=true;try{const out=await call('backup_export',{respaldo_id:id},180000);const folio=out?.respaldo?.folio||'RESPALDO-ALE';const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${folio}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notify('✓ Respaldo descargado')}finally{btn.disabled=false}
  }
  async function executeReset(btn){
    validateReset();if(btn.disabled)return;
    const data={respaldo_id:$('#systemResetBackup')?.value,password:String($('#systemResetPassword')?.value||''),motivo:String($('#systemResetReason')?.value||'').trim(),confirmacion:String($('#systemResetConfirmation')?.value||'').trim()};
    btn.disabled=true;btn.dataset.originalHtml=btn.innerHTML;btn.innerHTML='<i class="bi bi-arrow-repeat"></i> Reiniciando operación…';
    try{
      const out=await call('reset',data,300000);notify(`✓ Reinicio completado · ${fmtInt(out.registros_eliminados)} registros de prueba limpiados`);
      localStorage.removeItem('aleAdminToken');sessionStorage.removeItem('aleAdminToken');
      setTimeout(()=>location.reload(),1800);
    }catch(err){btn.disabled=false;btn.innerHTML=btn.dataset.originalHtml||'Reiniciar operación';throw err}
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#openSystemMaintenance')){open();return}
    if(e.target.closest('[data-system-maintenance-close]')){close();return}
    const tab=e.target.closest('[data-system-maintenance-tab]');if(tab){showPane(tab.dataset.systemMaintenanceTab);return}
    if(e.target.closest('#systemMaintenanceRefresh')){refresh(true).catch(err=>notify('✕ '+apiError(err.message)));return}
    const create=e.target.closest('#systemMaintenanceCreateBackup');if(create){createBackup(create).catch(err=>notify('✕ '+apiError(err.message)));return}
    const dl=e.target.closest('[data-system-backup-download]');if(dl){downloadBackup(dl.dataset.systemBackupDownload,dl).catch(err=>notify('✕ '+apiError(err.message)));return}
    const reset=e.target.closest('#systemResetExecute');if(reset){executeReset(reset).catch(err=>notify('✕ '+apiError(err.message)));return}
  });
  document.addEventListener('input',e=>{if(e.target.matches('#systemResetConfirmation,#systemResetPassword,#systemResetReason'))validateReset()});
  document.addEventListener('change',e=>{if(e.target.matches('#systemResetConsent,#systemResetBackup'))validateReset()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal()?.classList.contains('hidden'))close()});

  window.AleSystemMaintenance={version:VERSION,open,refresh};
})();

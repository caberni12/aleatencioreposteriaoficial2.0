(() => {
  'use strict';
  const VERSION='R9.18.181';
  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const cfg=()=>window.ALE_ATENCIO_CONFIG||{};
  const token=()=>localStorage.getItem('aleAdminToken')||sessionStorage.getItem('aleAdminToken')||'';
  const endpoint=()=>String(cfg().SYSTEM_MAINTENANCE_API_URL||'https://btvliyzripnhjexdgoef.supabase.co/functions/v1/mantenedor-sistema').trim().replace(/\/+$/,'');
  const modal=()=>$('#systemMaintenanceModal');
  let state={preview:null,backups:[],audit:[],loading:false};

  function notify(msg){
    if(typeof window.toast==='function')return window.toast(msg);
    const el=$('#adminToast');if(!el)return;
    el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3400);
  }
  function statusEl(kind){return kind==='reset'?$('#systemResetStatus'):$('#systemBackupStatus')}
  function setStatus(kind,type,message){
    const el=statusEl(kind);if(!el)return;
    el.className=`system-operation-status ${type||'info'}`;
    el.innerHTML=`<i class="bi ${type==='success'?'bi-check-circle-fill':type==='error'?'bi-x-octagon-fill':type==='warning'?'bi-exclamation-triangle-fill':'bi-arrow-repeat'}"></i><span>${esc(message||'')}</span>`;
  }
  function clearStatus(kind){const el=statusEl(kind);if(!el)return;el.className='system-operation-status hidden';el.innerHTML=''}
  function setButtonLoading(btn,loading,label){
    if(!btn)return;
    if(loading){
      if(!btn.dataset.originalLabel)btn.dataset.originalLabel=btn.querySelector('.system-btn-label')?.textContent||btn.textContent.trim();
      btn.classList.add('is-loading');btn.setAttribute('aria-busy','true');btn.disabled=true;
      const lbl=btn.querySelector('.system-btn-label');if(lbl&&label)lbl.textContent=label;
    }else{
      btn.classList.remove('is-loading');btn.removeAttribute('aria-busy');btn.disabled=false;
      const lbl=btn.querySelector('.system-btn-label');if(lbl&&btn.dataset.originalLabel)lbl.textContent=btn.dataset.originalLabel;
    }
  }
  function focusField(sel){const el=$(sel);if(el){el.focus({preventScroll:true});el.scrollIntoView({behavior:'smooth',block:'center'})}}
  function fmtInt(n){return new Intl.NumberFormat('es-CL').format(Number(n||0))}
  function fmtDate(v){if(!v)return'—';try{return new Intl.DateTimeFormat('es-CL',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch(_){return String(v)}}
  function apiError(code){
    const raw=String(code||'').trim();
    const base=(raw.split(':')[0]||raw).trim();
    const extra=raw.includes(':')?raw.slice(raw.indexOf(':')+1).trim():'';
    const map={
      SOLO_ADMINISTRADOR:'Solo un usuario ADMIN puede utilizar el Mantenedor del Sistema.',
      CLAVE_REQUERIDA:'Ingresa tu contraseña actual.',CLAVE_INVALIDA:'La contraseña ingresada no es válida.',
      RESPALDO_REQUERIDO:'Selecciona un respaldo antes de continuar.',RESPALDO_VALIDO_REQUERIDO:'El respaldo seleccionado no está disponible.',
      RESPALDO_PREVIO_VENCIDO:'El respaldo es demasiado antiguo. Genera uno nuevo.',
      CONFIRMACION_INVALIDA:'Escribe exactamente REINICIAR SISTEMA.',SESION_EXPIRADA:'La sesión venció. Ingresa nuevamente.',SESION_INVALIDA:'La sesión ya no es válida.',SESION_REQUERIDA:'Debes iniciar sesión nuevamente.',MANTENEDOR_SISTEMA_NO_CONFIGURADO:'La URL del Mantenedor del Sistema no está configurada.',TIEMPO_DE_ESPERA_AGOTADO:'La operación tardó demasiado. Revisa la conexión y vuelve a intentarlo.',USUARIO_SIN_LOGIN:'No fue posible determinar el usuario actual para revalidar la contraseña.',RESPALDO_NO_ENCONTRADO:'El respaldo seleccionado ya no existe.',RESPALDO_PERTENECE_A_OTRO_USUARIO:'Ese respaldo fue generado por otro usuario.',ACCION_NO_VALIDA:'La versión desplegada del Mantenedor del Sistema no reconoce esta operación.',NO_FUE_POSIBLE_CONECTAR_MANTENEDOR:'No fue posible conectar con mantenedor-sistema. Revisa que la Edge Function esté desplegada y accesible.',
      REINICIO_SQL_ERROR:'La base de datos detuvo el reinicio de forma segura. No se aplicó una limpieza parcial.',
      REINICIO_BLOQUEADO_FK:'Existe una relación de datos que impide limpiar una tabla operacional. El detalle indica cuál.',
      REINICIO_RPC_SIN_RESPUESTA:'La función de reinicio no devolvió un resultado válido.'
    };
    const friendly=map[base]||raw||'No fue posible completar la operación.';
    return extra&&map[base]?`${friendly} Detalle: ${extra}`:friendly;
  }
  function extractError(payload,status){
    const base=String(payload?.error||payload?.message||payload?.code||`HTTP_${status}`);
    const details=String(payload?.details||payload?.hint||'').trim();
    return details&&details!==base?`${base}: ${details}`:base;
  }
  async function call(action,data={},timeoutMs=120000){
    const url=endpoint();
    if(!/^https:\/\//i.test(url))throw new Error('MANTENEDOR_SISTEMA_NO_CONFIGURADO');
    const t=token();if(!t)throw new Error('SESION_REQUERIDA');
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      // JWT permanece desactivado. La autenticacion del mantenedor usa exclusivamente
      // la sesion de tabla de ALE ATENCIO mediante X-Ale-Session + token en body.
      const r=await fetch(url,{method:'POST',mode:'cors',cache:'no-store',credentials:'omit',headers:{'Content-Type':'application/json','X-Ale-Session':t},body:JSON.stringify({action,data,token:t}),signal:controller.signal});
      const text=await r.text();let payload={};
      try{payload=text?JSON.parse(text):{}}catch(_){payload={error:text||`HTTP_${r.status}`}}
      if(!r.ok||payload?.ok===false)throw new Error(extractError(payload,r.status));
      return payload;
    }catch(err){
      if(err?.name==='AbortError')throw new Error('TIEMPO_DE_ESPERA_AGOTADO');
      if(String(err?.message||'').includes('Failed to fetch'))throw new Error('NO_FUE_POSIBLE_CONECTAR_MANTENEDOR');
      throw err;
    }finally{clearTimeout(timer)}
  }

  const moduleDefs=[
    {name:'Usuarios y permisos',icon:'bi-people',kind:'protected',note:'Se conservan para poder iniciar sesión.',keys:['usuarios']},
    {name:'Productos',icon:'bi-box-seam',kind:'protected',note:'Se conserva catálogo, precios, imágenes, tamaños y recetas. Stock queda en 0.',keys:['productos','tamanos','recetas']},
    {name:'Clientes',icon:'bi-person-lines-fill',kind:'protected',note:'Se conserva el maestro de clientes. Sus estadísticas operacionales vuelven a 0.',keys:['clientes']},
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
    const sel=$('#systemResetBackup');if(sel){const current=sel.value;const complete=rows.filter(x=>String(x.estado).toUpperCase()==='COMPLETO');sel.innerHTML='<option value="">Selecciona un respaldo</option>'+complete.map(b=>`<option value="${esc(b.id)}">${esc(b.folio)} · ${esc(fmtDate(b.creado_en))}</option>`).join('');if(rows.some(x=>String(x.id)===current))sel.value=current;else if(complete[0])sel.value=String(complete[0].id||'')}
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
  function setProgress(kind,step,message){
    const host=$(`#system${kind==='backup'?'Backup':'Reset'}Progress`);if(!host)return;
    host.classList.remove('hidden');
    host.querySelectorAll('[data-progress-step]').forEach(el=>{
      const n=Number(el.dataset.progressStep||0);
      el.classList.toggle('done',n<step);
      el.classList.toggle('active',n===step);
    });
    const txt=host.querySelector('[data-progress-message]');if(txt)txt.textContent=message||'';
  }
  function clearProgress(kind){const host=$(`#system${kind==='backup'?'Backup':'Reset'}Progress`);if(host){host.classList.add('hidden');host.querySelectorAll('[data-progress-step]').forEach(el=>el.classList.remove('done','active'))}}
  function setFormLocked(kind,locked){
    const root=kind==='backup'?$('#systemBackupForm'):$('#systemResetForm');
    if(!root)return;
    root.querySelectorAll('input,select,button').forEach(el=>{if(el.id!==(kind==='backup'?'systemMaintenanceCreateBackup':'systemResetExecute'))el.disabled=!!locked});
  }
  function validateReset(){
    const checks=[
      {ok:!!$('#systemResetBackup')?.value,label:'respaldo previo',selector:'#systemResetBackup'},
      {ok:!!String($('#systemResetReason')?.value||'').trim(),label:'motivo',selector:'#systemResetReason'},
      {ok:!!String($('#systemResetPassword')?.value||''),label:'contraseña actual',selector:'#systemResetPassword'},
      {ok:String($('#systemResetConfirmation')?.value||'').trim().toUpperCase()==='REINICIAR SISTEMA',label:'confirmación REINICIAR SISTEMA',selector:'#systemResetConfirmation'},
      {ok:!!$('#systemResetConsent')?.checked,label:'casilla de confirmación',selector:'#systemResetConsent'}
    ];
    const missing=checks.filter(x=>!x.ok);
    const ready=$('#systemResetReadiness');
    if(ready){
      ready.classList.toggle('ready',missing.length===0);
      ready.classList.toggle('pending',missing.length>0);
      ready.innerHTML=missing.length===0?'<i class="bi bi-check-circle-fill"></i><span>Todo listo. Presiona Reiniciar operación para ejecutar el proceso protegido.</span>':`<i class="bi bi-info-circle"></i><span>Falta completar: ${esc(missing.map(x=>x.label).join(', '))}.</span>`;
    }
    const b=$('#systemResetExecute');if(b)b.classList.toggle('is-ready',missing.length===0);
    return{ok:missing.length===0,missing,first:missing[0]||null};
  }
  async function createBackup(btn){
    const password=String($('#systemBackupPassword')?.value||''),motivo=String($('#systemBackupReason')?.value||'').trim();
    clearStatus('backup');clearProgress('backup');
    if(!password){setStatus('backup','warning','Ingresa tu contraseña actual y luego presiona Generar respaldo.');focusField('#systemBackupPassword');return}
    if(!motivo){setStatus('backup','warning','Indica el motivo del respaldo.');focusField('#systemBackupReason');return}
    setButtonLoading(btn,true,'Generando…');setFormLocked('backup',true);
    setProgress('backup',1,'Validando sesión y contraseña…');
    setStatus('backup','info','Procesando respaldo. No cierres esta ventana.');
    try{
      // La Edge Function revalida la contraseña y recién entonces crea el snapshot.
      await new Promise(r=>setTimeout(r,120));
      setProgress('backup',2,'Generando snapshot de datos operacionales…');
      const out=await call('backup',{password,motivo},180000);
      setProgress('backup',3,'Verificando respaldo y actualizando el mantenedor…');
      if($('#systemBackupPassword'))$('#systemBackupPassword').value='';
      await refresh(false);
      const newId=String(out?.id||'');
      if(newId&&$('#systemResetBackup')){$('#systemResetBackup').value=newId;validateReset()}
      setProgress('backup',4,'Respaldo verificado y disponible.');
      setStatus('backup','success',`Respaldo ${out.folio||''} generado correctamente. Puedes continuar con el reinicio operacional.`);
      notify(`✓ Respaldo generado: ${out.folio||''}`);
    }catch(err){
      const msg=apiError(err.message);setStatus('backup','error',msg);setProgress('backup',1,'No se pudo completar el respaldo.');
    }finally{setFormLocked('backup',false);setButtonLoading(btn,false)}
  }
  async function downloadBackup(id,btn){
    btn.disabled=true;try{const out=await call('backup_export',{respaldo_id:id},180000);const folio=out?.respaldo?.folio||'RESPALDO-ALE';const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${folio}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notify('✓ Respaldo descargado')}finally{btn.disabled=false}
  }
  function showRestartCompleteOverlay(out={}){
    document.getElementById('systemRestartCompleteOverlay')?.remove();
    const total=fmtInt(out?.registros_eliminados||0);
    const overlay=document.createElement('div');
    overlay.id='systemRestartCompleteOverlay';
    overlay.setAttribute('role','alertdialog');
    overlay.setAttribute('aria-modal','true');
    overlay.innerHTML=`
      <div style="position:fixed;inset:0;z-index:2147483647;background:rgba(17,24,39,.78);backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:24px;">
        <section style="width:min(560px,100%);background:#fff;border-radius:22px;box-shadow:0 30px 90px rgba(0,0,0,.35);overflow:hidden;border:1px solid rgba(180,145,52,.24);">
          <div style="height:7px;background:linear-gradient(90deg,#b89034,#e4c975,#b89034);"></div>
          <div style="padding:34px 34px 30px;text-align:center;">
            <div style="width:74px;height:74px;margin:0 auto 20px;border-radius:50%;display:grid;place-items:center;background:#eef9f1;color:#1f8a46;font-size:38px;box-shadow:inset 0 0 0 1px #d4eedb;">
              <i class="bi bi-check2-circle"></i>
            </div>
            <h2 style="margin:0 0 10px;font-size:26px;line-height:1.2;color:#18202a;">Sistema reiniciado correctamente</h2>
            <p style="margin:0 auto;color:#5e6875;font-size:15px;line-height:1.65;max-width:450px;">
              El reinicio operacional fue completado${Number(out?.registros_eliminados||0)>0?` y se limpiaron <strong style="color:#26313d">${esc(total)}</strong> registros de prueba`:''}.
              Por seguridad, las sesiones activas fueron cerradas.
            </p>
            <div style="margin:22px 0 18px;padding:15px 18px;border-radius:14px;background:#fff8e6;border:1px solid #eedda9;color:#67552a;font-weight:700;line-height:1.5;">
              Debe esperar unos segundos antes de volver a iniciar sesión.
            </div>
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;color:#56616e;">
              <span style="width:26px;height:26px;border:3px solid #d9dde2;border-top-color:#b89034;border-radius:50%;display:inline-block;animation:aleRestartSpin .85s linear infinite;"></span>
              <span>Redirigiendo al inicio de sesión en <strong id="systemRestartCountdown" style="font-size:20px;color:#18202a;">7</strong> segundos…</span>
            </div>
          </div>
        </section>
      </div>`;
    const style=document.createElement('style');
    style.id='systemRestartCompleteStyle';
    style.textContent='@keyframes aleRestartSpin{to{transform:rotate(360deg)}}';
    document.getElementById(style.id)?.remove();
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.body.style.overflow='hidden';

    let remaining=7;
    const target=overlay.querySelector('#systemRestartCountdown');
    const ticker=setInterval(()=>{
      remaining-=1;
      if(target)target.textContent=String(Math.max(0,remaining));
      if(remaining<=0){
        clearInterval(ticker);
        location.reload();
      }
    },1000);
  }

  async function executeReset(btn){
    clearStatus('reset');clearProgress('reset');
    const check=validateReset();
    if(!check.ok){
      const msg=`Antes de reiniciar debes completar: ${check.missing.map(x=>x.label).join(', ')}.`;
      setStatus('reset','warning',msg);if(check.first?.selector)focusField(check.first.selector);return;
    }
    const data={respaldo_id:$('#systemResetBackup')?.value,password:String($('#systemResetPassword')?.value||''),motivo:String($('#systemResetReason')?.value||'').trim(),confirmacion:String($('#systemResetConfirmation')?.value||'').trim()};
    setButtonLoading(btn,true,'Reiniciando…');setFormLocked('reset',true);
    setProgress('reset',1,'Revalidando sesión y contraseña del administrador…');
    setStatus('reset','info','Reinicio operacional en proceso. No cierres ni recargues esta ventana.');
    const started=Date.now();let pulse=0;
    const timer=setInterval(()=>{pulse++;const elapsed=Math.max(1,Math.round((Date.now()-started)/1000));if(pulse%2===0)setStatus('reset','info',`Procesando reinicio operacional… ${elapsed}s transcurridos. No cierres esta ventana.`)},1500);
    try{
      await new Promise(r=>setTimeout(r,120));
      setProgress('reset',2,'Limpiando documentos y movimientos de prueba…');
      const out=await call('reset',data,300000);
      setProgress('reset',3,'Verificando stocks, saldos y correlativos internos…');
      await new Promise(r=>setTimeout(r,180));
      setProgress('reset',4,'Proceso completado. Cerrando la sesión por seguridad…');
      setStatus('reset','success',`Sistema reiniciado correctamente. ${fmtInt(out.registros_eliminados)} registros operacionales fueron limpiados y los valores operacionales quedaron en cero.`);
      notify(`✓ Sistema reiniciado correctamente`);
      localStorage.removeItem('aleAdminToken');sessionStorage.removeItem('aleAdminToken');
      showRestartCompleteOverlay(out);
    }catch(err){
      const msg=apiError(err?.message||err);
      setStatus('reset','error',msg);
      setProgress('reset',1,'Reinicio detenido de forma segura. Revisa el detalle mostrado y vuelve a intentar después de aplicar la corrección.');
      setFormLocked('reset',false);setButtonLoading(btn,false);
      console.error('[MANTENEDOR][REINICIO]',err);
    }finally{clearInterval(timer)}
  }


  let bound=false;
  function bind(){
    if(bound)return;bound=true;
    document.addEventListener('click',e=>{
      if(e.target.closest('#openSystemMaintenance')){open();return}
      if(e.target.closest('[data-system-maintenance-close]')){close();return}
      const tab=e.target.closest('[data-system-maintenance-tab]');if(tab){showPane(tab.dataset.systemMaintenanceTab);return}
      if(e.target.closest('#systemMaintenanceRefresh')){refresh(true).catch(err=>notify('✕ '+apiError(err.message)));return}
      const dl=e.target.closest('[data-system-backup-download]');if(dl){downloadBackup(dl.dataset.systemBackupDownload,dl).catch(err=>notify('✕ '+apiError(err.message)));return}
    });
    const backupBtn=$('#systemMaintenanceCreateBackup');if(backupBtn)backupBtn.addEventListener('click',()=>createBackup(backupBtn));
    const resetBtn=$('#systemResetExecute');if(resetBtn)resetBtn.addEventListener('click',()=>executeReset(resetBtn));
    $('#systemBackupPassword')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();createBackup(backupBtn)}});
    $('#systemBackupReason')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();createBackup(backupBtn)}});
    $('#systemResetPassword')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();validateReset();if(validateReset().ok)executeReset(resetBtn)}});
    document.addEventListener('input',e=>{if(e.target.matches('#systemResetConfirmation,#systemResetPassword,#systemResetReason'))validateReset()});
    document.addEventListener('change',e=>{if(e.target.matches('#systemResetConsent,#systemResetBackup'))validateReset()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal()?.classList.contains('hidden'))close()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();


  window.AleSystemMaintenance={version:VERSION,open,refresh};
})();

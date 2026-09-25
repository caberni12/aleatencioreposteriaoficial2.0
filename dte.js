(()=>{
  const $=s=>document.querySelector(s),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmtMoney=v=>new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(Number(v||0));
  const fmtDate=v=>{if(!v)return"—";const d=new Date(`${String(v).slice(0,10)}T12:00:00`);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat("es-CL").format(d)};
  const params=new URLSearchParams(location.search),id=params.get("id")||"",t=params.get("t")||"",host=$("#dteCard");
  function field(label,value,full=false){return `<div class="data-box${full?' full':''}"><span>${esc(label)}</span><strong>${esc(value||'—')}</strong></div>`}
  function error(title,msg){host.className="card error";host.innerHTML=`<h2>${esc(title)}</h2><p>${esc(msg)}</p>`}
  async function load(){
    if(!id||!t){error("Enlace incompleto","El código QR o el enlace de verificación no contiene todos los datos necesarios.");return}
    try{
      const out=await SiiAPI.publicVerify(id,t),d=out.documento||{},s=out.status||{};
      if(out.logo_url)$("#brandLogo").src=out.logo_url;if(out.empresa)$("#brandName").textContent=out.empresa;
      const local=!!d.es_prueba_local,accepted=s.code==="ACEPTADO_SII";
      const statusDetail=local?"Este documento fue generado únicamente para pruebas internas y no tiene validez tributaria ante el SII.":accepted?"El último estado registrado por ALE ATENCIÓN indica aceptación. La comprobación oficial puede realizarse directamente en el portal del SII.":"Este es el último estado registrado por ALE ATENCIÓN. Para acreditar oficialmente la validez o contenido, utiliza la consulta del SII.";
      const pdfAction=out.pdf_disponible?`<button class="btn primary" type="button" id="openDtePdf">Ver / reimprimir PDF</button>`:`<span class="btn secondary disabled">PDF aún no publicado</span>`;
      const siiAction=!local&&out.sii_consultas_url?`<a class="btn secondary" href="${esc(out.sii_consultas_url)}" target="_blank" rel="noopener noreferrer">Verificar oficialmente en SII</a>`:"";
      host.className="card";
      host.innerHTML=`
        <div class="document-head"><div class="document-title"><small>${local?'Prueba local':'Documento tributario electrónico'}</small><h2>${esc(d.nombre_dte||`DTE ${d.tipo_dte||''}`)}</h2><p>${d.pedido_numero?`Pedido ${esc(d.pedido_numero)} · `:''}Emitido ${esc(fmtDate(d.fecha_emision))}</p></div><div class="folio"><span>FOLIO</span><strong>${Number(d.folio||0).toLocaleString('es-CL')}</strong></div></div>
        <div class="status ${esc(s.tone||'warning')}"><div><div>${esc(s.label||'ESTADO NO DISPONIBLE')}</div><small>${esc(statusDetail)}</small></div></div>
        <div class="grid">
          ${field("RUT emisor",d.rut_emisor)}${field("Emisor",d.razon_social_emisor)}
          ${field("RUT receptor",d.rut_receptor)}${field("Receptor",d.razon_social_receptor)}
          ${field("Tipo DTE",`${d.tipo_dte||''} · ${d.nombre_dte||''}`)}${field("Monto total",fmtMoney(d.total))}
          ${field("Fecha emisión",fmtDate(d.fecha_emision))}${field("Pedido",d.pedido_numero||"—")}
          ${d.track_id?field("Track ID SII",d.track_id,true):''}
        </div>
        <div class="actions">${pdfAction}${siiAction}</div>
        <div class="verify-note"><h3>Comprobación tributaria oficial</h3><p>${local?'Los documentos de PRUEBA LOCAL no deben verificarse como DTE reales.':"El SII dispone de las opciones “Verificar contenido de un documento” y “Consultar validez de un documento”. Esas consultas requieren autenticación en el portal del SII."}</p>${local?'':`<div class="verify-fields"><span>Emisor: ${esc(d.rut_emisor||'')}</span><span>Receptor: ${esc(d.rut_receptor||'')}</span><span>DTE: ${esc(d.tipo_dte||'')}</span><span>Folio: ${esc(d.folio||'')}</span><span>Fecha: ${esc(fmtDate(d.fecha_emision))}</span><span>Total: ${esc(fmtMoney(d.total))}</span></div>`}</div>`;
      const pdfBtn=$("#openDtePdf");if(pdfBtn)pdfBtn.addEventListener("click",async()=>{const win=window.open("about:blank","_blank");try{pdfBtn.disabled=true;pdfBtn.textContent="Abriendo PDF…";const blob=await SiiAPI.publicPdf(id,t),blobUrl=URL.createObjectURL(blob);if(win&&!win.closed)win.location.replace(blobUrl);else location.href=blobUrl;setTimeout(()=>URL.revokeObjectURL(blobUrl),120000)}catch(err){try{win?.close()}catch(_){}pdfBtn.disabled=false;pdfBtn.textContent="Ver / reimprimir PDF";alert("No fue posible abrir el PDF en este momento.")} });
    }catch(err){console.warn(err);error("No fue posible verificar el documento",String(err?.message||err).includes("INVALIDA")?"El enlace de verificación no es válido o fue alterado.":"No fue posible consultar el documento en este momento.")}
  }
  load();
})();

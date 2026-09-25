(() => {
  const cfg=()=>window.ALE_ATENCIO_CONFIG||{};
  const url=()=>String(cfg().SII_API_URL||"").trim();
  const configured=()=>/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/facturacion-sii\/?$/i.test(url());
  function err(message,status=0,payload=null){const e=new Error(String(message||payload?.error||"SII_API_ERROR"));e.status=status;e.payload=payload;return e}
  async function request(action,data={},token="",timeoutMs=45000){
    if(!configured())throw err("SII_API_NO_CONFIGURADA");
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const headers={"Content-Type":"application/json"};if(token)headers["X-Ale-Session"]=String(token);
      const res=await fetch(url(),{method:"POST",mode:"cors",cache:"no-store",credentials:"omit",headers,body:JSON.stringify({action,data,token}),signal:controller.signal});
      const text=await res.text();let payload={};try{payload=text?JSON.parse(text):{}}catch(_){throw err("SII_RESPUESTA_INVALIDA",res.status,{raw:text.slice(0,800)})}
      if(!res.ok||payload?.ok===false)throw err(payload?.error||`SII_HTTP_${res.status}`,res.status,payload);return payload;
    }catch(e){if(e?.name==="AbortError")throw err("SII_API_TIMEOUT");throw e}finally{clearTimeout(timer)}
  }
  async function publicPdf(id,verificationToken,timeoutMs=45000){
    if(!configured())throw err("SII_API_NO_CONFIGURADA");const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{const res=await fetch(url(),{method:"POST",mode:"cors",cache:"no-store",credentials:"omit",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"public_document_pdf",data:{id,verification_token:verificationToken}}),signal:controller.signal});if(!res.ok){let payload={};try{payload=await res.json()}catch(_){}throw err(payload?.error||`SII_HTTP_${res.status}`,res.status,payload)}const blob=await res.blob();if(blob.type!=="application/pdf")throw err("SII_PDF_RESPUESTA_INVALIDA");return blob}catch(e){if(e?.name==="AbortError")throw err("SII_API_TIMEOUT");throw e}finally{clearTimeout(timer)}
  }
  window.SiiAPI={configured,request,ping:()=>request("ping",{},"",12000),status:t=>request("status",{},t,30000),saveConfig:(d,t)=>request("config_save",d,t,30000),uploadCertificate:(d,t)=>request("certificate_upload",d,t,60000),activateCertificate:(id,t)=>request("certificate_activate",{id},t,20000),uploadCaf:(xml,t)=>request("caf_upload",{xml},t,30000),generateLocalFolios:(d,t)=>request("local_folios_generate",d,t,30000),testAuth:t=>request("test_auth",{},t,60000),testBoletaAuth:t=>request("boleta_test_auth",{},t,60000),orderPreview:(ref,t)=>request("order_preview",{pedido_id:String(ref||"")},t,30000),issue:(d,t)=>request("issue",d,t,90000),queryTrack:(id,t)=>request("query_track",{documento_id:id},t,60000),detail:(id,t)=>request("document_detail",{id},t,30000),savePdf:(id,pdfBase64,t)=>request("document_pdf_save",{documento_id:id,pdf_base64:pdfBase64},t,60000),publicVerify:(id,verificationToken)=>request("public_document",{id,verification_token:verificationToken},"",30000),exchangeImport:(xml,filename,t)=>request("exchange_import",{xml,filename},t,60000),exchangeMimeImport:(raw_mime,filename,t)=>request("exchange_mime_import",{raw_mime,filename},t,60000),exchangeList:t=>request("exchange_list",{},t,30000),exchangeDetail:(id,t)=>request("exchange_detail",{id},t,30000),exchangeResponse:(id,tipo_respuesta,glosa,t)=>request("exchange_response",{id,tipo_respuesta,glosa},t,60000),exchangeRegisterPurchase:(id,t)=>request("exchange_register_purchase",{id},t,90000),registrySync:(id,t)=>request("registry_sync",{id},t,60000),registryEvent:(id,accion,t)=>request("registry_event",{id,accion},t,60000),certificationStatus:t=>request("certification_status",{},t,30000),certificationUpdate:(data,t)=>request("certification_update",data,t,30000),publicPdf};
})();

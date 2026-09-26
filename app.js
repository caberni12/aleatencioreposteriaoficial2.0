window.ALE_FRONT_BUILD="R9.18.85-CART-EVENTS-CONFIG";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(Number(n||0));
const moneyClp = n => `CLP ${money(Math.round(Number(n||0)))}`;
const priceLabel = p => {const z=productSizes(p)[0],v=Number(z?.precio??p?.precio??0);return v>0?money(v):"Consultar";};
const esc = s => String(s ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const normalizeText = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL").trim();
const productSearchText = p => normalizeText([p?.nombre,p?.descripcion,p?.categoria_nombre||p?.categoria,p?.ocasion].filter(Boolean).join(" "));
const isProductActive = p => {
  if(!p) return false;
  if(typeof p.activo === "boolean") return p.activo;
  const v=String(p.activo??"SI").trim().toUpperCase();
  return !["NO","FALSE","0","INACTIVO"].includes(v);
};
const MEDIA_VERSION = "20260922-r91854-operacion-completa";
const mediaUrl = value => {
  const u=String(value||"").trim();
  if(!u || /^(?:https?:|data:|blob:)/i.test(u)) return u;
  const sep=u.includes("?")?"&":"?";
  return `${u}${sep}v=${MEDIA_VERSION}`;
};
const publicBaseUrl=()=>{
  const candidates=[state?.config?.web_public_url,state?.config?.transbank_checkout_url,window.ALE_ATENCIO_CONFIG?.PUBLIC_BASE_URL,`${location.origin}${location.pathname}`];
  for(const raw of candidates){try{const u=new URL(String(raw||""),location.href),host=u.hostname.toLowerCase();if(u.protocol!=="https:"||host==="supabase.co"||host.endsWith(".supabase.co"))continue;u.search="";u.hash="";return u.toString()}catch(_){}}
  return `${location.origin}${location.pathname}`;
};
const clientPublicUrl=value=>{try{const u=new URL(String(value||""),publicBaseUrl()),host=u.hostname.toLowerCase();let apiHost="";try{apiHost=new URL(String(window.ALE_ATENCIO_CONFIG?.API_URL||"")).hostname.toLowerCase()}catch(_){}if(u.protocol!=="https:"||host==="supabase.co"||host.endsWith(".supabase.co")||host===apiHost||host==="script.google.com"||host.endsWith(".script.google.com")||host==="script.googleusercontent.com"||host.endsWith(".script.googleusercontent.com")||/\/(?:functions|rest|storage)\/v1\//i.test(u.pathname))return publicBaseUrl();return u.toString()}catch(_){return publicBaseUrl()}};
const DEFAULT_EVENTS_URL="https://franciscoferraris.cl/";
function configuredEventsUrl(){const raw=String(state?.config?.eventos_url||DEFAULT_EVENTS_URL).trim();try{const u=new URL(raw);if(u.protocol!=="https:")throw new Error("URL_EVENTOS_HTTPS_REQUERIDA");return u.toString()}catch(_){return DEFAULT_EVENTS_URL}}
function syncEventsHeaderLink(){const link=$("#eventsHeaderLink");if(!link)return;link.href=configuredEventsUrl();}

const seed = {"config":{"empresa":"Ale Atencio","empresa_rut":"","whatsapp":"","instagram":"","facebook":"","tiktok":"","direccion":"","email":"","valor_despacho":"0","logo_url":"logo-ale-atencio.png","transbank_enabled":"NO","transbank_return_url":"","transbank_runtime_ready":"NO","transbank_environment":"INTEGRATION","transbank_button_label":"Pagar con Transbank","eventos_url":"https://franciscoferraris.cl/"},"categories":[{"id":"C001","nombre":"Tortas","descripcion":"Tortas artesanales para celebraciones","drive_file_id":"","image_url":"","orden":1,"activo":"SI"},{"id":"C002","nombre":"Galletas","descripcion":"Galletas, alfajores y masas artesanales","drive_file_id":"","image_url":"","orden":2,"activo":"SI"},{"id":"C003","nombre":"Dulcería","descripcion":"Calugas, vasitos y dulces especiales","drive_file_id":"","image_url":"","orden":3,"activo":"SI"},{"id":"C004","nombre":"Postres","descripcion":"Cheesecakes, pies, tartas y postres","drive_file_id":"","image_url":"","orden":4,"activo":"SI"},{"id":"C005","nombre":"Regalos","descripcion":"Selecciones personalizadas y detalles para regalar","drive_file_id":"","image_url":"","orden":5,"activo":"SI"}],"banners":[{"id":"B001","titulo":"Dulces momentos hechos para celebrar","subtitulo":"Descubre nuestro catálogo artesanal Ale Atencio.","cta_texto":"Ver catálogo","enlace":"#productos/todos","drive_file_id":"","image_url":"","activo":"SI","orden":1},{"id":"B002","titulo":"Tortas que hacen especial cada celebración","subtitulo":"Diseños y sabores preparados con dedicación para cada ocasión.","cta_texto":"Ver tortas","enlace":"#productos/tortas","drive_file_id":"","image_url":"","activo":"SI","orden":2},{"id":"B003","titulo":"Detalles dulces para compartir y regalar","subtitulo":"Galletas, surtidos y preparaciones artesanales para sorprender.","cta_texto":"Ver productos","enlace":"#productos/todos","drive_file_id":"","image_url":"","activo":"SI","orden":3}],"products":[{"id":"P001","nombre":"Torta Chocolate Ganache","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"SI","activo":"SI","ocasion":"Celebraciones","orden":1,"fecha_actualizacion":""},{"id":"P002","nombre":"Torta Hojarasca Manjar","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"SI","activo":"SI","ocasion":"Celebraciones","orden":2,"fecha_actualizacion":""},{"id":"P003","nombre":"Torta Café Praliné","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":3,"fecha_actualizacion":""},{"id":"P004","nombre":"Torta Piña, Crema y Cerezas","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"SI","activo":"SI","ocasion":"Celebraciones","orden":4,"fecha_actualizacion":""},{"id":"P005","nombre":"Torta Hojarasca Frambuesa","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"SI","activo":"SI","ocasion":"Celebraciones","orden":5,"fecha_actualizacion":""},{"id":"P006","nombre":"Surtido de Masas Secas","descripcion":"Selección Ale Atencio pensada para regalar, compartir o personalizar.","precio":0,"categoria_nombre":"Regalos","stock":0,"drive_file_id":"","image_url":"","destacado":"SI","activo":"SI","ocasion":"Regalos","orden":6,"fecha_actualizacion":""},{"id":"P008","nombre":"Galletas Vienesas Bañadas","descripcion":"Elaboración artesanal Ale Atencio, ideal para compartir, acompañar o regalar.","precio":0,"categoria_nombre":"Galletas","stock":0,"drive_file_id":"","image_url":"","destacado":"SI","activo":"SI","ocasion":"Todo momento","orden":8,"fecha_actualizacion":""},{"id":"P009","nombre":"Pie de Manzana Tradicional","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":9,"fecha_actualizacion":""},{"id":"P010","nombre":"Galletas Vienesas Mix","descripcion":"Elaboración artesanal Ale Atencio, ideal para compartir, acompañar o regalar.","precio":0,"categoria_nombre":"Galletas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":10,"fecha_actualizacion":""},{"id":"P011","nombre":"Torta Merengue Nuez","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":11,"fecha_actualizacion":""},{"id":"P012","nombre":"Cheesecake Frutilla Rústico","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":12,"fecha_actualizacion":""},{"id":"P013","nombre":"Merenguitos Artesanales","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":13,"fecha_actualizacion":""},{"id":"P014","nombre":"Pie de Limón Merengado","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":14,"fecha_actualizacion":""},{"id":"P015","nombre":"Calugas de Rosa","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":15,"fecha_actualizacion":""},{"id":"P016","nombre":"Calugas Pistacho","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":16,"fecha_actualizacion":""},{"id":"P017","nombre":"Brazo de Reina Frambuesa","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":17,"fecha_actualizacion":""},{"id":"P018","nombre":"Surtido de Galletas Finas","descripcion":"Selección Ale Atencio pensada para regalar, compartir o personalizar.","precio":0,"categoria_nombre":"Regalos","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Regalos","orden":18,"fecha_actualizacion":""},{"id":"P020","nombre":"Cuadrado Frambuesa Crumble","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":20,"fecha_actualizacion":""},{"id":"P021","nombre":"Canastitas Gourmet Frutos Secos","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":21,"fecha_actualizacion":""},{"id":"P022","nombre":"Milhojas Crocante Manjar","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":22,"fecha_actualizacion":""},{"id":"P023","nombre":"Alfajores y Trufas Surtidas","descripcion":"Elaboración artesanal Ale Atencio, ideal para compartir, acompañar o regalar.","precio":0,"categoria_nombre":"Galletas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":23,"fecha_actualizacion":""},{"id":"P025","nombre":"Alfajores Maicena Artesanales","descripcion":"Elaboración artesanal Ale Atencio, ideal para compartir, acompañar o regalar.","precio":0,"categoria_nombre":"Galletas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":25,"fecha_actualizacion":""},{"id":"P026","nombre":"Tarta Nuez Espolvoreada","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":26,"fecha_actualizacion":""},{"id":"P027","nombre":"Torta Durazno Chantilly","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":27,"fecha_actualizacion":""},{"id":"P028","nombre":"Canastitas Dulces Gourmet","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":28,"fecha_actualizacion":""},{"id":"P029","nombre":"Vasitos Mousse Maracuyá Frambuesa","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":29,"fecha_actualizacion":""},{"id":"P030","nombre":"Vasitos Postre Maracuyá Frambuesa","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":30,"fecha_actualizacion":""},{"id":"P031","nombre":"Torta Rosas Blancas","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":31,"fecha_actualizacion":""},{"id":"P032","nombre":"Rollos de Canela Glaseados","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":32,"fecha_actualizacion":""},{"id":"P033","nombre":"Rectángulo Hojarasca Manjar","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":33,"fecha_actualizacion":""},{"id":"P034","nombre":"Galletas Navideñas Decoradas","descripcion":"Preparación artesanal Ale Atencio, ideal para compartir y regalar en temporada navideña.","precio":0,"categoria_nombre":"Regalos","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Navidad","orden":34,"fecha_actualizacion":""},{"id":"P035","nombre":"Torta Frambuesa Crocante","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":35,"fecha_actualizacion":""},{"id":"P036","nombre":"Torta Chocolate Premium","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":36,"fecha_actualizacion":""},{"id":"P039","nombre":"Empanaditas Dulces Surtidas","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":39,"fecha_actualizacion":""},{"id":"P040","nombre":"Torta Rosas y Chocolate","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":40,"fecha_actualizacion":""},{"id":"P041","nombre":"Galleta Reno Decorada","descripcion":"Preparación artesanal Ale Atencio, ideal para compartir y regalar en temporada navideña.","precio":0,"categoria_nombre":"Galletas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Navidad","orden":41,"fecha_actualizacion":""},{"id":"P042","nombre":"Torta Merengue Frambuesa","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":42,"fecha_actualizacion":""},{"id":"P043","nombre":"Surtido Ale Atencio","descripcion":"Selección Ale Atencio pensada para regalar, compartir o personalizar.","precio":0,"categoria_nombre":"Regalos","stock":0,"drive_file_id":"","image_url":"","destacado":"SI","activo":"SI","ocasion":"Regalos","orden":43,"fecha_actualizacion":""},{"id":"P045","nombre":"Empanada de Manzana Individual","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":45,"fecha_actualizacion":""},{"id":"P046","nombre":"Triángulo Hojarasca Manjar","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":46,"fecha_actualizacion":""},{"id":"P047","nombre":"Calugas Artesanales Pistacho","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":47,"fecha_actualizacion":""},{"id":"P048","nombre":"Brazo de Reina Merengado","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":48,"fecha_actualizacion":""},{"id":"P050","nombre":"Cheesecake Frutilla","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":50,"fecha_actualizacion":""},{"id":"P051","nombre":"Cheesecake Maracuyá","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":51,"fecha_actualizacion":""},{"id":"P053","nombre":"Croissants de Mantequilla","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":53,"fecha_actualizacion":""},{"id":"P054","nombre":"Alfajores y Trufas Finas","descripcion":"Elaboración artesanal Ale Atencio, ideal para compartir, acompañar o regalar.","precio":0,"categoria_nombre":"Galletas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":54,"fecha_actualizacion":""},{"id":"P055","nombre":"Galletas Navideñas Envoltorio","descripcion":"Preparación artesanal Ale Atencio, ideal para compartir y regalar en temporada navideña.","precio":0,"categoria_nombre":"Regalos","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Navidad","orden":55,"fecha_actualizacion":""},{"id":"P056","nombre":"Surtido de Galletas Finas Ale Atencio","descripcion":"Selección Ale Atencio pensada para regalar, compartir o personalizar.","precio":0,"categoria_nombre":"Regalos","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Regalos","orden":56,"fecha_actualizacion":""},{"id":"P057","nombre":"Torta Hojarasca Manjar Redonda","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"SI","activo":"SI","ocasion":"Celebraciones","orden":57,"fecha_actualizacion":""},{"id":"P058","nombre":"Torta Merengue Frambuesa Redonda","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":58,"fecha_actualizacion":""},{"id":"P059","nombre":"Rollos de Canela Caseros","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":59,"fecha_actualizacion":""},{"id":"P060","nombre":"Alfajores Premium","descripcion":"Elaboración artesanal Ale Atencio, ideal para compartir, acompañar o regalar.","precio":0,"categoria_nombre":"Galletas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":60,"fecha_actualizacion":""},{"id":"P062","nombre":"Trufas y Alfajores Surtidos","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":62,"fecha_actualizacion":""},{"id":"P063","nombre":"Cheesecake Frambuesa","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":63,"fecha_actualizacion":""},{"id":"P064","nombre":"Vasitos Mousse Gourmet","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":64,"fecha_actualizacion":""},{"id":"P065","nombre":"Mini Tartaletas y Alfajores","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":65,"fecha_actualizacion":""},{"id":"P066","nombre":"Croissants Artesanales","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":66,"fecha_actualizacion":""},{"id":"P067","nombre":"Galletas Personalizadas Novios","descripcion":"Selección Ale Atencio pensada para regalar, compartir o personalizar.","precio":0,"categoria_nombre":"Regalos","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Matrimonios","orden":67,"fecha_actualizacion":""},{"id":"P068","nombre":"Torta Chocolate Oro","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"SI","activo":"SI","ocasion":"Celebraciones","orden":68,"fecha_actualizacion":""},{"id":"P070","nombre":"Strudel de Manzana","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":70,"fecha_actualizacion":""},{"id":"P071","nombre":"Galletas Peineta Artesanales","descripcion":"Elaboración artesanal Ale Atencio, ideal para compartir, acompañar o regalar.","precio":0,"categoria_nombre":"Galletas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":71,"fecha_actualizacion":""},{"id":"P073","nombre":"Alfajores Nevados","descripcion":"Elaboración artesanal Ale Atencio, ideal para compartir, acompañar o regalar.","precio":0,"categoria_nombre":"Galletas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":73,"fecha_actualizacion":""},{"id":"P075","nombre":"Tarta Corazones de Manjar","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":75,"fecha_actualizacion":""},{"id":"P076","nombre":"Torta Merengada Alta","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":76,"fecha_actualizacion":""},{"id":"P077","nombre":"Torta Hojarasca Manjar Chocodots","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":77,"fecha_actualizacion":""},{"id":"P078","nombre":"Macarons Surtidos Box","descripcion":"Selección Ale Atencio pensada para regalar, compartir o personalizar.","precio":0,"categoria_nombre":"Regalos","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Regalos","orden":78,"fecha_actualizacion":""},{"id":"P079","nombre":"Palmeritas de Hojaldre","descripcion":"Elaboración artesanal Ale Atencio, ideal para compartir, acompañar o regalar.","precio":0,"categoria_nombre":"Galletas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":79,"fecha_actualizacion":""},{"id":"P082","nombre":"Torta Naked Frambuesa","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":82,"fecha_actualizacion":""},{"id":"P083","nombre":"Tarta Decorada Premium","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":83,"fecha_actualizacion":""},{"id":"P084","nombre":"Rectángulo Hojarasca Manjar Dorado","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":84,"fecha_actualizacion":""},{"id":"P085","nombre":"Galletas Navideñas Surtidas","descripcion":"Preparación artesanal Ale Atencio, ideal para compartir y regalar en temporada navideña.","precio":0,"categoria_nombre":"Regalos","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Navidad","orden":85,"fecha_actualizacion":""},{"id":"P086","nombre":"Cuadrados Frambuesa Crumble","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":86,"fecha_actualizacion":""},{"id":"P087","nombre":"Torta Hojarasca Manjar Alta","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":87,"fecha_actualizacion":""},{"id":"P088","nombre":"Galleta Corporativa Personalizada","descripcion":"Preparación personalizada Ale Atencio para empresas, eventos y ocasiones especiales.","precio":0,"categoria_nombre":"Regalos","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Empresas","orden":88,"fecha_actualizacion":""},{"id":"P089","nombre":"Cheesecake Frutos Rojos","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"SI","activo":"SI","ocasion":"Todo momento","orden":89,"fecha_actualizacion":""},{"id":"P091","nombre":"Torta Hojarasca Manjar Clásica","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Celebraciones","orden":91,"fecha_actualizacion":""},{"id":"P092","nombre":"Muffin Gourmet Frutos Secos","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":92,"fecha_actualizacion":""},{"id":"P093","nombre":"Galletas Corporativas Personalizadas","descripcion":"Preparación personalizada Ale Atencio para empresas, eventos y ocasiones especiales.","precio":0,"categoria_nombre":"Regalos","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Empresas","orden":93,"fecha_actualizacion":""},{"id":"P094","nombre":"Strudel de Manzana y Nuez","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":94,"fecha_actualizacion":""},{"id":"P095","nombre":"Berlines con Azúcar","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":95,"fecha_actualizacion":""},{"id":"P096","nombre":"Rectángulo Hojarasca Frambuesa","descripcion":"Dulce artesanal Ale Atencio, elaborado con dedicación para disfrutar y compartir.","precio":0,"categoria_nombre":"Dulcería","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":96,"fecha_actualizacion":""},{"id":"P097","nombre":"Galletas Corporativas Envoltorio","descripcion":"Preparación personalizada Ale Atencio para empresas, eventos y ocasiones especiales.","precio":0,"categoria_nombre":"Regalos","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Empresas","orden":97,"fecha_actualizacion":""},{"id":"P098","nombre":"Croissants Dorados","descripcion":"Postre artesanal Ale Atencio con presentación cuidada y sabor casero.","precio":0,"categoria_nombre":"Postres","stock":0,"drive_file_id":"","image_url":"","destacado":"NO","activo":"SI","ocasion":"Todo momento","orden":98,"fecha_actualizacion":""},{"id":"P100","nombre":"Torta Vainilla Manjar","descripcion":"Torta artesanal Ale Atencio, preparada con presentación cuidada para celebraciones y momentos especiales.","precio":0,"categoria_nombre":"Tortas","stock":0,"drive_file_id":"","image_url":"","destacado":"SI","activo":"SI","ocasion":"Celebraciones","orden":100,"fecha_actualizacion":""}]};

let state = JSON.parse(JSON.stringify(seed));
state.gallery = Array.isArray(state.gallery)?state.gallery:[];
let cart = JSON.parse(localStorage.getItem("aleAtencioCart") || "[]");
let currentSlide = 0, slideTimer = null;
let lastCatalogRefreshAt=0;
window.addEventListener("focus",()=>{if(!AleAPI?.configured?.())return;const now=Date.now();if(now-lastCatalogRefreshAt<2000)return;lastCatalogRefreshAt=now;refreshCatalogAvailability().catch(()=>{})});

function beginButtonLoader(btn){if(!btn)return;btn.dataset.busy="1";btn.classList.add("is-loading");btn.disabled=true}
function endButtonLoader(btn){if(!btn)return;delete btn.dataset.busy;btn.classList.remove("is-loading");btn.disabled=false}
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;b.classList.add("is-loading");setTimeout(()=>{if(!b.dataset.busy)b.classList.remove("is-loading")},360)},true);

async function loadStore(){
  if(AleAPI.configured()){
    try{
      const data = await AleAPI.get("bootstrap");
      state.config = {...state.config,...(data.config||{})};
      if(Array.isArray(data.categories)) state.categories = data.categories;
      if(Array.isArray(data.banners)) state.banners = data.banners;
      if(Array.isArray(data.gallery)) state.gallery = data.gallery;
      state.products = Array.isArray(data.products) ? data.products.filter(isProductActive) : [];
    }catch(e){
      console.warn("Catálogo remoto no disponible", e);
      // Seguridad comercial: si Supabase está configurado pero no responde, no se
      // muestran productos semilla que podrían haber sido desactivados en el cPanel.
      state.products = [];
    }
  }else{
    state.products = state.products.filter(isProductActive);
  }
  sanitizeCartAgainstCatalog();
  const logo = state.config.logo_url || "logo-ale-atencio.png";
  $("#brandLogo").src = logo;
  const waFloat=$("#whatsappFloat"); if(waFloat) waFloat.style.display="grid";
  syncSocialButtons();
  syncEventsHeaderLink();
  buildCategoryMenu();
  render();
  updateCartUI();
  await handleTransbankReturnUi();
}

function buildCategoryMenu(){
  $("#categoryMenu").innerHTML = state.categories
    .slice().sort((a,b)=>Number(a.orden||0)-Number(b.orden||0))
    .map(c=>`<a href="#productos/${slug(c.nombre)}">${esc(c.nombre)}</a>`).join("");
}

function slug(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"-")}
function categoryFallback(i){return ["🍰","🍪","🍬","🍮","🎁","🧁"][i%6]}
function productFallback(p){return ({Tortas:"🍰",Galletas:"🍪","Dulcería":"🍫",Postres:"🧁",Regalos:"🎁"})[p.categoria_nombre]||"🍰"}
function productSizes(p){return (Array.isArray(p?.tamanos)?p.tamanos:[]).filter(x=>isProductActive(x)).slice().sort((a,b)=>Number(a.orden||0)-Number(b.orden||0)||String(a.nombre||"").localeCompare(String(b.nombre||""),"es"))}
function productSize(p,sizeId=""){const list=productSizes(p);if(sizeId)return list.find(x=>String(x.id)===String(sizeId))||null;return list[0]||null}
function productSortPrice(p){const values=productSizes(p).map(x=>Number(x.precio||0)).filter(x=>x>0);return values.length?Math.min(...values):Number(p?.precio||0)}
function cartLineSize(p,i){const list=productSizes(p);if(!list.length)return null;const byId=i?.tamano_id?list.find(x=>String(x.id)===String(i.tamano_id)):null;if(byId)return byId;const byName=i?.tamano_nombre?list.find(x=>normalizeText(x.nombre)===normalizeText(i.tamano_nombre)):null;return byName||(!i?.tamano_id&&!i?.tamano_nombre?list[0]:null)}
function cartLinePrice(i,p){const z=cartLineSize(p,i);return Number(z?.precio??i?.precio??p?.precio??0)}
function cartLineKey(id,sizeId=""){return `${String(id)}::${String(sizeId||"")}`}

function showStockToClients(){return ["SI","SÍ","TRUE","1","YES","ON"].includes(String(state?.config?.mostrar_stock_clientes||"").trim().toUpperCase())}
function globalSalesWithoutStock(){return ["SI","SÍ","TRUE","1","YES","ON"].includes(String(state?.config?.permitir_venta_sin_stock||"").trim().toUpperCase())}
function productAllowsNegativeStock(p){return globalSalesWithoutStock()}
function productGlobalStock(p){const sizes=productSizes(p);if(sizes.length)return sizes.reduce((sum,z)=>{const n=Number(z?.stock);return sum+(Number.isFinite(n)?n:0)},0);const n=Number(p?.stock);return Number.isFinite(n)?n:0}

function heroView(){
  const banners = state.banners.slice().sort((a,b)=>Number(a.orden||0)-Number(b.orden||0));
  return `<section class="hero"><div class="hero-stage hero-preparing">
    ${banners.map((b,i)=>`<article class="hero-slide ${i===0?"active":""}">
      <div class="hero-bg ${b.image_url?"":`hero-fallback-${(i%3)+1}`}" ${b.image_url?`data-bg="${esc(mediaUrl(b.image_url))}" style="background-image:url('${esc(mediaUrl(b.image_url))}')"`:""}></div>
      <div class="hero-content"><div class="hero-copy">
        <span class="eyebrow">Ale Atencio Repostería</span>
        <h1>${esc(b.titulo)}</h1>
        <p>${esc(b.subtitulo)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="${esc(b.enlace||"#productos/todos")}">${esc(b.cta_texto||"Ver más")}</a>
          <a class="btn hero-secondary" href="#productos/todos">Ver catálogo</a>
        </div>
      </div></div>
    </article>`).join("")}
    <div class="hero-controls">
      <button class="hero-arrow" id="prevSlide"><i class="bi bi-chevron-left"></i></button>
      <div class="hero-dots">${banners.map((_,i)=>`<button class="hero-dot ${i===0?"active":""}" data-dot="${i}"></button>`).join("")}</div>
      <button class="hero-arrow" id="nextSlide"><i class="bi bi-chevron-right"></i></button>
    </div>
  </div></section>`;
}

function categoryCard(c,i){
  return `<a class="category-card" href="#productos/${slug(c.nombre)}">
    ${c.image_url?`<img src="${esc(mediaUrl(c.image_url))}" alt="${esc(c.nombre)}">`:`<div style="position:absolute;inset:0;display:grid;place-items:center;font-size:92px">${categoryFallback(i)}</div>`}
    <div class="category-copy"><h3>${esc(c.nombre)}</h3><span>${esc(c.descripcion||"")}</span></div>
  </a>`;
}

function productCard(p){
  if(!isProductActive(p)) return "";
  const sizes=productSizes(p),selected=sizes[0]||null;
  const selectedPrice=Number(selected?.precio??p.precio??0),priced=selectedPrice>0;
  const sizeMeta=sizes.length?`${sizes.length} ${sizes.length===1?"tamaño":"tamaños"}`:"Presentación única";
  return `<article class="product-card product-card-compact" data-product-id="${esc(p.id)}" role="button" tabindex="0" aria-label="Ver ${esc(p.nombre)}" onclick="openProductDetail('${esc(p.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openProductDetail('${esc(p.id)}')}">
    <div class="product-image">
      ${p.image_url?`<img src="${esc(mediaUrl(p.image_url))}" alt="${esc(p.nombre)}" loading="lazy">`:`<span>${productFallback(p)}</span>`}
      ${String(p.destacado).toUpperCase()==="SI"?'<span class="product-badge">Destacado</span>':""}
    </div>
    <div class="product-body">
      <small>${esc(p.categoria_nombre||p.categoria||"")}</small>
      <h3>${esc(p.nombre)}</h3>
      <p>${esc(p.descripcion||"")}</p>
      ${showStockToClients()?`<div class="product-stock-general" aria-label="Stock general del producto"><i class="bi bi-box-seam"></i><span>Stock general</span><strong>${productGlobalStock(p)} ${Math.abs(productGlobalStock(p))===1?"unidad":"unidades"}</strong></div>`:""}
      <div class="product-compact-meta"><span>${esc(sizeMeta)}</span><strong>${priced?`${sizes.length>1?"Desde ":""}${money(selectedPrice)}`:"Consultar"}</strong></div>
    </div>
    <button class="product-card-plus" type="button" aria-label="Ver opciones de ${esc(p.nombre)}" onclick="event.stopPropagation();openProductDetail('${esc(p.id)}')"><i class="bi bi-plus-lg"></i></button>
  </article>`;
}

let productDetailState={id:"",sizeId:"",qty:1,note:""};
function productDetailProduct(){return state.products.find(x=>String(x.id)===String(productDetailState.id))||null}
function productDetailMoney(value){return Number(value||0)>0?money(value):"Consultar"}
function renderProductDetail(){
  const p=productDetailProduct(),host=$("#productDetailContent");if(!p||!host)return;
  const sizes=productSizes(p),selected=productSize(p,productDetailState.sizeId)||sizes[0]||null;
  if(selected)productDetailState.sizeId=String(selected.id||"");
  const unitPrice=Number(selected?.precio??p.precio??0),qty=Math.max(1,Number(productDetailState.qty||1)),priced=unitPrice>0;
  const note=String(productDetailState.note||"");
  const sizeOptions=sizes.length?`<div class="product-detail-section"><div class="product-detail-section-head"><div><div class="product-detail-label">Tamaño ${esc((p.nombre||"").toLowerCase())}</div><div class="product-detail-hint">Selecciona al menos 1</div></div><span class="product-detail-required">Obligatorio</span></div><div class="product-detail-sizes">${sizes.map(z=>`<button type="button" class="product-detail-size ${String(z.id)===String(selected?.id)?"active":""}" onclick="selectProductDetailSize('${esc(z.id)}')"><span class="product-detail-size-copy"><span class="product-detail-size-name">${esc(z.nombre)}</span><small>${productDetailMoney(z.precio)}</small></span><span class="product-detail-size-check" aria-hidden="true"></span></button>`).join("")}</div></div>`:"";
  host.innerHTML=`
    <div class="product-detail-layout">
      <div class="product-detail-media">${p.image_url?`<img src="${esc(mediaUrl(p.image_url))}" alt="${esc(p.nombre)}">`:`<span>${productFallback(p)}</span>`}</div>
      <div class="product-detail-side">
        <div class="product-detail-side-scroll">
          <small>${esc(p.categoria_nombre||p.categoria||"")}</small>
          <h2>${esc(p.nombre)}</h2>
          <p>${esc(p.descripcion||"")}</p>
          ${sizeOptions}
          <div class="product-detail-section">
            <div class="product-detail-label product-detail-label-lg">Instrucciones especiales</div>
            <textarea class="product-detail-note" placeholder="Incluye una nota" oninput="updateProductDetailNote(this.value)">${esc(note)}</textarea>
          </div>
        </div>
        <div class="product-detail-footer">
          <div class="product-detail-qty" aria-label="Cantidad"><button type="button" onclick="changeProductDetailQty(-1)" aria-label="Disminuir cantidad"><i class="bi bi-dash"></i></button><strong>${qty}</strong><button type="button" onclick="changeProductDetailQty(1)" aria-label="Aumentar cantidad"><i class="bi bi-plus"></i></button></div>
          <button type="button" class="product-detail-add" onclick="addProductDetailToCart()"><span>${priced?"Agregar":"Consultar"}</span><strong>${priced?money(unitPrice*qty):"$0"}</strong></button>
        </div>
      </div>
    </div>`;
}
window.openProductDetail=(productId)=>{
  const p=state.products.find(x=>String(x.id)===String(productId));if(!p||!isProductActive(p))return;
  const first=productSizes(p)[0]||null;productDetailState={id:String(productId),sizeId:String(first?.id||""),qty:1,note:""};renderProductDetail();openModal("#productDetailModal");
};
window.selectProductDetailSize=(sizeId)=>{productDetailState.sizeId=String(sizeId||"");renderProductDetail()};
window.changeProductDetailQty=(delta)=>{productDetailState.qty=Math.max(1,Math.min(99,Number(productDetailState.qty||1)+Number(delta||0)));renderProductDetail()};
window.updateProductDetailNote=(value)=>{productDetailState.note=String(value||"")};
window.addProductDetailToCart=async()=>{
  const p=productDetailProduct();if(!p)return;
  const selected=productSize(p,productDetailState.sizeId),price=Number(selected?.precio??p.precio??0);
  if(price<=0){closeModal();location.hash='solicitud';return}
  const ok=await addToCart(p.id,selected?.id||"",productDetailState.qty);if(ok!==false)closeModal();
};
window.selectProductSize=async(productId,sizeId,source)=>{
  const card=source?.closest?.('.product-card');if(!card)return;
  let p=state.products.find(x=>String(x.id)===String(productId)),z=productSize(p,sizeId);if(!p||!z)return;
  const apply=(size)=>{if(!size)return;card.dataset.selectedSize=String(size.id||"");card.querySelectorAll('.product-size-chip').forEach(b=>b.classList.toggle('active',String(b.dataset.sizeId)===String(size.id)));const price=card.querySelector('.price'),caption=card.querySelector('.product-size-caption'),add=card.querySelector('.add-button');if(price)price.textContent=Number(size.precio||0)>0?money(size.precio):"Consultar";if(caption)caption.innerHTML=`Tamaño seleccionado: <strong>${esc(size.nombre)}</strong>`;if(add)add.textContent=Number(size.precio||0)>0?"Agregar":"Consultar";};
  apply(z);
  if(!AleAPI?.configured?.())return;
  try{
    const live=await AleAPI.get("checkproduct",{id:String(productId),tamano_id:String(sizeId)});
    if(!live?.exists||!live?.active||!live?.tamano){toast("Este tamaño ya no está disponible.","error");await refreshCatalogAvailability();return;}
    if(Array.isArray(live.tamanos)){p={...p,tamanos:live.tamanos};const idx=state.products.findIndex(x=>String(x.id)===String(productId));if(idx>=0)state.products[idx]=p;}
    z=live.tamano;apply(z);
  }catch(err){console.warn("No se pudo refrescar precio del tamaño",err);}
};
window.addSelectedProductToCart=(productId,source)=>{const card=source?.closest?.('.product-card'),sizeId=card?.dataset?.selectedSize||"",p=state.products.find(x=>String(x.id)===String(productId)),z=productSize(p,sizeId),price=Number(z?.precio??p?.precio??0);if(price<=0){location.hash='solicitud';return}addToCart(productId,z?.id||"")};

function catalogFilterInfo(filter){
  const key=slug(filter||"todos");
  const titleMap={
    "todos":"Todos los productos",
    "panaderia-galleteria":"Panadería y galletería",
    "eventos":"Eventos",
    "postres-antojos":"Postres y antojos"
  };
  return {key,title:titleMap[key]||titleCase(key)};
}

function catalogMatches(p,filter){
  const key=slug(filter||"todos");
  if(key==="todos") return true;
  const cat=slug(p.categoria_nombre||p.categoria);
  const occasion=slug(p.ocasion);
  const text=normalizeText([p.nombre,p.descripcion,p.categoria_nombre||p.categoria,p.ocasion].filter(Boolean).join(" "));
  if(key==="panaderia-galleteria") return cat==="galletas" || /croissant|rollo|strudel|berlin|palmerita|masa|hojaldre|galleta|alfajor/.test(text);
  if(key==="eventos") return occasion==="celebraciones" || cat==="tortas" || /evento|celebracion|cumple|novio|corporativ/.test(text);
  if(key==="postres-antojos") return cat==="postres" || cat==="dulceria";
  return cat===key || occasion===key;
}

function delicaciesSection(){
  const findBy=(pred)=>state.products.find(pred) || state.products.find(p=>p.image_url) || state.products[0];
  const cards=[
    {title:"Tortas",filter:"tortas",product:findBy(p=>slug(p.categoria_nombre||p.categoria)==="tortas" && p.image_url)},
    {title:"Panadería y galletería",filter:"panaderia-galleteria",product:findBy(p=>/croissant|rollo|galleta|masa|palmerita|berlin/.test(normalizeText(p.nombre)) && p.image_url)},
    {title:"Eventos",filter:"eventos",product:findBy(p=>slug(p.ocasion)==="celebraciones" && p.image_url)},
    {title:"Postres y antojos",filter:"postres-antojos",product:findBy(p=>["postres","dulceria"].includes(slug(p.categoria_nombre||p.categoria)) && p.image_url)}
  ];
  return `<section class="delicacies-section" aria-labelledby="delicaciesTitle">
    <div class="section delicacies-inner">
      <div class="delicacies-heading">
        <h2 id="delicaciesTitle">Nuestras delicias</h2>
        <p>Hechas con cariño, pensadas para celebrar</p>
      </div>
      <div class="delicacies-grid">
        ${cards.map((c,i)=>`<article class="delicacy-card">
          <a class="delicacy-media" href="#productos/${c.filter}" aria-label="Ver ${esc(c.title)}">
            ${c.product?.image_url?`<img src="${esc(mediaUrl(c.product.image_url))}" alt="${esc(c.title)}" loading="lazy">`:`<div class="delicacy-fallback">${categoryFallback(i)}</div>`}
          </a>
          <div class="delicacy-body">
            <h3>${esc(c.title)}</h3>
            <a class="delicacy-link" href="#productos/${c.filter}">Ver catálogo <i class="bi bi-chevron-right"></i></a>
          </div>
        </article>`).join("")}
      </div>
    </div>
  </section>`;
}

function galleryView(){
  const items=(state.gallery||[]).filter(x=>String(x.activo??"SI").toUpperCase()!=="NO"&&String(x.visible_publico??"SI").toUpperCase()!=="NO");
  return `<section class="view-hero"><div class="view-hero-inner"><span class="eyebrow">Galería</span><h1>Trabajos y celebraciones</h1><p>Una selección de preparaciones y eventos realizados por Ale Atencio.</p></div></section><section class="section"><div class="public-gallery-grid">${items.length?items.map(x=>`<article class="public-gallery-card"><img src="${esc(mediaUrl(x.image_url||""))}" alt="${esc(x.titulo||"Trabajo Ale Atencio")}" loading="lazy"><div><small>${esc(x.categoria||"Ale Atencio")}</small><h3>${esc(x.titulo||"")}</h3>${x.descripcion?`<p>${esc(x.descripcion)}</p>`:""}</div></article>`).join(""):'<div class="empty-card">Pronto publicaremos nuevos trabajos.</div>'}</div></section>${footer()}`;
}
function galleryHomeSection(){const items=(state.gallery||[]).filter(x=>String(x.activo??"SI").toUpperCase()!=="NO"&&String(x.visible_publico??"SI").toUpperCase()!=="NO"&&x.image_url).slice(0,6);if(!items.length)return"";return `<section class="section"><div class="section-head compact-head"><div><span class="eyebrow">Galería</span><h2>Trabajos realizados</h2></div><a class="editorial-link" href="#galeria">Ver galería</a></div><div class="public-gallery-grid public-gallery-preview">${items.map(x=>`<a class="public-gallery-card" href="#galeria"><img src="${esc(mediaUrl(x.image_url))}" alt="${esc(x.titulo||"Ale Atencio")}" loading="lazy"><div><small>${esc(x.categoria||"Ale Atencio")}</small><h3>${esc(x.titulo||"")}</h3></div></a>`).join("")}</div></section>`}

function homeView(){
  const cats = state.categories.slice().sort((a,b)=>Number(a.orden||0)-Number(b.orden||0));
  const featured = state.products.filter(p=>String(p.destacado).toUpperCase()==="SI").slice(0,6);
  const offers = state.products.slice().sort((a,b)=>Number(a.precio||0)-Number(b.precio||0)).slice(0,4);
  const visualProducts = state.products.filter(p=>p.image_url).slice(0,6);
  const allVisual = visualProducts.length ? visualProducts : state.products.slice(0,6);
  const primaryVisual = allVisual[0] || state.products[0];
  const giftVisual = state.products.find(p=>slug(p.categoria_nombre||p.categoria)==="regalos") || state.products[0];

  const imgOrFallback = (p,cls="") => p && p.image_url
    ? `<img class="${cls}" src="${esc(mediaUrl(p.image_url))}" alt="${esc(p.nombre||"Ale Atencio")}">`
    : `<div class="visual-fallback ${cls}">${p?productFallback(p):"🧁"}</div>`;

  return `${heroView()}

  <section class="home-intro-strip">
    <div><i class="bi bi-gift"></i><span>Regalos y celebraciones</span></div>
    <div><i class="bi bi-cake2"></i><span>Pedidos personalizados</span></div>
    <div><i class="bi bi-bag-heart"></i><span>Presentación cuidada</span></div>
    <div><i class="bi bi-whatsapp"></i><span>Atención directa</span></div>
  </section>

  ${delicaciesSection()}

  <section class="section home-categories">
    <div class="editorial-heading">
      <span class="eyebrow">Descubre</span>
      <h2>Nuestros favoritos</h2>
    </div>
    <div class="category-visual-grid">
      ${cats.slice(0,5).map((c,i)=>`
        <a class="category-visual-card category-size-${i+1}" href="#productos/${slug(c.nombre)}">
          ${c.image_url
            ? `<img src="${esc(mediaUrl(c.image_url))}" alt="${esc(c.nombre)}">`
            : `<div class="category-visual-fallback">${categoryFallback(i)}</div>`}
          <div class="category-visual-overlay">
            <span>${esc(c.descripcion||"")}</span>
            <h3>${esc(c.nombre)}</h3>
          </div>
        </a>`).join("")}
    </div>
  </section>

  <section class="section corporate-section">
    <div class="corporate-photo">
      ${imgOrFallback(giftVisual,"corporate-img")}
    </div>
    <div class="corporate-copy">
      <span class="eyebrow">Regalos especiales</span>
      <h2>Un detalle dulce siempre se recuerda</h2>
      <p>Preparamos cajas y selecciones para cumpleaños, agradecimientos, empresas y celebraciones.</p>
      <a class="btn btn-primary" href="#solicitud">Solicitar propuesta</a>
    </div>
  </section>

  <section class="section">
    <div class="editorial-heading centered">
      <span class="eyebrow">Los más pedidos</span>
      <h2>Dulces elegidos para compartir</h2>
    </div>
    <div class="products-grid products-home-grid">${featured.map(productCard).join("")}</div>
    <div class="center-action"><a class="editorial-link" href="#productos/todos">Ver todos los productos <i class="bi bi-arrow-right"></i></a></div>
  </section>

  <section class="wide-visual-band">
    <div class="wide-visual-image">
      ${imgOrFallback(primaryVisual,"wide-visual-img")}
    </div>
    <div class="wide-visual-copy">
      <span class="eyebrow">Hecho para celebrar</span>
      <h2>Sabores que acompañan tus mejores momentos</h2>
      <a class="btn btn-light" href="#nosotros">Conócenos</a>
    </div>
  </section>

  <section class="section">
    <div class="section-head compact-head">
      <div><span class="eyebrow">Selección especial</span><h2>Ofertas y favoritos</h2></div>
      <a class="editorial-link" href="#ofertas">Ver promociones</a>
    </div>
    <div class="products-grid products-home-grid">${offers.map(productCard).join("")}</div>
  </section>

  <section class="testimonials-band">
    <div class="section testimonials-inner">
      <div class="editorial-heading centered">
        <span class="eyebrow">Lo que dicen</span>
        <h2>Momentos que se vuelven recuerdos</h2>
      </div>
      <div class="testimonial-grid">
        <article><div class="quote-mark">“</div><p>Hermosa presentación y cada detalle se notaba preparado con muchísimo cariño.</p><strong>Camila R.</strong></article>
        <article><div class="quote-mark">“</div><p>La torta quedó preciosa y el sabor fue increíble. Todos preguntaron dónde la habíamos encargado.</p><strong>Daniela M.</strong></article>
        <article><div class="quote-mark">“</div><p>Pedí una caja para regalo y llegó impecable. Muy delicada y elegante.</p><strong>Francisca P.</strong></article>
      </div>
    </div>
  </section>

  ${galleryHomeSection()}

  <section class="section">
    <div class="section-head compact-head">
      <div><span class="eyebrow">Instagram</span><h2>Un poquito de Ale Atencio</h2></div>
      ${state.config.instagram?`<a class="editorial-link" href="${esc(state.config.instagram)}" target="_blank" rel="noopener">Síguenos <i class="bi bi-instagram"></i></a>`:""}
    </div>
    <div class="instagram-photo-grid">
      ${allVisual.map((p,i)=>`
        <a class="instagram-photo" href="${state.config.instagram?esc(state.config.instagram):"#productos/todos"}" ${state.config.instagram?'target="_blank" rel="noopener"':""}>
          ${p.image_url?`<img src="${esc(mediaUrl(p.image_url))}" alt="${esc(p.nombre)}">`:`<div class="instagram-fallback">${productFallback(p)}</div>`}
          <span><i class="bi bi-instagram"></i></span>
        </a>`).join("")}
    </div>
  </section>

  <section class="section">
    <div class="editorial-heading centered">
      <span class="eyebrow">Ideas dulces</span>
      <h2>Para inspirarte</h2>
    </div>
    <div class="journal-grid">
      <a class="journal-card" href="#productos/tortas">
        <div class="journal-visual">${imgOrFallback(state.products.find(p=>slug(p.categoria_nombre)==="tortas"))}</div>
        <div class="journal-copy"><small>Celebraciones</small><h3>Cómo elegir una torta para un momento especial</h3><span>Ver ideas →</span></div>
      </a>
      <a class="journal-card" href="#productos/regalos">
        <div class="journal-visual">${imgOrFallback(giftVisual)}</div>
        <div class="journal-copy"><small>Regalos</small><h3>Detalles dulces para sorprender</h3><span>Descubrir →</span></div>
      </a>
      <a class="journal-card" href="#solicitud">
        <div class="journal-visual">${imgOrFallback(state.products.find(p=>slug(p.categoria_nombre)==="postres"))}</div>
        <div class="journal-copy"><small>Eventos</small><h3>Ideas para una mesa dulce elegante</h3><span>Solicitar →</span></div>
      </a>
    </div>
  </section>

  <section class="contact-end-band">
    <div class="contact-end-inner">
      <div><span class="eyebrow">Ale Atencio Repostería</span><h2>¿Tienes una idea especial?</h2><p>Cuéntanos qué necesitas y coordinamos contigo cada detalle.</p></div>
      <div class="contact-end-actions">
        <a class="btn btn-primary" href="#solicitud">Hacer solicitud</a>
        <a class="btn btn-light" href="#" onclick="openWhatsApp();return false"><i class="bi bi-whatsapp"></i> WhatsApp</a>
      </div>
    </div>
  </section>

  ${footer()}`;
}

function catalogView(filter="todos"){
  const info=catalogFilterInfo(filter);
  const list = state.products.filter(p=>catalogMatches(p,info.key));
  return `<section class="view-hero"><div class="view-hero-inner"><span class="eyebrow">Catálogo</span><h1>${esc(info.title)}</h1><p>Elige tus favoritos y agrégalos al carrito.</p></div></section>
  <section class="section"><div class="catalog-tools"><input id="catalogSearch" placeholder="Buscar producto..."><select id="catalogSort"><option value="">Orden recomendado</option><option value="low">Precio menor a mayor</option><option value="high">Precio mayor a menor</option></select></div><div class="products-grid" id="catalogGrid">${list.map(productCard).join("")}</div></section>${footer()}`;
}
function titleCase(s){return String(s).split("-").map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" ")}

function offersView(){
  const list=state.products.filter(p=>String(p.destacado).toUpperCase()==="SI");
  return `<section class="view-hero"><div class="view-hero-inner"><span class="eyebrow">Selección especial</span><h1>Promociones y destacados</h1><p>Opciones elegidas para regalar, compartir y celebrar.</p></div></section><section class="section"><div class="products-grid">${list.map(productCard).join("")}</div></section>${footer()}`;
}

function webContent(key,fallback=""){const v=String((state.config||{})[key]??"").trim();return v||fallback}
function webContentHtml(key,fallback=""){return esc(webContent(key,fallback)).replace(/\n/g,"<br>")}
function aboutView(){
  const aboutVisual = state.products.find(p=>slug(p.categoria_nombre||p.categoria)==="tortas") || state.products[0];
  const missionTitle=webContent("web_mission_title","Misión"),visionTitle=webContent("web_vision_title","Visión"),valuesTitle=webContent("web_values_title","Valores");
  return `<section class="view-hero"><div class="view-hero-inner"><span class="eyebrow">Nosotros</span><h1>Ale Atencio Repostería</h1><p>Preparaciones cuidadas, sabores que encantan y detalles pensados para cada ocasión.</p></div></section>
  <section class="section"><div class="story"><div class="story-visual">${aboutVisual && aboutVisual.image_url ? `<img src="${esc(mediaUrl(aboutVisual.image_url))}" alt="${esc(aboutVisual.nombre)}">` : `<div class="story-fallback">🎂</div>`}</div><div class="story-copy"><span class="eyebrow">Hecho para celebrar</span><h2>Momentos dulces</h2><p>Trabajamos cada pedido con dedicación, buscando que el sabor y la presentación se sientan especiales desde el primer momento.</p><a class="btn btn-primary" href="#solicitud">Solicitar pedido</a></div></div></section>
  <section class="section about-principles"><div class="policy-grid"><div class="policy-card"><h3>${esc(missionTitle)}</h3><p>${webContentHtml("web_mission_text","Crear experiencias dulces y memorables mediante productos de repostería preparados con dedicación, calidad y atención personalizada.")}</p></div><div class="policy-card"><h3>${esc(visionTitle)}</h3><p>${webContentHtml("web_vision_text","Ser una repostería reconocida por la confianza, creatividad y excelencia en cada celebración y momento especial.")}</p></div><div class="policy-card values-card"><h3>${esc(valuesTitle)}</h3><p>${webContentHtml("web_values_text","Calidad · Dedicación · Cercanía · Creatividad · Responsabilidad")}</p></div></div></section>${footer()}`;
}

function requestView(){
  return `<section class="view-hero"><div class="view-hero-inner"><span class="eyebrow">Solicitud</span><h1>Cuéntanos qué necesitas</h1><p>Completa los datos y te contactaremos para confirmar disponibilidad y detalles.</p></div></section>
  <section class="section" id="solicitud-formulario"><div class="request-layout">
    <div class="request-card"><span class="eyebrow">Contacto</span><h2>Ale Atencio</h2>
      <div class="contact-line"><strong>WhatsApp</strong><span>${esc(state.config.whatsapp||"")}</span></div>
      <div class="contact-line"><strong>Correo</strong><span>${esc(state.config.email||"")}</span></div>
      <div class="contact-line"><strong>Dirección / retiro</strong><span>${esc(state.config.direccion||"Coordinación previa")}</span></div>
      ${socialIcons()}
    </div>
    <form class="request-form" id="requestForm"><span class="eyebrow">Cotización</span><h2>Formulario de solicitud</h2>
      <div class="form-grid">
        <input id="rqName" placeholder="Nombre completo" required><input id="rqRut" placeholder="RUT (ej: 12.345.678-5)" inputmode="text" autocomplete="off" required>
        <input id="rqPhone" placeholder="WhatsApp" required><input id="rqEmail" type="email" placeholder="Correo">
        <input id="rqDate" type="date">
        <select id="rqType" required><option value="">Tipo de solicitud</option><option>Torta personalizada</option><option>Galletas</option><option>Postres para evento</option><option>Box regalo</option><option>Cotización general</option></select>
        <input id="rqQty" placeholder="Cantidad / personas"><textarea id="rqMessage" class="span-2" placeholder="Cuéntanos sabores, colores, temática, tamaño y otros detalles"></textarea><div class="request-pay-choice span-2"><span>Medio de pago preferido</span><div class="request-pay-circles"><button type="button" class="request-pay-circle active" data-request-pay="TRANSFERENCIA"><i class="bi bi-bank"></i><small>Transferencia</small></button><button type="button" class="request-pay-circle" data-request-pay="TRANSBANK"><i class="bi bi-credit-card-2-front"></i><small>Tarjeta</small></button></div><input type="hidden" id="rqPayment" value="TRANSFERENCIA"></div>
      </div><button class="btn btn-primary" type="submit">Enviar solicitud</button>
    </form>
  </div></section>${footer()}`;
}

function sharedQuoteRoute(){const raw=location.hash.replace(/^#cotizacion\/?/,"")||"",q=raw.indexOf("?");return{numero:decodeURIComponent(q>=0?raw.slice(0,q):raw),params:new URLSearchParams(q>=0?raw.slice(q+1):"")}}
function sharedRequestRoute(){const raw=location.hash.replace(/^#solicitud\/?/,"")||"",q=raw.indexOf("?");return{numero:decodeURIComponent(q>=0?raw.slice(0,q):raw),params:new URLSearchParams(q>=0?raw.slice(q+1):"")}}
function sharedQuoteView(){return `<section class="view-hero"><div class="view-hero-inner"><span class="eyebrow">Cotización digital</span><h1>Tu cotización Ale Atencio</h1><p>Este enlace público no expone direcciones internas del servidor.</p></div></section><section class="section"><div class="public-share-card" id="publicQuoteCard"><div class="public-share-loading">Cargando cotización…</div></div></section>${footer()}`}
function sharedRequestView(){return `<section class="view-hero"><div class="view-hero-inner"><span class="eyebrow">Solicitud</span><h1>Seguimiento de solicitud</h1><p>Consulta el estado de tu solicitud mediante un enlace seguro.</p></div></section><section class="section"><div class="public-share-card" id="publicRequestCard"><div class="public-share-loading">Cargando solicitud…</div></div></section>${footer()}`}
function publicRequestStatusLabel(v){const x=String(v||"").toUpperCase();return({NUEVA:"Recibida",CONTACTADA:"Contactada",COTIZADA:"Cotizada",ACEPTADA:"Aceptada",CERRADA:"Cerrada"})[x]||x||"Recibida"}
async function wireSharedQuote(){const host=$("#publicQuoteCard");if(!host)return;const r=sharedQuoteRoute(),qid=r.params.get("qid")||"",qt=r.params.get("qt")||"";try{const out=await AleAPI.postPublic("publicquote",{quote_id:qid,quote_token:qt}),q=out.quote||{},items=Array.isArray(q.items)?q.items:[];host.innerHTML=`<div class="public-share-head"><div><span class="eyebrow">Cotización</span><h2>${esc(q.numero_cotizacion||r.numero||"")}</h2><small>${q.numero_solicitud?`Solicitud ${esc(q.numero_solicitud)}`:""}</small></div><span class="public-share-state">${esc(q.estado||"")}</span></div><div class="public-share-meta"><div><span>Cliente</span><strong>${esc(q.cliente_nombre||"Cliente")}</strong></div><div><span>Validez</span><strong>${Number(q.validez_dias||0)} días</strong></div></div><div class="public-share-items">${items.map(i=>`<div><span>${esc(i.descripcion||i.nombre||"Producto")} × ${Number(i.cantidad||0)}</span><strong>${money(i.total??Number(i.cantidad||0)*Number(i.precio_unitario||0))}</strong></div>`).join("")}</div><div class="public-share-totals"><div><span>Subtotal</span><strong>${money(q.subtotal)}</strong></div><div><span>IVA ${Number(q.iva_porcentaje||0)}%</span><strong>${money(q.iva)}</strong></div><div class="total"><span>Total</span><strong>${money(q.total)}</strong></div></div>${q.observaciones?`<div class="public-share-note"><strong>Observaciones</strong><p>${esc(q.observaciones)}</p></div>`:""}<div class="public-share-actions"><button class="btn btn-primary" type="button" id="printSharedQuote"><i class="bi bi-file-earmark-pdf"></i> Imprimir / guardar PDF</button><a class="btn btn-light" href="#inicio">Volver a la tienda</a></div>`;$("#printSharedQuote")?.addEventListener("click",()=>window.print())}catch(err){console.warn(err);host.innerHTML='<div class="empty-card">El enlace de la cotización no es válido o ya no está disponible.</div>'}}
async function wireSharedRequest(){const host=$("#publicRequestCard");if(!host)return;const r=sharedRequestRoute(),rid=r.params.get("rid")||"",rt=r.params.get("rt")||"";try{const out=await AleAPI.postPublic("publicrequest",{request_id:rid,request_token:rt}),q=out.request||{};host.innerHTML=`<div class="public-share-head"><div><span class="eyebrow">Solicitud</span><h2>${esc(q.numero_solicitud||r.numero||"")}</h2><small>${q.fecha?esc(new Date(q.fecha).toLocaleString("es-CL")):""}</small></div><span class="public-share-state">${esc(publicRequestStatusLabel(q.estado))}</span></div><div class="public-share-meta"><div><span>Cliente</span><strong>${esc(q.nombre||"Cliente")}</strong></div><div><span>Tipo</span><strong>${esc(q.tipo||"Por coordinar")}</strong></div><div><span>Evento</span><strong>${esc(q.fecha_evento||"Por coordinar")}</strong></div><div><span>Pago preferido</span><strong>${esc(q.medio_pago_preferido||"Por coordinar")}</strong></div></div>${q.cantidad?`<div class="public-share-note"><strong>Cantidad / personas</strong><p>${esc(q.cantidad)}</p></div>`:""}${q.detalle?`<div class="public-share-note"><strong>Detalle</strong><p>${esc(q.detalle)}</p></div>`:""}<div class="public-share-actions"><a class="btn btn-light" href="#inicio">Volver a la tienda</a></div>`}catch(err){console.warn(err);host.innerHTML='<div class="empty-card">El enlace de la solicitud no es válido o ya no está disponible.</div>'}}

function policiesView(){
  const cards=[["web_policy_privacy_title","Privacidad","web_policy_privacy_text","Los datos entregados se utilizan para gestionar solicitudes, pedidos y coordinación de entrega."],["web_policy_custom_title","Pedidos personalizados","web_policy_custom_text","Valores, disponibilidad y tiempos pueden variar según diseño, tamaño, ingredientes y fecha solicitada."],["web_policy_delivery_title","Despacho y retiro","web_policy_delivery_text","El costo y disponibilidad de despacho se confirma al coordinar el pedido. El retiro se agenda previamente."],["web_policy_changes_title","Cambios","web_policy_changes_text","Al tratarse de alimentos y productos personalizados, cualquier incidencia se revisa directamente para buscar una solución adecuada."]];
  return `<section class="view-hero"><div class="view-hero-inner"><span class="eyebrow">Información</span><h1>Políticas</h1><p>Condiciones importantes para coordinar tu pedido.</p></div></section><section class="section"><div class="policy-grid">${cards.map(([tk,td,xk,xd])=>`<div class="policy-card"><h3>${esc(webContent(tk,td))}</h3><p>${webContentHtml(xk,xd)}</p></div>`).join("")}</div></section>${footer()}`;
}

function socialLink(platform){return String((state.config||{})[platform]||"").trim()}
function openSocial(platform){const url=socialLink(platform);if(!url){toast(`${platform.charAt(0).toUpperCase()+platform.slice(1)} aún no está configurado en el cPanel.`);return false}window.open(url,"_blank","noopener");return true}
window.openSocial=openSocial;
function socialIcons(){
  const items=[
    `<a class="social-icon whatsapp" href="#" onclick="openWhatsApp();return false" title="WhatsApp" aria-label="WhatsApp"><i class="bi bi-whatsapp"></i></a>`,
    `<a class="social-icon instagram" href="#" onclick="openSocial('instagram');return false" title="Instagram" aria-label="Instagram"><i class="bi bi-instagram"></i></a>`,
    `<a class="social-icon facebook" href="#" onclick="openSocial('facebook');return false" title="Facebook" aria-label="Facebook"><i class="bi bi-facebook"></i></a>`,
    `<a class="social-icon tiktok" href="#" onclick="openSocial('tiktok');return false" title="TikTok" aria-label="TikTok"><i class="bi bi-tiktok"></i></a>`
  ];
  return `<div class="social-row" style="margin-top:20px">${items.join("")}</div>`;
}
function syncSocialButtons(){
  const map={instagram:"instagramFloat",facebook:"facebookFloat",tiktok:"tiktokFloat"};
  Object.entries(map).forEach(([platform,id])=>{const el=document.getElementById(id);if(!el)return;const url=socialLink(platform);el.classList.toggle("is-unconfigured",!url);el.href=url||"#";el.onclick=e=>{e.preventDefault();openSocial(platform)}});
}



let assistedCheckout=null;
function paymentRouteData(){
  const raw=location.hash.replace(/^#pago\/?/,"")||"",qPos=raw.indexOf("?"),path=qPos>=0?raw.slice(0,qPos):raw,params=new URLSearchParams(qPos>=0?raw.slice(qPos+1):"");
  const parts=path.split("/").filter(Boolean).map(x=>{try{return decodeURIComponent(x)}catch(_){return x}});
  return{numero:parts[0]||"",paymentToken:parts[1]||params.get("pt")||"",params};
}
async function loadAssistedCheckout(){
  const r=paymentRouteData(),oid=r.params.get("oid")||"",ct=r.params.get("ct")||"",pl=r.params.get("pl")||"",pt=r.paymentToken||"";
  if(!pt&&(!oid||!ct))throw new Error("ENLACE_PAGO_INCOMPLETO");
  const payload=pt?{payment_token:pt}:{order_id:oid,checkout_token:ct,payment_link_id:pl};
  let out=null,lastErr=null;
  for(let attempt=0;attempt<2;attempt++){
    try{out=await AleAPI.postPublic("publicordercheckout",payload);break}catch(err){lastErr=err;const code=String(err?.message||err||"").toUpperCase();if(attempt===0&&["API_TIMEOUT","API_CONEXION_FALLIDA","HTTP_502","HTTP_503","HTTP_504"].some(x=>code.includes(x))){await new Promise(r=>setTimeout(r,450));continue}throw err}
  }
  if(!out)throw lastErr||new Error("PEDIDO_CHECKOUT_SIN_RESPUESTA");
  const resolvedOid=out.order_id||out.order?.id||oid,resolvedToken=out.checkout_token||pt||ct,resolvedLink=out.payment_link_id||pl||"";
  assistedCheckout={...out,order_id:resolvedOid,checkout_token:resolvedToken,payment_link_id:resolvedLink};
  cart=(out.items||[]).map((i,n)=>{let id=i.producto_id||i.id||`assist-${n}-${resolvedOid}`,sizeId=i.tamano_id||"",sizeName=i.tamano_nombre||"",linePrice=Number(i.precio_unitario||i.precio||0);if(!state.products.some(p=>String(p.id)===String(id)))state.products.push({id,nombre:i.producto_nombre||i.nombre||"Producto",precio:linePrice,activo:true,image_url:"",categoria_nombre:"Pedido",tamanos:sizeName?[{id:sizeId||`assist-size-${n}`,nombre:sizeName,precio:linePrice,activo:"SI",orden:1}]:[]});return{id,tamano_id:sizeId,tamano_nombre:sizeName,precio:linePrice,qty:Number(i.cantidad||1),assisted:true}});saveCart();return assistedCheckout;
}
function fillAssistedCheckoutForm(order={}){
  const setValue=(selector,value)=>{const el=$(selector);if(el)el.value=String(value??"")};
  setValue("#coName",order.nombre||"");
  setValue("#coRut",order.rut?formatRutInput(order.rut):"");
  setValue("#coPhone",order.telefono||"");
  setValue("#coEmail",order.email||"");
  setValue("#coAddress",[order.direccion,order.comuna].filter(Boolean).join(" · "));
  const method=$("#coMethod"),delivery=String(order.metodo_entrega||"").toUpperCase();
  if(method)method.value=delivery.includes("DESPACH")?"Despacho":"Retiro";
  setValue("#coNotes",order.observaciones||"");
}
async function openAssistedPayment(){
  let out;
  try{out=await loadAssistedCheckout()}catch(err){
    console.warn("ASSISTED_PAYMENT_LOAD",err);
    const code=String(err?.message||err||"").toUpperCase();
    const msg=code.includes("ENLACE_PAGO_VENCIDO")?"Este enlace de pago venció. Solicita un nuevo enlace para el mismo pedido.":code.includes("PEDIDO_YA_PAGADO")?"Este pedido ya figura como pagado.":code.includes("ENLACE_PAGO_REVOCADO")?"Este enlace fue reemplazado por uno más reciente. Solicita el último enlace de pago.":code.includes("ENLACE_PAGO_INVALIDO")||code.includes("TOKEN_CHECKOUT_INVALIDO")||code.includes("ENLACE_PAGO_INCOMPLETO")||code.includes("PEDIDO_TOKEN_CHECKOUT_REQUERIDO")?"El enlace de pago está incompleto o no es válido.":code.includes("PEDIDO_NO_ENCONTRADO")?"No se encontró el pedido asociado a este enlace.":"No fue posible cargar el pedido para pago. Intenta nuevamente.";
    toast(msg,"error");return;
  }
  const o=out?.order||{};
  try{
    openCart();updateCartUI();openModal("#checkoutModal");
    fillAssistedCheckoutForm(o);
    checkoutPaymentIntent="TRANSBANK";syncPaymentUI();
    const btn=$("#submitOrderBtn");if(btn)btn.textContent="Continuar al pago";
    if(!o.rut||!o.telefono)toast("El pedido se cargó, pero faltan datos de contacto. Revisa el pedido en cPanel.","info");
  }catch(err){
    console.warn("ASSISTED_PAYMENT_UI",err);
    toast("El pedido fue encontrado, pero no fue posible completar automáticamente el formulario. Intenta recargar la página.","error");
  }
}

const TRACKING_STORE_KEY="aleAtencioTrackingCredentialsV1";
function trackingStore(){try{const v=JSON.parse(localStorage.getItem(TRACKING_STORE_KEY)||"{}");return v&&typeof v==="object"?v:{}}catch(_){return{}}}
function rememberTracking(orderId,orderNumber,trackingToken,trackingUrl,pdfUrl=""){
  if(!trackingToken)return;const store=trackingStore();const row={order_id:String(orderId||""),numero_pedido:String(orderNumber||""),tracking_token:String(trackingToken),tracking_url:String(trackingUrl||""),pdf_url:String(pdfUrl||""),saved_at:new Date().toISOString()};
  if(row.order_id)store[row.order_id]=row;if(row.numero_pedido)store[row.numero_pedido]=row;localStorage.setItem(TRACKING_STORE_KEY,JSON.stringify(store));
}
function trackingCredential(ref){const store=trackingStore();return store[String(ref||"")]||null}
function trackingHash(number){return `#seguimiento/${encodeURIComponent(String(number||""))}`}
function statusLabel(v){const s=String(v||"").toUpperCase();return({PENDIENTE:"Pedido recibido",CONFIRMADO:"Pedido aceptado","EN PREPARACION":"En preparación",LISTO:"Listo para entrega",ENTREGADO:"Entregado",CANCELADO:"Cancelado"})[s]||s||"Pedido recibido"}
function paymentLabel(v){const s=String(v||"PENDIENTE").toUpperCase();return({PENDIENTE:"Pendiente",INICIADO:"Pago iniciado",PAGADO:"Pagado",RECHAZADO:"Rechazado",CANCELADO:"Cancelado",VERIFICACION_PENDIENTE:"Verificación pendiente",CREDITO_PENDIENTE:"Crédito pendiente"})[s]||s}
function canonicalPaymentMethodClient(v){const s=String(v||"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");if(!s)return"";if(s.includes("TRANSFER"))return"TRANSFERENCIA";if(s.includes("TRANSBANK")||s.includes("TARJETA")||s.includes("WEBPAY")||s.includes("CARD"))return"TRANSBANK";if(s.includes("EFECTIVO")||s.includes("CASH"))return"EFECTIVO";return s}
function isTransferPayment(v){return canonicalPaymentMethodClient(v)==="TRANSFERENCIA"}
function isFinalTrackingOrder(o){return ["ENTREGADO","CANCELADO"].includes(String(o?.estado||"").toUpperCase())}
const trackingProofFiles=new Map();
function transferProofBlock(o){
  if(!isTransferPayment(o?.medio_pago))return"";
  const pay=String(o?.estado_pago||"").toUpperCase(),proof=String(o?.comprobante_pago_estado||"").toUpperCase(),final=isFinalTrackingOrder(o);
  if(pay==="PAGADO"||proof==="APROBADO")return `<div class="tracking-transfer-box verified"><div class="tracking-transfer-icon"><i class="bi bi-check-circle-fill"></i></div><div><span class="eyebrow">Transferencia</span><h4>Pago verificado</h4><p>Tu comprobante ya fue revisado y el pago está confirmado.</p></div></div>`;
  if(final)return `<div class="tracking-transfer-box locked"><div class="tracking-transfer-icon"><i class="bi bi-lock-fill"></i></div><div><span class="eyebrow">Transferencia</span><h4>Pedido finalizado</h4><p>Este pedido ya no admite nuevos comprobantes.</p></div></div>`;
  if(o?.comprobante_pago_cargado&&proof!=="RECHAZADO")return `<div class="tracking-transfer-box pending"><div class="tracking-transfer-icon"><i class="bi bi-hourglass-split"></i></div><div><span class="eyebrow">Transferencia</span><h4>Comprobante enviado</h4><p>Está pendiente de verificación por Ale Atencio.${o?.comprobante_pago_fecha?` Enviado el ${esc(new Date(o.comprobante_pago_fecha).toLocaleString("es-CL"))}.`:""}</p></div></div>`;
  const rejected=proof==="RECHAZADO";
  return `<div class="tracking-transfer-box upload"><div class="tracking-transfer-icon"><i class="bi bi-bank"></i></div><div class="tracking-transfer-content"><span class="eyebrow">Transferencia bancaria</span><h4>${rejected?"Vuelve a cargar tu comprobante":"Adjunta tu comprobante de pago"}</h4><p>${rejected?"El comprobante anterior requiere una nueva imagen.":"Carga una foto clara del comprobante para que podamos verificar tu transferencia."}</p><div class="tracking-proof-controls"><label class="btn btn-light tracking-proof-picker"><i class="bi bi-image"></i><span>Seleccionar imagen</span><input type="file" hidden accept="image/jpeg,image/png,image/webp" data-transfer-proof-input="${esc(o.id)}"></label><div class="tracking-proof-preview hidden" data-transfer-proof-preview="${esc(o.id)}"><img alt="Vista previa del comprobante"><div><strong>Comprobante seleccionado</strong><small></small><button type="button" class="btn btn-primary" data-transfer-proof-send="${esc(o.id)}"><i class="bi bi-cloud-arrow-up"></i> Enviar comprobante</button></div></div></div></div></div>`;
}
function trackingTimeline(order){
  const status=String(order.estado||"PENDIENTE").toUpperCase(),paid=String(order.estado_pago||"").toUpperCase()==="PAGADO";
  const rank={PENDIENTE:0,CONFIRMADO:1,"EN PREPARACION":2,LISTO:3,ENTREGADO:4,CANCELADO:-1};const current=rank[status]??0;
  const steps=[
    {label:"Pedido recibido",done:true,meta:order.fecha?new Date(order.fecha).toLocaleString("es-CL"):""},
    {label:"Pago confirmado",done:paid,meta:paid&&order.fecha_pago?new Date(order.fecha_pago).toLocaleString("es-CL"):""},
    {label:"En preparación",done:current>=2,meta:""},
    {label:"Listo para entrega",done:current>=3,meta:""},
    {label:"Entregado",done:current>=4,meta:""}
  ];
  const activeIndex=status==="CANCELADO"?-1:(current>=4?4:current>=3?3:current>=2?2:paid?1:0);
  return `<div class="tracking-progress" aria-label="Línea de tiempo del pedido"><div class="tracking-progress-title"><i class="bi bi-clock-history"></i><span>Seguimiento del pedido</span></div><div class="tracking-timeline">${steps.map((x,i)=>`<div class="tracking-step ${x.done?"done":""} ${i===activeIndex?"current":""}"><span class="tracking-step-dot" aria-hidden="true">${x.done?'<i class="bi bi-check-lg"></i>':''}</span><div class="tracking-step-copy"><strong>${esc(x.label)}</strong>${x.meta?`<small>${esc(x.meta)}</small>`:""}</div></div>`).join("")}</div></div>`;
}
function trackingRouteData(){
  const raw=location.hash.replace(/^#seguimiento\/?/,"")||"",qPos=raw.indexOf("?");
  const ref=decodeURIComponent(qPos>=0?raw.slice(0,qPos):raw);const params=new URLSearchParams(qPos>=0?raw.slice(qPos+1):"");
  return{ref,token:params.get("t")||""};
}
function trackingView(){
  const route=trackingRouteData();
  return `<section class="view-hero tracking-hero"><div class="view-hero-inner"><span class="eyebrow">Seguimiento</span><h1>Consulta tu pedido</h1><p>Revisa el estado de tu compra de forma rápida y segura.</p></div></section>
  <section class="section tracking-section">
    <div class="tracking-search-card">
      <div class="tracking-search-heading"><span class="tracking-search-icon"><i class="bi bi-box-seam"></i></span><div><span class="eyebrow">Estado en línea</span><h2>¿Dónde va mi pedido?</h2><p>Consulta el avance, el estado del pago y la entrega en un solo lugar.</p></div></div>
      <div class="tracking-security-note"><span class="tracking-security-icon"><i class="bi bi-shield-check"></i></span><div><strong>Consulta protegida</strong><span>Puedes escribir tu RUT con o sin puntos y guion. También puedes usar tu número de pedido. Si entras sin el enlace privado de compra, te pediremos el teléfono registrado para validar tu identidad.</span></div></div>
      <form id="trackingForm" class="tracking-form">
        <label class="tracking-field"><span>RUT o N.º de pedido</span><div class="tracking-input-wrap"><i class="bi bi-search"></i><input id="trackingQuery" value="${esc(route.ref)}" placeholder="Ej. 123456789, 12.345.678-9 o PED-000012" autocomplete="off"></div></label>
        <label class="tracking-field"><span>Teléfono de compra</span><div class="tracking-input-wrap"><i class="bi bi-telephone"></i><input id="trackingPhone" inputmode="tel" placeholder="Solo si se solicita verificación" autocomplete="tel"></div></label>
        <button class="btn btn-primary tracking-submit" type="submit"><i class="bi bi-arrow-right-circle"></i><span>Consultar pedido</span></button>
      </form>
      <div id="trackingMessage" class="tracking-message" aria-live="polite"></div>
    </div>
    <div id="trackingResults" class="tracking-results"></div>
  </section>${footer()}`;
}
function renderTrackingResults(orders){
  const host=$("#trackingResults");if(!host)return;if(!orders?.length){host.innerHTML='<div class="empty-card">No encontramos pedidos con esos datos.</div>';return}
  orders.forEach(o=>{try{const raw=String(o.tracking_url||"").split("#")[1]||"",q=raw.indexOf("?");const params=new URLSearchParams(q>=0?raw.slice(q+1):"");const t=params.get("t")||"";if(t)rememberTracking(o.id,o.numero_pedido,t,o.tracking_url,o.pdf_url||"")}catch(_){}});
  host.innerHTML=orders.map(o=>{const cred=trackingCredential(o.numero_pedido)||trackingCredential(o.id);const pdf=o.pdf_url||(cred?.pdf_url||"");return `<article class="tracking-order-card"><div class="tracking-order-head"><div><span class="eyebrow">Pedido</span><h3>${esc(o.numero_pedido||o.id)}</h3><small>${esc(o.fecha?new Date(o.fecha).toLocaleString("es-CL"):"")}</small></div><div class="tracking-total"><small>Total</small><strong>${money(o.total)}</strong></div></div><div class="tracking-status-grid"><div><span>Pago</span><strong class="tracking-pill payment-${esc(String(o.estado_pago||"pendiente").toLowerCase().replace(/[^a-z0-9]+/g,"-"))}">${esc(paymentLabel(o.estado_pago))}</strong>${o.medio_pago?`<small>${esc(canonicalPaymentMethodClient(o.medio_pago))}</small>`:""}</div><div><span>Pedido</span><strong>${esc(o.estado_label||statusLabel(o.estado))}</strong></div><div><span>Entrega</span><strong>${esc(o.metodo_entrega||"Por coordinar")}</strong></div></div>${trackingTimeline(o)}${transferProofBlock(o)}<div class="tracking-actions">${pdf?`<a class="btn btn-light" href="${esc(pdf)}" target="_blank" rel="noopener"><i class="bi bi-file-earmark-pdf"></i> Descargar PDF</a>`:""}<button class="btn btn-light" type="button" data-copy-tracking="${esc(o.tracking_url||location.origin+location.pathname+trackingHash(o.numero_pedido))}"><i class="bi bi-link-45deg"></i> Copiar seguimiento</button></div></article>`}).join("");
  host.querySelectorAll("[data-copy-tracking]").forEach(b=>b.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(b.dataset.copyTracking);toast("Enlace de seguimiento copiado","success")}catch(_){toast("No fue posible copiar el enlace","error")}}));
  wireTrackingTransferProofs();
}
function wireTrackingTransferProofs(){
  document.querySelectorAll("[data-transfer-proof-input]").forEach(input=>input.addEventListener("change",()=>{
    const file=input.files?.[0],orderId=input.dataset.transferProofInput;if(!file||!orderId)return;
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type)){toast("Selecciona una imagen JPG, PNG o WEBP.","error");input.value="";return}
    if(file.size>8*1024*1024){toast("La imagen supera 8 MB.","error");input.value="";return}
    trackingProofFiles.set(orderId,file);const preview=document.querySelector(`[data-transfer-proof-preview="${CSS.escape(orderId)}"]`);if(!preview)return;const img=preview.querySelector("img"),small=preview.querySelector("small");if(img){if(img.dataset.objectUrl)URL.revokeObjectURL(img.dataset.objectUrl);const url=URL.createObjectURL(file);img.src=url;img.dataset.objectUrl=url}if(small)small.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;preview.classList.remove("hidden");
  }));
  document.querySelectorAll("[data-transfer-proof-send]").forEach(btn=>btn.addEventListener("click",()=>{const orderId=btn.dataset.transferProofSend,file=trackingProofFiles.get(orderId);if(!file)return toast("Selecciona primero la imagen del comprobante.","error");uploadTransferProofFile(orderId,file,btn)}));
}

async function lookupTracking(query,phone=""){
  const q=String(query||"").trim();if(!q)return;const rutCandidate=normalizeRut(q);const queryValue=isValidRut(rutCandidate)?rutCandidate:q;const cred=trackingCredential(q)||trackingCredential(queryValue),route=trackingRouteData();const payload={query:queryValue};const routeToken=route.ref===q||route.ref===queryValue?route.token:"";if(routeToken)payload.tracking_token=routeToken;else if(cred?.tracking_token)payload.tracking_token=cred.tracking_token;if(phone)payload.verify_phone=String(phone).trim();
  const msg=$("#trackingMessage"),host=$("#trackingResults");if(msg)msg.textContent="Consultando pedido…";if(host)host.innerHTML='<div class="tracking-loading"><span></span> Consultando...</div>';
  try{const out=await AleAPI.postPublic("trackorder",payload);renderTrackingResults(out?.orders||[]);if(msg)msg.textContent=out?.count?`${out.count} pedido${out.count===1?"":"s"} encontrado${out.count===1?"":"s"}.`:out?.needs_verification?"Para proteger tus datos, ingresa el teléfono usado en la compra.":"Sin resultados."}catch(err){console.warn("TRACK_ORDER",err);if(msg)msg.textContent="No fue posible consultar en este momento.";if(host)host.innerHTML=""}
}
function wireTracking(){const form=$("#trackingForm"),input=$("#trackingQuery"),phone=$("#trackingPhone");if(!form)return;if(input){input.addEventListener("blur",()=>{const raw=input.value.trim();if(raw&&isValidRut(raw))input.value=formatRutInput(raw)});input.addEventListener("input",()=>{input.classList.toggle("rut-detected",isValidRut(input.value))})}form.addEventListener("submit",e=>{e.preventDefault();lookupTracking(input?.value,phone?.value)});if(input?.value)setTimeout(()=>lookupTracking(input.value,phone?.value),120)}

function footer(){
  const c=state.config;
  return `<footer class="site-footer"><div class="footer-inner"><div class="footer-grid">
    <div class="footer-brand-block"><img class="footer-logo" src="${esc(c.logo_url||"logo-ale-atencio.png")}" alt="Ale Atencio"><p>Tortas, galletas, postres y regalos preparados para tus momentos especiales.</p>${socialIcons()}</div>
    <div class="footer-shop-block"><div class="footer-title">Tienda</div><div class="footer-links"><a href="#inicio">Inicio</a><a href="#productos/tortas">Tortas</a><a href="#productos/galletas">Galletas</a><a href="#productos/postres">Postres</a><a href="#productos/regalos">Regalos</a></div></div>
    <div class="footer-help-block"><div class="footer-title">Ayuda</div><div class="footer-links"><a href="#seguimiento">Consulta tu pedido</a><a href="#solicitud">Solicitud</a><a href="#politicas">Políticas</a><a href="#politicas">Despachos</a><a href="#politicas">Cambios</a></div></div>
    <div class="footer-contact-block"><div class="footer-title">Contacto</div><div class="footer-links">${normalizePhone(c.whatsapp)?`<a href="#" onclick="openWhatsApp();return false">${esc(c.whatsapp)}</a>`:""}${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:""}${c.direccion?`<span>${esc(c.direccion)}</span>`:""}</div></div>
  </div><div class="footer-line"></div><div class="footer-bottom"><span>© 2026 Ale Atencio Repostería</span><div class="footer-policies"><a href="#politicas">Privacidad</a><a href="#politicas">Términos</a><a href="#politicas">Despacho</a></div></div><div class="developer-credit" aria-label="Créditos de desarrollo"><span>Design by</span> <a href="https://serviciosinformaticosas.cl/" target="_blank" rel="noopener noreferrer">SERVICIOS INFORMÁTICOS AS</a><span class="developer-credit-sep">·</span><span>Desarrollo Web, Sistemas y Android</span></div></div></footer>`;
}

function focusRequestForm(){
  const target=$("#solicitud-formulario");
  if(!target)return;
  requestAnimationFrame(()=>target.scrollIntoView({block:"start",behavior:"smooth"}));
}

// R9.18.28 · Primer enfoque útil por vista.
// El header permanece fijo, pero al navegar no mostramos el hero intermedio: aterrizamos
// directamente en el bloque que el cliente necesita usar, tal como en la referencia visual.
function publicViewFocusTarget(hash=""){
  const route=String(hash||location.hash||"").replace(/^#/,"");
  if(!route||route==="inicio")return null;
  if(route==="solicitud")return $("#solicitud-formulario");
  if(route.startsWith("seguimiento"))return $(".tracking-section");
  if(route.startsWith("solicitud/")||route.startsWith("cotizacion/"))return $("#app > .section");
  if(route.startsWith("productos/")||route==="ofertas"||route==="nosotros"||route==="galeria"||route==="politicas")return $("#app > .section");
  return null;
}
function showPublicViewFocus(hash="",behavior="auto"){
  const route=String(hash||location.hash||"").replace(/^#/,"");
  const target=publicViewFocusTarget(route);
  const run=()=>{
    if(!target){window.scrollTo({top:0,left:0,behavior});return}
    const header=$(".site-header");
    const headerH=Math.round(header?.getBoundingClientRect().height||header?.offsetHeight||82);
    // Un pequeño aire evita que el borde de la tarjeta quede pegado al header.
    const gap=route.startsWith("seguimiento")?36:6;
    const y=Math.max(0,Math.round(window.scrollY+target.getBoundingClientRect().top-headerH-gap));
    window.scrollTo({top:y,left:0,behavior});
  };
  requestAnimationFrame(()=>requestAnimationFrame(run));
}
function render(){
  const hash=location.hash.replace("#","")||"inicio";
  if(hash==="inicio") $("#app").innerHTML=homeView();
  else if(hash.startsWith("productos/")) $("#app").innerHTML=catalogView(hash.split("/")[1]||"todos");
  else if(hash==="ofertas") $("#app").innerHTML=offersView();
  else if(hash==="nosotros") $("#app").innerHTML=aboutView();
  else if(hash==="solicitud") $("#app").innerHTML=requestView();
  else if(hash.startsWith("solicitud/")) $("#app").innerHTML=sharedRequestView();
  else if(hash.startsWith("cotizacion/")) $("#app").innerHTML=sharedQuoteView();
  else if(hash.startsWith("seguimiento")) $("#app").innerHTML=trackingView();
  else if(hash==="galeria") $("#app").innerHTML=galleryView();
  else if(hash==="politicas") $("#app").innerHTML=policiesView();
  else $("#app").innerHTML=homeView();
  showPublicViewFocus(hash,"auto");
  closeMobile(); wireCarousel(); wireCatalog(); wireRequest(); wireTracking(); wireSharedQuote(); wireSharedRequest();
}

function wireCarousel(){
  const slides=$$(".hero-slide"), dots=$$(".hero-dot"), stage=$(".hero-stage");
  if(!slides.length)return;

  // R9.14.2: el primer cuadro siempre nace en posición 0. Esto evita que un
  // índice conservado de un render anterior produzca un salto visual.
  currentSlide=0;
  const show=i=>{
    currentSlide=(i+slides.length)%slides.length;
    slides.forEach((s,x)=>s.classList.toggle("active",x===currentSlide));
    dots.forEach((d,x)=>d.classList.toggle("active",x===currentSlide));
  };
  show(0);

  const start=()=>{ clearInterval(slideTimer); slideTimer=setInterval(()=>show(currentSlide+1),5000); };
  const reset=()=>start();
  $("#prevSlide")?.addEventListener("click",()=>{show(currentSlide-1);reset()});
  $("#nextSlide")?.addEventListener("click",()=>{show(currentSlide+1);reset()});
  dots.forEach((d,i)=>d.addEventListener("click",()=>{show(i);reset()}));

  // No revelamos el hero hasta que la primera imagen de fondo esté decodificada.
  // Si falla o demora demasiado, se libera igual para no bloquear la portada.
  const reveal=()=>{
    if(!stage || stage.classList.contains("hero-ready")) return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      stage.classList.remove("hero-preparing");
      stage.classList.add("hero-ready");
      start();
    }));
  };
  const firstBg=slides[0]?.querySelector(".hero-bg");
  const src=firstBg?.dataset?.bg || "";
  if(!stage){ start(); return; }
  if(!src){ reveal(); return; }
  const preload=new Image();
  let released=false;
  const done=()=>{ if(released)return; released=true; reveal(); };
  preload.decoding="async";
  preload.onload=done;
  preload.onerror=done;
  preload.src=src;
  if(preload.complete) done();
  else setTimeout(done,1400);
}

function wireCatalog(){
  const input=$("#catalogSearch"), sort=$("#catalogSort"); if(!input)return;
  const filter=location.hash.replace("#productos/","")||"todos";
  const base=state.products.filter(p=>catalogMatches(p,filter));
  const redraw=()=>{const q=normalizeText(input.value);let list=base.filter(p=>productSearchText(p).includes(q));if(sort.value==="low")list.sort((a,b)=>productSortPrice(a)-productSortPrice(b));if(sort.value==="high")list.sort((a,b)=>productSortPrice(b)-productSortPrice(a));$("#catalogGrid").innerHTML=list.length?list.map(productCard).join(""):'<div class="empty-card">No encontramos productos.</div>'}
  input.addEventListener("input",redraw);sort.addEventListener("change",redraw);
}

function clientRecordId(prefix){
  const rnd = (window.crypto?.getRandomValues) ? Array.from(crypto.getRandomValues(new Uint32Array(2))).map(n=>n.toString(36)).join("") : Math.random().toString(36).slice(2,12);
  return `${prefix}-WEB-${Date.now().toString(36).toUpperCase()}-${rnd.slice(0,10).toUpperCase()}`;
}

async function sendAndConfirm(action, type, data){
  // R9.18.76: solo verificamos por ID cuando hubo un fallo realmente ambiguo de transporte.
  // Si el servidor respondió con un error funcional/BD, se conserva ese error exacto y no
  // se transforma en el mensaje genérico "registro no confirmado".
  let postError = null;
  try{
    const r=await AleAPI.postPublic(action,data);
    if(r?.ok!==false) return {ok:true,id:r?.id||data.id,numero_solicitud:r?.numero_solicitud||"",numero_pedido:r?.numero_pedido||"",pdf_url:r?.pdf_url||"",pdf_pending:!!r?.pdf_pending,total:r?.total,checkout_token:r?.checkout_token||"",tracking_token:r?.tracking_token||"",tracking_url:r?.tracking_url||"",source:"transport",persisted:r?.persisted!==false};
  }catch(err){ postError=err; }

  const ambiguous=AleAPI.isAmbiguousTransportError?.(postError)===true;
  if(!ambiguous) throw postError||new Error("REGISTRO_NO_CONFIRMADO");

  // Ante timeout/CORS/conexión ambigua, la escritura puede haber quedado confirmada.
  for(let i=0;i<7;i++){
    if(i) await new Promise(r=>setTimeout(r,450+i*180));
    try{
      const check=await AleAPI.verifyRecord(type,data.id,1);
      if(check?.ok&&check?.exists){
        if(String(action||"").toLowerCase()==="createorder"){
          try{const recovered=await AleAPI.postPublic(action,data);if(recovered?.checkout_token)return {ok:true,id:recovered?.id||data.id,numero_pedido:recovered?.numero_pedido||check?.numero_pedido||"",pdf_url:recovered?.pdf_url||check?.pdf_url||"",pdf_pending:!!recovered?.pdf_pending,total:recovered?.total,checkout_token:recovered.checkout_token,tracking_token:recovered?.tracking_token||"",tracking_url:recovered?.tracking_url||"",source:"recovered-after-transport",persisted:true};}catch(_){ }
        }
        if(String(action||"").toLowerCase()==="createrequest"){
          try{const recovered=await AleAPI.postPublic(action,data);if(recovered?.tracking_url)return {ok:true,id:recovered?.id||data.id,numero_solicitud:recovered?.numero_solicitud||check?.numero_solicitud||"",tracking_token:recovered?.tracking_token||"",tracking_url:clientPublicUrl(recovered.tracking_url),source:"recovered-after-transport",persisted:true};}catch(_){ }
        }
        return {ok:true,id:data.id,numero_solicitud:check?.numero_solicitud||"",numero_pedido:check?.numero_pedido||"",pdf_url:check?.pdf_url||"",source:"verified-after-transport",persisted:true};
      }
    }catch(_){ }
  }

  const err=postError||new Error("REGISTRO_NO_CONFIRMADO");
  err.ambiguous = true;
  throw err;
}


function friendlyOrderCreateError(err){
  const raw=AleAPI?.errorText ? AleAPI.errorText(err?.message||err?.payload?.error||err) : String(err?.message||err||"ERROR_SERVIDOR");
  const code=String(raw||"ERROR_SERVIDOR").toUpperCase();
  if(code.includes("STOCK_INSUFICIENTE")){
    if(globalSalesWithoutStock()) return "No fue posible completar el pedido en este intento. Reintenta nuevamente.";
    const detail=String(err?.detail||err?.payload?.error_detail||"").trim();
    if(detail){try{const rows=JSON.parse(detail);if(Array.isArray(rows)&&rows.length){const r=rows[0],extra=rows.length>1?` Además hay ${rows.length-1} producto(s) con el mismo problema.`:"";return `Stock insuficiente: ${r.producto_nombre||"Producto"}${r.tamano_nombre?` · ${r.tamano_nombre}`:""}. Disponible: ${Number(r.disponible||0)} · Solicitado: ${Number(r.solicitado||0)}.${extra}`}}catch(_){}}
    return "Stock insuficiente para uno de los productos o tamaños seleccionados.";
  }
  if(code.includes("PRODUCTO_NO_DISPONIBLE")) return "Uno de los productos ya no está disponible.";
  if(code.includes("PRODUCTO_TAMANO_REQUERIDO")||code.includes("TAMANO_PRODUCTO_INVALIDO")||code.includes("TAMANO_NO_CORRESPONDE")) return "Uno de los tamaños seleccionados ya no está disponible. Actualiza el carrito.";
  if(code.includes("DETALLE_PEDIDO_INVALIDO")||code.includes("PEDIDO_SIN_ITEMS")) return "El pedido no contiene productos válidos.";
  if(code.includes("RUT_")) return "El RUT ingresado no es válido.";
  if(code.includes("MEDIO_PAGO_INVALIDO")) return "El medio de pago seleccionado no es válido.";
  if(code.includes("API_NO_CONFIGURADA")) return "La conexión con el servidor no está configurada.";
  if(code.includes("API_TIMEOUT")||code.includes("API_CONEXION_FALLIDA")||code.includes("RESPUESTA_API_INVALIDA")) return "La conexión con el servidor se interrumpió mientras se confirmaba el pedido.";
  if(code.includes("PGRST202")||(code.includes("ALE_CREAR_PEDIDO_COMPLETO")&&code.includes("NOT FOUND"))) return "La función de creación de pedidos no está disponible en la base de datos. Debes aplicar el SQL de compatibilidad incluido en esta versión.";
  if(code.includes("42703")||(code.includes("COLUMN")&&code.includes("DOES NOT EXIST"))) return `La base de datos está desactualizada: ${raw}`;
  if(code.includes("23502")) return `Falta un dato obligatorio en la base de datos: ${raw}`;
  if(code.includes("23503")) return `Existe una referencia inválida al guardar el pedido: ${raw}`;
  if(code.includes("23505")) return `El pedido ya existe o hay un dato duplicado: ${raw}`;
  return `No fue posible registrar el pedido: ${raw}`;
}

function wireRequest(){
  wireRutField("#rqRut");
  $$("[data-request-pay]").forEach(btn=>btn.addEventListener("click",()=>{$$("[data-request-pay]").forEach(x=>x.classList.remove("active"));btn.classList.add("active");if($("#rqPayment"))$("#rqPayment").value=btn.dataset.requestPay||"TRANSFERENCIA"}));
  $("#requestForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const form=e.currentTarget;
    const btn=e.submitter||form?.querySelector('button[type="submit"]');
    beginButtonLoader(btn);
    const rut=formatRutInput($("#rqRut").value);
    if(!isValidRut(rut)){toast("Ingresa un RUT chileno válido.","error");endButtonLoader(btn);return}
    const data={id:clientRecordId("SOL"),nombre:$("#rqName").value.trim(),rut,telefono:$("#rqPhone").value.trim(),email:$("#rqEmail").value.trim(),fecha_evento:$("#rqDate").value,tipo:$("#rqType").value,cantidad:$("#rqQty").value.trim(),detalle:$("#rqMessage").value.trim(),medio_pago_preferido:$("#rqPayment")?.value||"TRANSFERENCIA"};
    try{
      if(!AleAPI.configured()) throw new Error("API_NO_CONFIGURADA");
      const r=await sendAndConfirm("createRequest","request",data);
      // Desde este punto el servidor ya confirmó el registro.
      // Ningún error de UI posterior debe convertirse en un falso error de envío.
      toast(`Solicitud enviada correctamente · ${r.numero_solicitud||r.id}`,"success");
      try{ form?.reset(); }catch(uiErr){ console.warn("No fue posible limpiar el formulario",uiErr); }
      try{
        const requestUrl=r.tracking_url?clientPublicUrl(r.tracking_url):"";if(normalizePhone(state.config.whatsapp)) openWhatsApp(`Hola Ale Atencio, acabo de registrar la solicitud ${r.numero_solicitud||r.id}.\n\nNombre: ${data.nombre}\nRUT: ${data.rut}\nTeléfono: ${data.telefono}\nFecha: ${data.fecha_evento}\nTipo: ${data.tipo}\nCantidad: ${data.cantidad}\nDetalle: ${data.detalle}${requestUrl?`\n\nSeguimiento de la solicitud: ${requestUrl}`:""}`);
      }catch(uiErr){ console.warn("La solicitud fue registrada, pero no se pudo abrir WhatsApp",uiErr); }
    } catch(err){
      console.warn(err);
      if(AleAPI.isAmbiguousTransportError?.(err) || err?.ambiguous){
        toast(`Solicitud ${data.id} recibida; la confirmación del servidor está demorando. No la vuelvas a enviar.`,"info");
      } else {
        toast(`No fue posible registrar la solicitud: ${String(err?.message||"ERROR_SERVIDOR")}`,"error");
      }
    } finally { endButtonLoader(btn); }
  });
}

function sanitizeCartAgainstCatalog(){
  let changed=false;const next=[];
  for(const raw of Array.isArray(cart)?cart:[]){
    const p=state.products.find(x=>String(x.id)===String(raw.id));if(!p||!isProductActive(p)){changed=true;continue}
    const sizes=productSizes(p),z=sizes.length?cartLineSize(p,raw):null;const line={...raw,qty:Math.max(1,Number(raw.qty||1))};
    if(sizes.length&&!z){changed=true;continue}
    if(z){if(String(line.tamano_id||"")!==String(z.id)){line.tamano_id=z.id;changed=true}if(String(line.tamano_nombre||"")!==String(z.nombre||"")){line.tamano_nombre=z.nombre||"";changed=true}if(Number(line.precio)!==Number(z.precio||0)){line.precio=Number(z.precio||0);changed=true}}
    else if(Number(line.precio)!==Number(p.precio||0)){line.precio=Number(p.precio||0);changed=true}
    next.push(line)
  }
  if(changed||next.length!==cart.length){cart=next;localStorage.setItem("aleAtencioCart",JSON.stringify(cart));}
}
async function refreshCatalogAvailability(){
  if(!AleAPI.configured()) return;
  try{
    const fresh=await AleAPI.get("bootstrap");
    state.products=Array.isArray(fresh.products)?fresh.products.filter(isProductActive):[];
    if(fresh.config)state.config={...state.config,...fresh.config};if(Array.isArray(fresh.gallery))state.gallery=fresh.gallery;
  }catch(e){console.warn("No se pudo refrescar disponibilidad",e);state.products=[];}
  sanitizeCartAgainstCatalog();
  render();updateCartUI();
}
window.addToCart=async (id,sizeId="",qty=1)=>{
  let p=state.products.find(x=>String(x.id)===String(id));
  if(!p||!isProductActive(p)){toast("Este producto ya no está disponible para la venta.","error");return false}
  let selected=productSize(p,sizeId);if(productSizes(p).length&&!selected){toast("Selecciona un tamaño.","error");return false}
  if(AleAPI.configured()){
    try{
      const live=await AleAPI.get("checkproduct",{id:String(id),tamano_id:selected?.id||""});
      if(!live?.exists||!live?.active){
        if(selected)cart=cart.filter(x=>cartLineKey(x.id,x.tamano_id)!==cartLineKey(id,selected.id));else cart=cart.filter(x=>String(x.id)!==String(id));
        localStorage.setItem("aleAtencioCart",JSON.stringify(cart));render();updateCartUI();toast("Este producto o tamaño ya no está disponible para la venta.","error");return false;
      }
      if(Array.isArray(live.tamanos))p={...p,tamanos:live.tamanos};
      selected=productSize(p,live.tamano?.id||selected?.id||"");
      p={...p,precio:Number(live.precio??selected?.precio??p.precio),nombre:live.nombre||p.nombre,permite_stock_negativo:live.permite_stock_negativo??p.permite_stock_negativo};
      const idx=state.products.findIndex(x=>String(x.id)===String(id));if(idx>=0)state.products[idx]=p;
    }catch(e){console.warn("No se pudo verificar disponibilidad",e);toast("No fue posible confirmar la disponibilidad del producto. Intenta nuevamente.","error");return false;}
  }
  const key=cartLineKey(p.id,selected?.id||""),item=cart.find(x=>cartLineKey(x.id,x.tamano_id)===key),linePrice=Number(selected?.precio??p.precio??0);
  const amount=Math.max(1,Math.min(99,Number(qty||1)));
  const availableStock=Number(selected?.stock??p.stock);
  const requestedQty=Number(item?.qty||0)+amount;
  if(!productAllowsNegativeStock(p)&&Number.isFinite(availableStock)&&availableStock<requestedQty){
    toast(`Stock disponible: ${Math.max(0,availableStock)}${selected?.nombre?` · ${selected.nombre}`:""}.`,"error");
    return false;
  }
  if(item){item.qty+=amount;item.precio=linePrice;item.tamano_nombre=selected?.nombre||""}else cart.push({id:p.id,tamano_id:selected?.id||"",tamano_nombre:selected?.nombre||"",precio:linePrice,qty:amount});
  saveCart();toast(selected?.nombre?`${amount>1?amount+" productos agregados":"Producto agregado"} · ${selected.nombre}`:(amount>1?`${amount} productos agregados`:"Producto agregado"));return true
}
function saveCart(){localStorage.setItem("aleAtencioCart",JSON.stringify(cart));updateCartUI()}
function clearCartAfterCompletedPurchase(){
  cart=[];
  try{localStorage.removeItem("aleAtencioCart")}catch(_){}
  updateCartUI();
  closeCart();
}
window.changeQty=(id,sizeId,d)=>{const p=state.products.find(x=>String(x.id)===String(id)),key=cartLineKey(id,sizeId);if(!p||!isProductActive(p)){cart=cart.filter(x=>cartLineKey(x.id,x.tamano_id)!==key);saveCart();toast("El producto fue retirado de la venta.","error");return}const i=cart.find(x=>cartLineKey(x.id,x.tamano_id)===key);if(!i)return;if(d>0&&!productAllowsNegativeStock(p)){const z=cartLineSize(p,i),available=Number(z?.stock??p.stock);if(Number.isFinite(available)&&i.qty+d>available){toast(`Stock disponible: ${Math.max(0,available)}${z?.nombre?` · ${z.nombre}`:""}.`,"error");return}}i.qty+=d;if(i.qty<=0)cart=cart.filter(x=>cartLineKey(x.id,x.tamano_id)!==key);saveCart()}
window.removeItem=(id,sizeId="")=>{const key=cartLineKey(id,sizeId);cart=cart.filter(x=>cartLineKey(x.id,x.tamano_id)!==key);saveCart()}

let checkoutPaymentIntent="";
function configYes(value){return ["SI","SÍ","TRUE","1","YES","ON"].includes(String(value||"").trim().toUpperCase())}
function safeHttpsUrl(value){try{const u=new URL(String(value||"").trim());return u.protocol==="https:"?u.toString():""}catch(_){return""}}
function transbankAvailable(){return configYes(state.config?.transbank_enabled)&&configYes(state.config?.transbank_runtime_ready)}
function transbankButtonLabel(){return String(state.config?.transbank_button_label||"Pagar con Transbank").trim().slice(0,80)||"Pagar con Transbank"}
function getPendingTransbank(){try{return JSON.parse(sessionStorage.getItem("aleAtencioPendingTransbank")||"null")}catch(_){return null}}
function setPendingTransbank(value){try{if(value)sessionStorage.setItem("aleAtencioPendingTransbank",JSON.stringify(value));else sessionStorage.removeItem("aleAtencioPendingTransbank")}catch(_){}}
function syncPaymentUI(){
  const available=transbankAvailable(),btn=$("#transbankCartBtn"),note=$("#transbankCartNote"),label=$("#transbankCartLabel");
  btn?.classList.toggle("hidden",!available);note?.classList.toggle("hidden",!available);if(label)label.textContent=transbankButtonLabel();
  const retry=$("#orderSuccessTransbank");if(retry){retry.innerHTML=`<i class="bi bi-credit-card-2-front"></i> Reintentar ${esc(transbankButtonLabel())}`;retry.hidden=!getPendingTransbank()}
}
function submitTransbankForm(url,token){
  const safe=safeHttpsUrl(url);if(!safe||!token)throw new Error("TRANSBANK_RESPUESTA_INVALIDA");
  const form=document.createElement("form");form.method="POST";form.action=safe;form.style.display="none";
  const input=document.createElement("input");input.type="hidden";input.name="token_ws";input.value=String(token);form.appendChild(input);document.body.appendChild(form);form.submit();
}
async function startTransbankForOrder(pending){
  if(!pending?.order_id||!pending?.checkout_token)throw new Error("TRANSBANK_PEDIDO_SIN_TOKEN");
  const out=await AleAPI.postPublic("transbankcreate",{order_id:pending.order_id,checkout_token:pending.checkout_token,payment_link_id:pending.payment_link_id||""});
  if(!out?.url||!out?.token)throw new Error("TRANSBANK_NO_INICIALIZADO");
  toast(`Abriendo pago seguro Transbank para ${pending.numero_pedido||"tu pedido"} · ${moneyClp(pending.total||0)}…`,"success");
  setTimeout(()=>submitTransbankForm(out.url,out.token),250);
}
async function handleTransbankReturnUi(){
  const u=new URL(location.href);let status=String(u.searchParams.get("tbk")||"").toLowerCase(),order=u.searchParams.get("order")||"";if(!status)return;
  const pending=getPendingTransbank();
  if(pending?.order_id&&pending?.checkout_token){
    try{
      const recovered=await AleAPI.postPublic("transbankrecover",{order_id:pending.order_id,checkout_token:pending.checkout_token,payment_link_id:pending.payment_link_id||""});
      const local=String(recovered?.estado_pago||"").toUpperCase();order=recovered?.numero_pedido||order||pending.numero_pedido||"";
      if(local==="PAGADO")status="success";
      else if(local==="RECHAZADO")status="failed";
      else if(local==="CANCELADO")status="cancelled";
      else if(["VERIFICACION_PENDIENTE","COMMIT_PENDIENTE","COMMIT_EN_PROCESO","INICIADO"].includes(local))status="pending";
    }catch(err){console.warn("TRANSBANK_RECOVER_RETURN",err);if(status==="invalid")status="pending";}
  }
  if(status==="success"){
    clearCartAfterCompletedPurchase();
    assistedCheckout=null;
    setCheckoutPaymentIntent("");
    setPendingTransbank(null);
  }
  syncPaymentUI();
  const messages={success:`Pago confirmado${order?` · ${order}`:""}. Gracias por tu compra.`,failed:`El pago no fue autorizado${order?` para ${order}`:""}. Puedes volver a intentarlo.`,cancelled:`Pago cancelado${order?` · ${order}`:""}. El pedido quedó registrado y puedes reintentar el pago.`,pending:`Estamos confirmando el pago de ${order||"tu pedido"}. No vuelvas a pagar mientras se verifica.`,invalid:"No fue posible relacionar automáticamente el retorno de Transbank. El pago queda en verificación para evitar un cobro duplicado."};
  toast(messages[status]||"Retorno de Transbank recibido.",status==="success"?"success":status==="pending"?"info":"error");
  if(pending&&["failed","cancelled"].includes(status)){const panel=$("#orderSuccessPanel"),numberEl=$("#orderSuccessNumber");if(numberEl)numberEl.textContent=order||pending.numero_pedido||"";panel?.classList.remove("hidden");$("#submitOrderBtn")?.classList.add("hidden");openModal("#checkoutModal");syncPaymentUI();}
  ["tbk","order"].forEach(k=>u.searchParams.delete(k));history.replaceState({},"",u.pathname+(u.search||"")+u.hash);
  if(status==="success"&&order)setTimeout(()=>{location.hash=trackingHash(order)},850);
}
function setCheckoutPaymentIntent(provider=""){
  checkoutPaymentIntent=provider;const isTb=provider==="TRANSBANK";const intent=$("#checkoutPaymentIntent"),submit=$("#submitOrderBtn");
  intent?.classList.toggle("hidden",!isTb);if(submit)submit.textContent=isTb?`Registrar y ${transbankButtonLabel()}`:"Enviar pedido";
}
function openCheckout(provider=""){
  if(!cart.length)return toast("Tu carrito está vacío","error");
  closeCart();
  setCheckoutPaymentIntent(provider);$("#orderSuccessPanel")?.classList.add("hidden");if($("#orderSuccessPdfPending"))$("#orderSuccessPdfPending").hidden=true;$("#submitOrderBtn")?.classList.remove("hidden");openModal("#checkoutModal");
}
function totals(method=""){
  const subtotal=cart.reduce((s,i)=>{const p=state.products.find(x=>String(x.id)===String(i.id));return s+(p?cartLinePrice(i,p)*i.qty:0)},0);
  const delivery=(subtotal && method==="Despacho")?Number(state.config.valor_despacho||0):0;
  return{subtotal,delivery,total:subtotal+delivery}
}
function updateCartUI(){
  sanitizeCartAgainstCatalog();
  const count=cart.reduce((s,i)=>s+i.qty,0);$("#cartCount").textContent=count;
  $("#cartItems").innerHTML=count?cart.map(i=>{const p=state.products.find(x=>String(x.id)===String(i.id));if(!p)return"";const z=cartLineSize(p,i),price=cartLinePrice(i,p),sid=z?.id||i.tamano_id||"";return `<div class="cart-item"><div class="cart-thumb">${productFallback(p)}</div><div><strong>${esc(p.nombre)}</strong>${z||i.tamano_nombre?`<span class="cart-size">Tamaño: ${esc(z?.nombre||i.tamano_nombre||"")}</span>`:""}<small>${money(price)}</small><div class="qty"><button onclick="changeQty('${p.id}','${esc(sid)}',-1)">−</button><span>${i.qty}</span><button onclick="changeQty('${p.id}','${esc(sid)}',1)">+</button></div></div><button class="remove-item" onclick="removeItem('${p.id}','${esc(sid)}')"><i class="bi bi-x-lg"></i></button></div>`}).join(""):'<div class="empty-card">Tu carrito está vacío.</div>';
  const t=totals();$("#cartSubtotal").textContent=money(t.subtotal);$("#cartDelivery").textContent="Por confirmar";$("#cartTotal").textContent=money(t.subtotal);syncPaymentUI();
}

async function submitOrder(){
  const btn=$("#submitOrderBtn");
  sanitizeCartAgainstCatalog();
  if(!cart.length){toast("Tu carrito está vacío o los productos ya no están disponibles.","error");return}
  const nombre=$("#coName").value.trim(), telefono=$("#coPhone").value.trim();
  if(!nombre||!telefono){toast("Completa nombre y WhatsApp","error");return}
  const rut=formatRutInput($("#coRut").value);
  if(!isValidRut(rut)){toast("Ingresa un RUT chileno válido.","error");$("#coRut").focus();return}
  beginButtonLoader(btn);
  const metodo=$("#coMethod").value;const t=totals(metodo);
  const detail=cart.map(i=>{const p=state.products.find(x=>String(x.id)===String(i.id)),z=cartLineSize(p,i);return{id:p.id,nombre:p.nombre,tamano_id:z?.id||i.tamano_id||"",tamano_nombre:z?.nombre||i.tamano_nombre||"",cantidad:i.qty,precio:cartLinePrice(i,p)}});
  const addressRaw=$("#coAddress").value.trim();
  const communeRaw=$("#coCommune")?.value.trim()||"";
  if(metodo==="Despacho"&&!communeRaw){toast("Ingresa la comuna para el despacho.","error");$("#coCommune")?.focus();endButtonLoader(btn);return}
  const paymentMethod=checkoutPaymentIntent==="TRANSBANK"?"TRANSBANK":"TRANSFERENCIA";
  const data={id:clientRecordId("PED"),nombre,rut,telefono,email:$("#coEmail").value.trim(),metodo_entrega:metodo,direccion:addressRaw,comuna:communeRaw,observaciones:$("#coNotes").value.trim(),medio_pago:paymentMethod,detalle:detail,subtotal:t.subtotal,despacho:t.delivery,total:t.total};
  let result=null,saved=false;
  if(assistedCheckout){const pending={order_id:assistedCheckout.order_id,numero_pedido:assistedCheckout.order?.numero_pedido||assistedCheckout.order_id,checkout_token:assistedCheckout.checkout_token,payment_link_id:assistedCheckout.payment_link_id||"",total:Number(assistedCheckout.order?.total||t.total)};setPendingTransbank(pending);endButtonLoader(btn);try{await startTransbankForOrder(pending)}catch(payErr){console.warn(payErr);toast("No fue posible iniciar Transbank. Intenta nuevamente.","error")}return;}
  try{
    if(!AleAPI.configured())throw new Error("API_NO_CONFIGURADA");
    result=await sendAndConfirm("createOrder","order",data);saved=true;
  }catch(e){
    console.warn("CREATE_ORDER",e,e?.payload||"");
    const code=String(e?.message||e||"").toUpperCase();
    if(code.includes("PRODUCTO_NO_DISPONIBLE")||code.includes("PRODUCTO_TAMANO_REQUERIDO")||code.includes("TAMANO_PRODUCTO_INVALIDO")||code.includes("TAMANO_NO_CORRESPONDE")||code.includes("DETALLE_PEDIDO_INVALIDO")||code.includes("STOCK_INSUFICIENTE")){
      await refreshCatalogAvailability();
    }
    if(AleAPI.isAmbiguousTransportError?.(e)||e?.ambiguous){
      toast(`Pedido ${data.id}: la confirmación del servidor está demorando. No lo vuelvas a enviar hasta verificarlo.`,"info");
    }else{
      toast(friendlyOrderCreateError(e),"error");
    }
    endButtonLoader(btn);return;
  }
  const orderId=result?.numero_pedido||result?.id||data.id;
  const lines=detail.map(x=>`• ${x.cantidad} x ${x.nombre}${x.tamano_nombre?` · ${x.tamano_nombre}`:""} - ${money(x.precio*x.cantidad)}`).join("\n");
  if(saved){
    const payWithTransbank=checkoutPaymentIntent==="TRANSBANK"&&transbankAvailable();
    // Un pedido Transbank aún no es una compra finalizada: conservamos el carrito
    // hasta que el retorno del servidor confirme estado PAGADO. Para pedidos sin
    // Transbank, el registro exitoso completa el flujo y el carrito sí se limpia.
    if(!payWithTransbank)clearCartAfterCompletedPurchase();
    const panel=$("#orderSuccessPanel"),pdfLink=$("#orderSuccessPdf"),pdfPending=$("#orderSuccessPdfPending"),numberEl=$("#orderSuccessNumber"),trackingLink=$("#orderSuccessTracking"),pdfGenerate=$("#orderSuccessPdfGenerate");
    if(numberEl)numberEl.textContent=orderId;
    rememberTracking(result?.id||data.id,orderId,result?.tracking_token||"",result?.tracking_url||"",result?.pdf_url||"");
    if(trackingLink){trackingLink.href=result?.tracking_url||trackingHash(orderId);trackingLink.hidden=false}
    if(pdfLink){if(result?.pdf_url){pdfLink.href=result.pdf_url;pdfLink.hidden=false}else{pdfLink.hidden=true;pdfLink.removeAttribute("href")}}
    if(pdfGenerate){pdfGenerate.hidden=!!result?.pdf_url||!result?.tracking_token;pdfGenerate.dataset.orderId=String(result?.id||data.id);pdfGenerate.dataset.trackingToken=String(result?.tracking_token||"")}
    if(pdfPending)pdfPending.hidden=!!result?.pdf_url;
    panel?.classList.remove("hidden");
    btn?.classList.add("hidden");
    toast(`Pedido registrado · ${orderId}`,"success");
    if(payWithTransbank){
      const pending={order_id:result?.id||data.id,numero_pedido:orderId,checkout_token:result?.checkout_token||"",total:t.total};
      setPendingTransbank(pending);syncPaymentUI();setCheckoutPaymentIntent("");endButtonLoader(btn);
      try{await startTransbankForOrder(pending);return;}catch(payErr){console.warn("TRANSBANK_CREATE",payErr);toast(`Pedido ${orderId} registrado, pero Transbank no pudo iniciarse. Usa “Reintentar pago”.`,"error");return;}
    }
    setCheckoutPaymentIntent("");
    try{
      const customerTracking=result?.tracking_url?clientPublicUrl(result.tracking_url):"";if(normalizePhone(state.config.whatsapp)) openWhatsApp(`Hola Ale Atencio, quiero confirmar mi pedido ${orderId}.\n\n${lines}\n\nTotal: ${money(t.total)}\nNombre: ${nombre}\nRUT: ${rut}\nEntrega: ${data.metodo_entrega}\nDirección: ${data.direccion}\nObservaciones: ${data.observaciones}${customerTracking?`\nSeguimiento: ${customerTracking}`:""}`);
    }catch(uiErr){console.warn("Pedido registrado; WhatsApp no se pudo abrir",uiErr)}
  }else{
    toast("No fue posible registrar el pedido.","error");
  }
  endButtonLoader(btn);
}

let checkoutRutLookupSeq=0;
let checkoutRutLookupTimer=null;
const checkoutRutCache=new Map();
function setCheckoutRutLookupState(message,kind=""){
  const el=$("#coRutLookupState");if(!el)return;el.textContent=message||"";el.classList.remove("is-loading","is-found","is-new","is-error");if(kind)el.classList.add(`is-${kind}`);
}
function applyCheckoutClient(client={}){
  const set=(selector,value)=>{const el=$(selector);if(el&&value!==undefined&&value!==null&&String(value)!=="")el.value=String(value)};
  set("#coName",client.nombre);
  set("#coPhone",client.telefono);
  set("#coEmail",client.email);
  set("#coAddress",client.direccion);
  set("#coCommune",client.comuna);
  const method=$("#coMethod"),delivery=String(client.tipo_transporte||"").toUpperCase();
  if(method){if(delivery.includes("DESPACH")||delivery.includes("DELIVERY"))method.value="Despacho";else if(delivery.includes("RETIRO"))method.value="Retiro";}
}
async function lookupCheckoutClientByRut(value){
  const input=$("#coRut");if(!input)return null;const raw=String(value??input.value).trim();
  if(!raw){setCheckoutRutLookupState("Ingresa tu RUT para recuperar tus datos si ya eres cliente.");return null}
  if(!isValidRut(raw)){setCheckoutRutLookupState("RUT inválido. Revisa el dígito verificador.","error");return null}
  const formatted=formatRutInput(raw),key=normalizeRut(formatted);input.value=formatted;
  const seq=++checkoutRutLookupSeq;setCheckoutRutLookupState("Buscando tus datos…","loading");
  try{
    let out=checkoutRutCache.get(key);
    if(!out){out=await AleAPI.postPublic("publicclientbyrut",{rut:formatted});checkoutRutCache.set(key,out)}
    if(seq!==checkoutRutLookupSeq)return null;
    if(out?.found&&out?.client){applyCheckoutClient(out.client);setCheckoutRutLookupState("Cliente encontrado. Tus datos fueron precargados; puedes modificarlos antes de pagar.","found");return out.client}
    setCheckoutRutLookupState("RUT nuevo. Completa tus datos y quedarán registrados con el pedido.","new");return null;
  }catch(err){
    console.warn("PUBLIC_CLIENT_RUT_LOOKUP",err);if(seq===checkoutRutLookupSeq)setCheckoutRutLookupState("No fue posible recuperar tus datos ahora. Puedes continuar completando el formulario.","error");return null;
  }
}
function wireCheckoutRutLookup(){
  const el=$("#coRut");if(!el)return;
  el.addEventListener("blur",()=>lookupCheckoutClientByRut(el.value));
  el.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();lookupCheckoutClientByRut(el.value)}});
  el.addEventListener("input",()=>{
    clearTimeout(checkoutRutLookupTimer);
    if(!el.value){checkoutRutLookupSeq++;setCheckoutRutLookupState("Ingresa tu RUT para recuperar tus datos si ya eres cliente.");return}
    if(!isValidRut(el.value)){setCheckoutRutLookupState("Escribe un RUT válido para buscar tus datos.");return}
    checkoutRutLookupTimer=setTimeout(()=>lookupCheckoutClientByRut(el.value),450);
  });
}

function normalizeRut(v){return String(v||"").toUpperCase().replace(/[^0-9K]/g,"")}
function isValidRut(v){const rut=normalizeRut(v);if(!/^[0-9]{7,8}[0-9K]$/.test(rut))return false;const body=rut.slice(0,-1),dv=rut.slice(-1);let sum=0,mul=2;for(let i=body.length-1;i>=0;i--){sum+=Number(body[i])*mul;mul=mul===7?2:mul+1}const r=11-(sum%11),expected=r===11?"0":r===10?"K":String(r);return dv===expected}
function formatRutInput(v){const rut=normalizeRut(v);if(!rut)return"";const body=rut.slice(0,-1),dv=rut.slice(-1);return `${body.replace(/\B(?=(\d{3})+(?!\d))/g,".")}-${dv}`}
function wireRutField(id){const el=$(id);if(!el)return;el.addEventListener("blur",()=>{if(el.value)el.value=formatRutInput(el.value)});el.addEventListener("input",()=>{el.setCustomValidity(el.value&&!isValidRut(el.value)?"RUT inválido":"")})}

function normalizePhone(v){return String(v||"").replace(/\D/g,"")}
window.openWhatsApp=(custom="")=>{const phone=normalizePhone(state.config.whatsapp);if(!phone){toast("WhatsApp aún no está configurado en el cPanel.");return false}const msg=custom||"Hola Ale Atencio, quisiera información sobre sus productos.";window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,"_blank","noopener");return true}

function openCart(){$("#cartDrawer").classList.add("open");$("#overlay").classList.add("show")}function closeCart(){$("#cartDrawer").classList.remove("open");$("#overlay").classList.remove("show")}
function openModal(id){const m=$(id);if(!m)return;m.classList.add("show");if(id==="#productDetailModal")document.body.classList.add("product-modal-open")}function closeModal(){$$(".modal").forEach(x=>x.classList.remove("show"));document.body.classList.remove("product-modal-open")}
$("#cartBtn").addEventListener("click",openCart);$("#closeCart").addEventListener("click",closeCart);$("#overlay").addEventListener("click",closeCart);$("#clearCart").addEventListener("click",()=>{cart=[];saveCart()});
$("#orderSuccessPdfGenerate")?.addEventListener("click",async e=>{const b=e.currentTarget,orderId=b.dataset.orderId,trackingToken=b.dataset.trackingToken;if(!orderId||!trackingToken)return;beginButtonLoader(b);try{const out=await AleAPI.postPublic("publicorderpdf",{order_id:orderId,tracking_token:trackingToken});if(out?.pdf_url){const link=$("#orderSuccessPdf");link.href=out.pdf_url;link.hidden=false;b.hidden=true;$("#orderSuccessPdfPending").hidden=true;const cred=trackingCredential(out.numero_pedido)||trackingCredential(orderId);if(cred)rememberTracking(orderId,out.numero_pedido,trackingToken,cred.tracking_url,out.pdf_url);toast("PDF generado correctamente","success")}}catch(err){console.warn(err);toast("No fue posible generar el PDF ahora","error")}finally{endButtonLoader(b)}});
$("#checkoutBtn").addEventListener("click",()=>openCheckout(""));$("#transbankCartBtn")?.addEventListener("click",()=>{if(!transbankAvailable())return toast("Transbank aún no está listo. Verifica URL y credenciales del servidor.","error");openCheckout("TRANSBANK")});$("#orderSuccessTransbank")?.addEventListener("click",async e=>{const b=e.currentTarget,p=getPendingTransbank();if(!p)return toast("No hay un pago Transbank pendiente.","error");beginButtonLoader(b);try{await startTransbankForOrder(p)}catch(err){console.warn(err);toast("No fue posible iniciar Transbank. Revisa la configuración del servidor.","error");endButtonLoader(b)}});$("#submitOrderBtn").addEventListener("click",submitOrder);wireRutField("#coRut");wireCheckoutRutLookup();$("#orderSuccessClose")?.addEventListener("click",()=>{closeModal();setCheckoutPaymentIntent("");$("#orderSuccessPanel")?.classList.add("hidden");$("#submitOrderBtn")?.classList.remove("hidden")});$("#whatsappFloat").addEventListener("click",e=>{e.preventDefault();openWhatsApp()});
$("#searchBtn").addEventListener("click",()=>openModal("#searchModal"));$$("[data-close-modal]").forEach(b=>b.addEventListener("click",closeModal));$$(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal()}));
$("#searchAction").addEventListener("click",doSearch);$("#searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")doSearch()});
function doSearch(){const q=normalizeText($("#searchInput").value);const list=state.products.filter(p=>isProductActive(p)&&productSearchText(p).includes(q)).slice(0,8);$("#searchResults").innerHTML=list.length?list.map(p=>`<div class="search-result"><div><strong>${esc(p.nombre)}</strong><br><small>${esc(p.categoria_nombre||"")}</small></div><button class="add-button" onclick="closeModal();openProductDetail('${esc(p.id)}')">Ver opciones</button></div>`).join(""):'<div class="empty-card">No encontramos coincidencias.</div>'}
$(".nav-trigger").addEventListener("click",e=>{e.stopPropagation();e.currentTarget.closest(".nav-group").classList.toggle("open")});document.addEventListener("click",()=>$(".nav-group").classList.remove("open"));
$("#mobileToggle").addEventListener("click",()=>$("#mainNav").classList.toggle("show"));function closeMobile(){$("#mainNav").classList.remove("show");$(".nav-group").classList.remove("open")}
document.addEventListener("click",e=>{
  const a=e.target.closest('a[href^="#"]');
  if(!a)return;
  const href=a.getAttribute("href")||"";
  if(!href||href==="#"||href!==location.hash)return;
  const route=href.replace(/^#/,"");
  const isPublicView=route==="inicio"||route==="ofertas"||route==="nosotros"||route==="galeria"||route==="solicitud"||route==="seguimiento"||route==="politicas"||route.startsWith("productos/");
  if(!isPublicView)return;
  e.preventDefault();
  showPublicViewFocus(route,"auto");
  closeMobile();
});
function toast(msg,type="info"){
  let t=$(".toast");
  if(!t){t=document.createElement("div");t.className="toast";document.body.appendChild(t)}
  t.className=`toast ${type}`;
  const icon=type==="success"?"✓":type==="error"?"✕":"";
  t.innerHTML=`${icon?`<span class="toast-status-icon">${icon}</span>`:""}<span>${esc(msg)}</span>`;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer=setTimeout(()=>t.classList.remove("show"),type==="info"?1900:3500);
}
window.addEventListener("hashchange",render);
loadStore();


function hideSplashScreen(){
  const splash = document.getElementById('splashScreen');
  if(!splash || splash.dataset.closing === '1') return;
  splash.dataset.closing = '1';
  splash.classList.add('closing');
  setTimeout(()=>{
    splash.classList.add('hide');
  }, 980);
  setTimeout(()=>{
    if(splash && splash.parentNode) splash.parentNode.removeChild(splash);
  }, 1650);
}

window.addEventListener('load', ()=>{
  setTimeout(hideSplashScreen, 1700);
});

// safety fallback
setTimeout(()=>{
  const splash = document.getElementById('splashScreen');
  if(splash && splash.dataset.closing !== '1') hideSplashScreen();
}, 3600);

window.addEventListener("hashchange",()=>{if(location.hash.startsWith("#pago/"))setTimeout(()=>openAssistedPayment(),60)});if(location.hash.startsWith("#pago/"))setTimeout(()=>openAssistedPayment(),250);

async function uploadTransferProofFile(orderId,file,button=null){const cred=trackingCredential(orderId);if(!cred?.tracking_token){toast("Vuelve a abrir el enlace seguro de seguimiento antes de adjuntar el comprobante.","error");return}if(!file)return;if(file.size>8*1024*1024){toast("La imagen supera 8 MB.","error");return}const dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});if(button)button.disabled=true;try{await AleAPI.postPublic("uploadtransferproof",{order_id:orderId,tracking_token:cred.tracking_token,data_url:dataUrl});trackingProofFiles.delete(orderId);toast("✓ Comprobante enviado. Quedó pendiente de revisión.","success");const q=$("#trackingQuery")?.value||"",phone=$("#trackingPhone")?.value||"";setTimeout(()=>lookupTracking(q,phone),250)}catch(err){console.warn(err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("PEDIDO_NO_ES_TRANSFERENCIA")?"El pedido no está registrado como transferencia. Revisa el medio de pago en el pedido.":code.includes("PEDIDO_ESTADO_FINAL")?"Este pedido ya está finalizado y no admite comprobantes.":"No fue posible subir el comprobante.","error")}finally{if(button)button.disabled=false}}
async function uploadTransferProofFromTracking(event,orderId){const file=event?.target?.files?.[0];if(file)await uploadTransferProofFile(orderId,file,event?.target?.closest("label"))}
window.uploadTransferProofFromTracking=uploadTransferProofFromTracking;


// R9.18.149 · Analítica web propia (sin exponer URL de servidor en la interfaz).
(function initAleWebAnalytics(){
  function deviceType(){const ua=navigator.userAgent||"";if(/tablet|ipad/i.test(ua))return"TABLET";if(/mobile|iphone|android/i.test(ua))return"MOVIL";return"ESCRITORIO"}
  function storageId(key){try{let v=localStorage.getItem(key);if(!v){v=(crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`);localStorage.setItem(key,v)}return v}catch(_){return""}}
  async function track(){if(!window.AleAPI?.configured?.())return;try{await window.AleAPI.postPublic("trackvisit",{event_type:"PAGE_VIEW",path:location.pathname+location.search,visitor_id:storageId("ale_web_visitor"),session_id:sessionStorage.getItem("ale_web_session")||(()=>{const v=crypto?.randomUUID?.()||String(Date.now());try{sessionStorage.setItem("ale_web_session",v)}catch(_){ }return v})(),referrer:document.referrer||"",device:deviceType(),title:document.title||""})}catch(_){/* La analítica nunca debe bloquear la tienda */}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(track,250),{once:true});else setTimeout(track,250);
})();

// ALE ATENCIO R9.18.129 · sidebar cache isolation
// R9.18.125-MANTENEDOR-FOLIOS
// ALE ATENCIO R9.18.108 · Pedidos scroll/acciones + Clientes ciudad/comuna + Facturación tabla/pedido público
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money=n=>new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(Number(n||0));
const normalizeText=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-CL").trim();
const normalizeRutChile=value=>String(value??"").toUpperCase().replace(/[^0-9K]/g,"");
function isValidRutChile(value){const rut=normalizeRutChile(value);if(!/^[0-9]{7,8}[0-9K]$/.test(rut))return false;const body=rut.slice(0,-1),dv=rut.slice(-1);let sum=0,mul=2;for(let i=body.length-1;i>=0;i--){sum+=Number(body[i])*mul;mul=mul===7?2:mul+1}const r=11-(sum%11),expected=r===11?"0":r===10?"K":String(r);return dv===expected}
function formatRutChile(value){const rut=normalizeRutChile(value);if(!rut)return"";const body=rut.slice(0,-1),dv=rut.slice(-1);return `${body.replace(/\B(?=(\d{3})+(?!\d))/g,".")}-${dv}`}
function requireRutChile(value){const rut=formatRutChile(value);if(!rut)throw new Error("RUT_REQUERIDO");if(!isValidRutChile(rut))throw new Error("RUT_INVALIDO");return rut}
function wireRutInput(selector){const el=$(selector);if(!el)return;el.addEventListener("blur",()=>{if(el.value)el.value=formatRutChile(el.value)});el.addEventListener("input",()=>el.setCustomValidity(el.value&&!isValidRutChile(el.value)?"RUT inválido":""))}

const clientLookupSeq=new Map();
function mergeClientCache(client){if(!client?.id)return;data.clients=Array.isArray(data.clients)?data.clients:[];const i=data.clients.findIndex(x=>String(x.id)===String(client.id));if(i>=0)data.clients[i]={...data.clients[i],...client};else data.clients.unshift(client)}
function clientFromCacheByRut(value){const n=normalizeRutChile(value);if(!n)return null;return (data.clients||[]).find(c=>normalizeRutChile(c.rut_normalizado||c.rut)===n)||null}
function setClientLookupState(selector,message,kind=""){const el=$(selector);if(!el)return;el.textContent=message||"";el.classList.remove("is-loading","is-found","is-new","is-error");if(kind)el.classList.add(`is-${kind}`)}
async function fetchClientByRut(value){const rut=requireRutChile(value),normalized=normalizeRutChile(rut),cached=clientFromCacheByRut(normalized);try{const out=await AleAPI.post("clientbyrut",{rut},token);if(out?.client)mergeClientCache(out.client);return out?.client||null}catch(err){if(cached)return cached;throw err}}
function orderDeliveryFromClient(value){const x=String(value||"").trim().toUpperCase();if(x==="RETIRO")return"Retiro";if(x==="DESPACHO")return"Despacho";return"Coordinar"}
async function hydrateClientByRut({rutSelector,statusSelector,fields={},mode="overwrite"}){
  const input=$(rutSelector);if(!input)return null;const raw=input.value;if(!raw||!isValidRutChile(raw)){if(raw)setClientLookupState(statusSelector,"RUT inválido. Revisa el dígito verificador.","error");else setClientLookupState(statusSelector,"Ingresa un RUT válido para buscar en Clientes.");return null}
  input.value=formatRutChile(raw);const seq=(clientLookupSeq.get(rutSelector)||0)+1;clientLookupSeq.set(rutSelector,seq);setClientLookupState(statusSelector,"Buscando cliente…","loading");
  try{const client=await fetchClientByRut(input.value);if(clientLookupSeq.get(rutSelector)!==seq)return null;if(!client){setClientLookupState(statusSelector,"RUT nuevo: al guardar quedará registrado en Clientes.","new");return null}
    const assign=(selector,value)=>{const el=$(selector);if(!el||value===undefined||value===null)return;if(mode==="blank"&&String(el.value||"").trim())return;el.value=String(value)};
    if(fields.name)assign(fields.name,client.nombre||"");if(fields.phone)assign(fields.phone,client.telefono||"");if(fields.email)assign(fields.email,client.email||"");if(fields.address)assign(fields.address,client.direccion||"");if(fields.commune)assign(fields.commune,client.comuna||"");if(fields.delivery){const el=$(fields.delivery);if(el&&(mode!=="blank"||!String(el.value||"").trim()))el.value=orderDeliveryFromClient(client.tipo_transporte)}
    setClientLookupState(statusSelector,`Cliente encontrado${client.numero_cliente?` · ${client.numero_cliente}`:""}. Datos precargados.`,"found");return client;
  }catch(err){console.warn("client lookup",err);if(clientLookupSeq.get(rutSelector)===seq)setClientLookupState(statusSelector,"No fue posible consultar Clientes. Puedes continuar y guardar.","error");return null}
}
function wireClientRutLookup({rutSelector,statusSelector,fields,mode="overwrite",guard=null}){const el=$(rutSelector);if(!el)return;wireRutInput(rutSelector);const run=()=>{if(typeof guard==="function"&&!guard())return;hydrateClientByRut({rutSelector,statusSelector,fields,mode})};el.addEventListener("blur",run);el.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();run()}});el.addEventListener("input",()=>{if(!el.value)setClientLookupState(statusSelector,"Ingresa un RUT válido para buscar en Clientes.")})}

function rutSearchMatch(value,query){
  const candidate=normalizeRutChile(query);
  if(!candidate||candidate.length<4)return false;
  return normalizeRutChile(value).includes(candidate);
}
function flexibleSearchMatch(values,query){
  const raw=String(query??"").trim();
  if(!raw)return true;
  const text=normalizeText(values.filter(Boolean).join(" "));
  if(text.includes(normalizeText(raw)))return true;
  return values.some(v=>rutSearchMatch(v,raw));
}
function toNumber(value){
  if(typeof value==="number") return Number.isFinite(value)?value:0;
  const raw=String(value??"").trim();
  if(!raw)return 0;
  const clean=raw.replace(/[^0-9,.-]/g,"");
  if(!clean)return 0;
  let normalized=clean;
  if(clean.includes(",")&&clean.includes(".")) normalized=clean.lastIndexOf(",")>clean.lastIndexOf(".")?clean.replace(/\./g,"").replace(",", "."):clean.replace(/,/g,"");
  else if(clean.includes(",")) normalized=clean.replace(/\./g,"").replace(",", ".");
  else if((clean.match(/\./g)||[]).length>1 || /\.\d{3}$/.test(clean)) normalized=clean.replace(/\./g,"");
  const n=Number(normalized);
  return Number.isFinite(n)?n:0;
}

// R9.18.22 · Parser monetario chileno + dictado robusto. Evita que "40.000" se convierta en 40.
const CLP_WORDS={
  cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,
  dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,
  treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,cien:100,ciento:100,doscientos:200,trescientos:300,cuatrocientos:400,quinientos:500,seiscientos:600,setecientos:700,ochocientos:800,novecientos:900
};
function spokenSpanishInteger(value){
  const text=normalizeText(value).replace(/\b(?:pesos?|chilenos?|clp|monto|precio|valor|total|de)\b/g," ").replace(/[^a-z0-9.,\s-]/g," ").replace(/\s+/g," ").trim();
  if(!text)return NaN;
  const tokens=text.split(" ");let total=0,current=0,recognized=false;
  for(const token0 of tokens){const token=token0.replace(/^-|-$/g,"");if(!token||token==="y")continue;
    if(/^\d/.test(token)){const n=parseClpNumeric(token);if(Number.isFinite(n)){current+=n;recognized=true;continue}}
    if(token==="mil"||token==="miles"){total+=current>=1000?current:(current||1)*1000;current=0;recognized=true;continue}
    if(token==="millon"||token==="millones"){total+=(current||1)*1000000;current=0;recognized=true;continue}
    if(token==="luca"||token==="lucas"){total+=current>=1000?current:(current||1)*1000;current=0;recognized=true;continue}
    if(Object.prototype.hasOwnProperty.call(CLP_WORDS,token)){current+=CLP_WORDS[token];recognized=true;continue}
  }
  return recognized?total+current:NaN;
}
function parseClpNumeric(value){
  if(typeof value==="number")return Number.isFinite(value)?value:NaN;
  let raw=String(value??"").trim();if(!raw)return NaN;
  raw=raw.replace(/\s+/g,"").replace(/[^0-9,.-]/g,"");if(!raw)return NaN;
  const neg=raw.startsWith("-");if(neg)raw=raw.slice(1);
  let normalized=raw;
  if(/^\d{1,3}([.,]\d{3})+$/.test(raw)) normalized=raw.replace(/[.,]/g,"");
  else if(raw.includes(",")&&raw.includes(".")) normalized=raw.lastIndexOf(",")>raw.lastIndexOf(".")?raw.replace(/\./g,"").replace(",", "."):raw.replace(/,/g,"");
  else if(raw.includes(",")){const parts=raw.split(",");normalized=parts.length===2&&parts[1].length===3?parts.join(""):raw.replace(",", ".")}
  else if((raw.match(/\./g)||[]).length>1||/\.\d{3}$/.test(raw))normalized=raw.replace(/\./g,"");
  const n=Number(normalized);return Number.isFinite(n)?(neg?-n:n):NaN;
}
function parseSpokenClpGrouping(value){
  const text=normalizeText(value).replace(/\b(?:pesos?|chilenos?|clp)\b/g," ").replace(/\s+/g," ").trim();
  const m=text.match(/^(\d+)\s*(?:punto|\.)\s*(.+)$/);if(!m)return NaN;
  const digitWords={cero:"0",zero:"0",uno:"1",una:"1",un:"1",dos:"2",tres:"3",cuatro:"4",cinco:"5",seis:"6",siete:"7",ocho:"8",nueve:"9"};
  const tail=m[2].replace(/(?:punto|\.)/g," ").replace(/[,;-]/g," ").split(/\s+/).filter(Boolean);let digits="";
  for(const token of tail){if(/^\d+$/.test(token)){digits+=token;continue}if(Object.prototype.hasOwnProperty.call(digitWords,token)){digits+=digitWords[token];continue}return NaN}
  if(!digits||digits.length>6)return NaN;const n=Number(`${m[1]}${digits}`);return Number.isFinite(n)?n:NaN;
}
function parseClpAmount(value){
  if(typeof value==="number")return Number.isFinite(value)?Math.max(0,Math.round(value)):0;
  const raw=String(value??"").trim();if(!raw)return 0;
  const normalized=normalizeText(raw);
  const spokenGrouping=parseSpokenClpGrouping(normalized);if(Number.isFinite(spokenGrouping)&&spokenGrouping>=0)return Math.round(spokenGrouping);
  const hasScale=/\b(mil|miles|millon|millones|luca|lucas)\b/.test(normalized);
  if(hasScale){
    const spoken=spokenSpanishInteger(normalized);
    if(Number.isFinite(spoken)&&spoken>=0)return Math.round(spoken);
  }
  const numeric=parseClpNumeric(raw);if(Number.isFinite(numeric)&&numeric>=0)return Math.round(numeric);
  const spoken=spokenSpanishInteger(normalized);return Number.isFinite(spoken)&&spoken>=0?Math.round(spoken):0;
}
function formatClpEditable(value){const n=parseClpAmount(value);return n?new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(n):"0"}
function clpLabel(value){return `CLP ${money(parseClpAmount(value))}`}

// R9.18.22 · Voz CLP natural. La interfaz conserva $30.000, pero TTS recibe "treinta mil pesos".
const CLP_UNITS=["cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez","once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve","veinte","veintiuno","veintidós","veintitrés","veinticuatro","veinticinco","veintiséis","veintisiete","veintiocho","veintinueve"];
const CLP_TENS={30:"treinta",40:"cuarenta",50:"cincuenta",60:"sesenta",70:"setenta",80:"ochenta",90:"noventa"};
const CLP_HUNDREDS={2:"doscientos",3:"trescientos",4:"cuatrocientos",5:"quinientos",6:"seiscientos",7:"setecientos",8:"ochocientos",9:"novecientos"};
function clpApocope(text){return String(text||"").replace(/veintiuno$/,"veintiún").replace(/ y uno$/," y un").replace(/uno$/,"un")}
function clpUnder100(n){n=Math.trunc(n);if(n<30)return CLP_UNITS[n]||"";const t=Math.trunc(n/10)*10,u=n%10;return u?`${CLP_TENS[t]} y ${CLP_UNITS[u]}`:CLP_TENS[t]}
function clpUnder1000(n){n=Math.trunc(n);if(n<100)return clpUnder100(n);if(n===100)return"cien";const h=Math.trunc(n/100),r=n%100;const head=h===1?"ciento":CLP_HUNDREDS[h];return r?`${head} ${clpUnder100(r)}`:head}
function clpIntegerWords(value){
  let n=Math.max(0,Math.round(Number(value)||0));if(n===0)return"cero";
  if(n<1000)return clpUnder1000(n);
  if(n<1_000_000){const th=Math.trunc(n/1000),r=n%1000;const head=th===1?"mil":`${clpApocope(clpUnder1000(th))} mil`;return r?`${head} ${clpUnder1000(r)}`:head}
  if(n<1_000_000_000){const m=Math.trunc(n/1_000_000),r=n%1_000_000;const head=m===1?"un millón":`${clpApocope(clpIntegerWords(m))} millones`;return r?`${head} ${clpIntegerWords(r)}`:head}
  const b=Math.trunc(n/1_000_000_000),r=n%1_000_000_000;const head=b===1?"mil millones":`${clpApocope(clpIntegerWords(b))} mil millones`;return r?`${head} ${clpIntegerWords(r)}`:head;
}
function clpSpeechAmount(value){const n=parseClpAmount(value);return `${clpIntegerWords(n)} ${n===1?"peso":"pesos"}`}
function speechFriendlyClpText(value){
  let text=String(value??"");
  const replaceAmount=(_,raw)=>clpSpeechAmount(raw);
  text=text.replace(/\bCLP\s*\$?\s*([0-9][0-9.\s,]*)\s*(?:pesos?(?:\s+chilenos?)?)?/gi,replaceAmount);
  text=text.replace(/\$\s*([0-9][0-9.\s,]*)\s*(?:pesos?(?:\s+chilenos?)?)?/gi,replaceAmount);
  text=text.replace(/\b([0-9]{1,3}(?:[.]\d{3})+)\s+pesos?(?:\s+chilenos?)?\b/gi,replaceAmount);
  return text.replace(/\s{2,}/g," ").trim();
}
function normalizeClpInput(input){if(!input)return;const n=parseClpAmount(input.value);input.value=n?new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(n):"0"}
function speechRecognitionCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function listenClpAmount(input,button){
  const Ctor=speechRecognitionCtor();if(!Ctor)return toast("El reconocimiento de voz no está disponible en este navegador");
  const rec=new Ctor();rec.lang="es-CL";rec.interimResults=false;rec.maxAlternatives=3;button?.classList.add("is-listening");
  rec.onresult=e=>{const transcript=Array.from(e.results?.[0]||[]).map(x=>x.transcript).join(" ")||e.results?.[0]?.[0]?.transcript||"";const amount=parseClpAmount(transcript);if(!amount){toast(`No pude interpretar el monto: ${transcript}`);return}input.value=new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(amount);input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));toast(`Monto reconocido: ${clpLabel(amount)}`)};
  rec.onerror=()=>toast("No fue posible escuchar el monto");rec.onend=()=>button?.classList.remove("is-listening");rec.start();
}
function installStaticClpFields(){
  [["#pPrice","Precio"],["#ocDispatch","Despacho"],["#sDelivery","Valor despacho"]].forEach(([sel,label])=>{const input=$(sel);if(!input||input.dataset.clpReady)return;input.dataset.clpReady="1";input.type="text";input.inputMode="numeric";input.autocomplete="off";input.classList.add("clp-money-input");const wrap=document.createElement("div");wrap.className="clp-input-shell";input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);const prefix=document.createElement("span");prefix.className="clp-input-prefix";prefix.textContent="CLP $";wrap.insertBefore(prefix,input);const Ctor=speechRecognitionCtor();if(Ctor){const mic=document.createElement("button");mic.type="button";mic.className="clp-voice-btn";mic.title=`Dictar ${label}`;mic.setAttribute("aria-label",`Dictar ${label}`);mic.innerHTML='<i class="bi bi-mic-fill"></i>';mic.addEventListener("click",()=>listenClpAmount(input,mic));wrap.appendChild(mic)}input.addEventListener("blur",()=>normalizeClpInput(input));});
}
const FINAL_ORDER_STATES=new Set(["ENTREGADO","CANCELADO"]);
function orderState(value){return String(value||"").trim().toUpperCase()}
function isFinalOrder(orderOrState){return FINAL_ORDER_STATES.has(orderState(typeof orderOrState==="object"?orderOrState?.estado:orderOrState))}
function orderFinalMessage(state){return orderState(state)==="CANCELADO"?"Pedido cancelado · estado final e irreversible":"Pedido entregado · estado final e irreversible"}
let token=localStorage.getItem("aleAdminToken")||sessionStorage.getItem("aleAdminToken")||"", data={products:[],categories:[],banners:[],orders:[],requests:[],quotes:[],clients:[],users:[],suppliers:[],supplies:[],purchases:[],purchaseItems:[],gallery:[],config:{},currentUser:null};

// R9.15.1 · Sesión estable: una falla temporal de red nunca borra una sesión válida.
const sleepMs=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function sessionErrorCode(err){return String(err?.message||err||"").toUpperCase()}
function isDefinitiveSessionError(err){
  const code=sessionErrorCode(err);
  return ["SESION_INVALIDA","SESION_EXPIRADA","SESION_REQUERIDA","USUARIO_INACTIVO"].some(x=>code.includes(x));
}
function isTransientSessionError(err){
  const code=sessionErrorCode(err);
  return ["API_TIMEOUT","API_CONEXION_FALLIDA","RESPUESTA_API_INVALIDA","HTTP_500","HTTP_502","HTTP_503","HTTP_504","NETWORK","FETCH"].some(x=>code.includes(x));
}
function persistAdminToken(value){
  token=String(value||"");
  if(token){localStorage.setItem("aleAdminToken",token);sessionStorage.setItem("aleAdminToken",token)}
}
function clearAdminToken(){
  sessionStorage.removeItem("aleAdminToken");localStorage.removeItem("aleAdminToken");token="";data.currentUser=null;
}
async function validateStoredSession(attempts=3){
  let last=null;
  for(let i=0;i<attempts;i++){
    try{return await AleAPI.post("session",{},token)}catch(err){
      last=err;
      if(isDefinitiveSessionError(err))throw err;
      if(i<attempts-1)await sleepMs(550*(i+1));
    }
  }
  throw last||new Error("API_CONEXION_FALLIDA");
}


// R9.18.38 · Filtros de tablas comerciales. Por defecto se muestra HOY para evitar tablas interminables.
function localDateKey(value){
  if(!value)return "";const d=new Date(value);if(!Number.isNaN(d.getTime()))return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const m=String(value).match(/^(\d{4}-\d{2}-\d{2})/);return m?m[1]:"";
}
function todayDateKey(){return localDateKey(new Date())}
const commercialFilters={orders:{search:"",from:todayDateKey(),to:todayDateKey(),saleType:""},requests:{search:"",from:todayDateKey(),to:todayDateKey()},quotes:{search:"",from:todayDateKey(),to:todayDateKey()}};
function normalizeFilterText(v){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function recordDateFor(kind,row){return kind==="quotes"?(row.fecha||row.creado_en||row.created_at):(row.fecha||row.created_at||row.creado_en)}
function recordSearchText(kind,row){
  const fields=kind==="orders"?[row.numero_pedido,row.nombre,row.rut,row.telefono,row.email,row.metodo_entrega,row.direccion,row.comuna,row.total,row.estado,row.estado_pago,row.medio_pago,row.tipo_venta,row.origen,row.lista_precio_nombre]:kind==="requests"?[row.numero_solicitud,row.nombre,row.rut,row.telefono,row.email,row.tipo,row.fecha_evento,row.detalle,row.estado]:[row.numero_cotizacion,row.numero_solicitud,row.cliente_nombre,row.rut,row.telefono,row.email,row.subtotal,row.iva,row.total,row.estado,row.pedido_numero];
  return normalizeFilterText(fields.filter(v=>v!==undefined&&v!==null).join(" "));
}
function filteredCommercialRows(kind,rows){
  const f=commercialFilters[kind]||{};const q=normalizeFilterText(f.search).trim();
  return (rows||[]).filter(row=>{const dk=recordDateFor(kind,row);const key=localDateKey(dk);if(f.from&&(!key||key<f.from))return false;if(f.to&&(!key||key>f.to))return false;if(kind==="orders"&&f.saleType&&String(row.tipo_venta||row.origen||"MINORISTA").toUpperCase()!==f.saleType)return false;if(q&&!recordSearchText(kind,row).includes(q))return false;return true});
}
function updateCommercialFilterUi(kind,visible,total){
  const f=commercialFilters[kind],from=$("#"+kind+"From"),to=$("#"+kind+"To"),search=$("#"+kind+"Search"),today=$("#"+kind+"Today"),meta=$("#"+kind+"FilterMeta"),td=todayDateKey(),saleType=kind==="orders"?$("#ordersSaleType"):null;
  if(from&&from.value!==f.from)from.value=f.from||"";if(to&&to.value!==f.to)to.value=f.to||"";if(search&&search.value!==f.search)search.value=f.search||"";if(saleType&&saleType.value!==(f.saleType||""))saleType.value=f.saleType||"";today?.classList.toggle("is-active",f.from===td&&f.to===td);
  if(meta){const range=f.from||f.to?(f.from===f.to?`Fecha: ${f.from||f.to}`:`Desde ${f.from||"inicio"} hasta ${f.to||"hoy"}`):"Todas las fechas";const typeLabel=kind==="orders"&&f.saleType?` · ${f.saleType}`:"";meta.textContent=`Mostrando ${visible} de ${total} · ${range}${typeLabel}${f.search?` · búsqueda: “${f.search}”`:""}`;}
}
function renderCommercialKind(kind){if(kind==="orders")renderOrders();else if(kind==="requests")renderRequests();else if(kind==="quotes")renderQuotes()}
function bindCommercialFilter(kind){
  const f=commercialFilters[kind],search=$("#"+kind+"Search"),from=$("#"+kind+"From"),to=$("#"+kind+"To"),today=$("#"+kind+"Today"),all=$("#"+kind+"All"),saleType=kind==="orders"?$("#ordersSaleType"):null;
  if(search)search.addEventListener("input",()=>{f.search=search.value;renderCommercialKind(kind)});
  saleType?.addEventListener("change",()=>{f.saleType=String(saleType.value||"").toUpperCase();renderCommercialKind(kind)});
  [from,to].forEach((el,idx)=>{if(!el)return;el.addEventListener("keydown",e=>{if(!["Tab","Shift"].includes(e.key))e.preventDefault()});el.addEventListener("paste",e=>e.preventDefault());el.addEventListener("click",()=>{try{el.showPicker?.()}catch(_){}});el.addEventListener("change",()=>{if(idx===0)f.from=el.value;else f.to=el.value;if(f.from&&f.to&&f.from>f.to){if(idx===0)f.to=f.from;else f.from=f.to}renderCommercialKind(kind)});});
  today?.addEventListener("click",()=>{const d=todayDateKey();f.from=d;f.to=d;renderCommercialKind(kind)});
  all?.addEventListener("click",()=>{f.from="";f.to="";renderCommercialKind(kind)});
}
["orders","requests","quotes"].forEach(bindCommercialFilter);

// R9.15.0 · Selección múltiple para eliminación masiva.
const bulkSelection={products:new Set(),requests:new Set(),quotes:new Set()};
function selectedSet(kind){return bulkSelection[kind]||new Set()}
function pruneSelection(kind,items){
  const valid=new Set((items||[]).map(x=>String(x.id)));
  const set=selectedSet(kind);for(const id of [...set])if(!valid.has(String(id)))set.delete(id);
}
function bulkCheckbox(kind,id){
  const checked=selectedSet(kind).has(String(id));
  return `<input class="bulk-check" type="checkbox" data-bulk-kind="${esc(kind)}" data-bulk-id="${esc(id)}" ${checked?"checked":""} aria-label="Seleccionar registro">`;
}
function bulkHeaderCheckbox(kind,visibleIds){
  const ids=(visibleIds||[]).map(String),set=selectedSet(kind);
  const all=ids.length>0&&ids.every(id=>set.has(id));
  return `<input class="bulk-check" type="checkbox" data-bulk-select-all="${esc(kind)}" ${all?"checked":""} aria-label="Seleccionar todos los registros visibles" title="Seleccionar todos los registros visibles">`;
}
function updateBulkBar(kind){
  const set=selectedSet(kind),count=set.size;
  const map={products:["#productsBulkBar","#productsSelectedCount","producto","productos"],requests:["#requestsBulkBar","#requestsSelectedCount","solicitud","solicitudes"],quotes:["#quotesBulkBar","#quotesSelectedCount","cotización","cotizaciones"]};
  const m=map[kind];if(!m)return;
  const bar=$(m[0]),label=$(m[1]);if(label)label.textContent=`${count} ${count===1?m[2]:m[3]} seleccionado${kind==="products"?(count===1?"":"s"):(count===1?"a":"as")}`;
  if(bar)bar.classList.toggle("hidden",count===0);
}
function syncSelectedRows(host){
  host?.querySelectorAll('input[data-bulk-id]').forEach(cb=>cb.closest('tr')?.classList.toggle('is-selected',cb.checked));
}
function handleBulkCheckboxChange(e){
  const cb=e.target.closest?.('input[data-bulk-id]');if(!cb)return false;
  const kind=cb.dataset.bulkKind,id=String(cb.dataset.bulkId||"");const set=selectedSet(kind);if(cb.checked)set.add(id);else set.delete(id);
  cb.closest('tr')?.classList.toggle('is-selected',cb.checked);updateBulkBar(kind);
  const host=cb.closest('.table-wrap');const head=host?.querySelector(`input[data-bulk-select-all="${CSS.escape(kind)}"]`);
  if(head){const rows=[...host.querySelectorAll(`input[data-bulk-kind="${CSS.escape(kind)}"]`)];head.checked=rows.length>0&&rows.every(x=>x.checked);head.indeterminate=rows.some(x=>x.checked)&&!head.checked}
  return true;
}
function handleBulkSelectAllChange(e,visibleIds){
  const cb=e.target.closest?.('input[data-bulk-select-all]');if(!cb)return false;
  const kind=cb.dataset.bulkSelectAll,set=selectedSet(kind);for(const id of visibleIds.map(String)){if(cb.checked)set.add(id);else set.delete(id)}
  return true;
}
function clearBulkSelection(kind){selectedSet(kind).clear();updateBulkBar(kind)}
async function refreshAfterConfirmedDelete(kind){
  // La sincronización visual es posterior al DELETE y nunca puede cambiar su resultado.
  try{
    const moduleMap={products:"products",requests:"requests",quotes:"quotes"};
    const module=moduleMap[kind];
    if(module&&typeof loadAdminModules==="function"){
      const refreshed=await loadAdminModules({modules:[module],retry:true});
      return refreshed?.ok!==false;
    }
    await reload();
    return true;
  }catch(err){
    console.warn("post-delete refresh",err);
    // El registro ya fue eliminado. Dejamos la sincronización general en segundo plano.
    try{scheduleAdminRetry?.([kind])}catch(_){}
    return false;
  }
}

function applyVerifiedDeleteResult(kind,ids,out){
  const remainingIds=Array.isArray(out?.remainingIds)?out.remainingIds.map(String):[];
  const remaining=Number(out?.remaining||remainingIds.length||0);
  if(out?.ok===false||remaining>0){
    const set=selectedSet(kind);set.clear();for(const id of remainingIds)set.add(String(id));updateBulkBar(kind);
    throw Object.assign(new Error(out?.error||"ELIMINACION_INCOMPLETA"),{payload:out});
  }
  clearBulkSelection(kind);
  const deleted=Number(out?.deleted||0),missing=Number(out?.missing||0),blocked=Number(out?.blocked||0);
  const confirmed=Math.max(0,deleted+missing);
  return{deleted,missing,blocked,confirmed};
}

async function verifyDeleteAfterAmbiguousError(kind,ids,err){
  const code=String(err?.message||err||"").toUpperCase();
  const ambiguous=["API_TIMEOUT","API_CONEXION_FALLIDA","RESPUESTA_API_INVALIDA","HTTP_502","HTTP_503","HTTP_504","NETWORK","FETCH"].some(x=>code.includes(x));
  if(!ambiguous||typeof AleAPI.verifyBulkDelete!=="function")return null;
  try{return await AleAPI.verifyBulkDelete({kind,ids},token)}catch(verifyErr){console.warn("bulk delete verification",verifyErr);return null}
}

async function deleteSelected(kind,btn){
  let ids=[...selectedSet(kind)];if(!ids.length)return;
  if(kind==="requests"){const closed=ids.filter(id=>String(data.requests.find(r=>String(r.id)===String(id))?.estado||"").toUpperCase()==="CERRADA");if(closed.length){closed.forEach(id=>selectedSet(kind).delete(String(id)));ids=ids.filter(id=>!closed.includes(id));updateBulkBar(kind);toast(`⚠ ${closed.length} solicitud${closed.length===1?" CERRADA fue excluida":"es CERRADAS fueron excluidas"} de la eliminación masiva.`);if(!ids.length)return;}}
  if(kind==="quotes"){const used=ids.filter(id=>quoteIsConsumed(data.quotes.find(q=>String(q.id)===String(id))));if(used.length){used.forEach(id=>selectedSet(kind).delete(String(id)));ids=ids.filter(id=>!used.includes(id));updateBulkBar(kind);toast(`⚠ ${used.length} cotización${used.length===1?" UTILIZADA fue excluida":"es UTILIZADAS fueron excluidas"} de la eliminación masiva.`);if(!ids.length)return;}}
  const names={products:"productos",requests:"solicitudes",quotes:"cotizaciones"};
  const extra=kind==="products"?" Los productos se eliminarán definitivamente de la base. Las imágenes locales de GitHub no se borran; las imágenes propias de Supabase Storage sí se limpian cuando corresponda.":kind==="requests"?" Las cotizaciones ya creadas se conservarán, pero quedarán sin solicitud asociada.":" Los PDF asociados guardados en Supabase Storage también se eliminarán cuando correspondan.";
  if(!confirm(`¿Eliminar definitivamente ${ids.length} ${names[kind]} seleccionados?${extra}\n\nEsta acción no se puede deshacer.`))return;
  await busy(btn,async()=>{
    let out=null;
    try{
      out=typeof AleAPI.bulkDeleteEntities==="function"
        ? await AleAPI.bulkDeleteEntities({kind,ids},token)
        : await AleAPI.post("bulkDeleteEntities",{kind,ids},token);
    }catch(err){
      console.warn("bulk delete transport",err);
      const verified=await verifyDeleteAfterAmbiguousError(kind,ids,err);
      if(verified?.ok&&verified?.confirmed===true&&Number(verified.remaining||0)===0){
        out={ok:true,requested:ids.length,deleted:Number(verified.absent||verified.deleted||ids.length),missing:0,remaining:0,remainingIds:[],verifiedAfterTransportError:true};
      }else if(verified?.ok&&verified?.confirmed===false&&Number(verified.remaining||0)>0){
        out={...verified,ok:false,error:"ELIMINACION_INCOMPLETA"};
      }else{
        const code=String(err?.message||err||"").toUpperCase();
        if(code.includes("ELIMINACION_INCOMPLETA")&&err?.payload){
          out={...err.payload,ok:false};
        }else if(code.includes("PERMISO_DENEGADO")){
          return toast("✕ Tu usuario no tiene permiso para eliminar estos registros");
        }else if(code.includes("ACCION_NO_VALIDA")){
          return toast("✕ La Edge Function está desactualizada. Despliega el index.ts de esta versión");
        }else if(code.includes("SESION_")){
          return toast("✕ La sesión ya no es válida. Vuelve a iniciar sesión");
        }else if(code.includes("TIMEOUT")||code.includes("CONEXION")){
          return toast("⚠ Supabase no respondió, pero el resultado no pudo verificarse. Actualiza la tabla antes de reintentar");
        }else{
          return toast(`✕ No fue posible solicitar la eliminación múltiple${code?` (${code.slice(0,80)})`:""}`);
        }
      }
    }

    try{
      const result=applyVerifiedDeleteResult(kind,ids,out||{});
      toast(`✓ Eliminación confirmada: ${result.confirmed} registro${result.confirmed===1?"":"s"} procesado${result.confirmed===1?"":"s"}${result.missing?` · ${result.missing} ya no existían`:""}${result.blocked?` · ${result.blocked} registro${result.blocked===1?"":"s"} protegido${result.blocked===1?"":"s"}`:""}`);
      // MUY IMPORTANTE: la recarga NO forma parte del resultado de la eliminación.
      const refreshed=await refreshAfterConfirmedDelete(kind);
      if(!refreshed)toast("✓ Eliminación realizada. La actualización visual se reintentará automáticamente");
    }catch(err){
      console.warn("bulk delete result",err);
      const code=String(err?.message||err||"").toUpperCase();
      if(code.includes("ELIMINACION_INCOMPLETA"))return toast("⚠ Eliminación parcial: algunos registros permanecen seleccionados para reintentar");
      toast(`✕ No fue posible confirmar la eliminación${code?` (${code.slice(0,80)})`:""}`);
    }
  });
}


// Menú lateral R9.17.2: rail compacto + expansión automática por cursor.
const adminSidebar=$("#adminSidebar"), sidebarBackdrop=$("#sidebarBackdrop"), menuToggle=$("#menuToggle"), sidebarClose=$("#sidebarClose"), sidebarRailToggle=$("#sidebarRailToggle");
const sidebarIsMobile=()=>window.matchMedia("(max-width: 1000px)").matches;
let sidebarHoverCloseTimer=null;

function syncSidebarA11y(open){
  const next=!!open;
  menuToggle?.setAttribute("aria-expanded",String(next));
  sidebarRailToggle?.setAttribute("aria-expanded",String(next));
  if(menuToggle)menuToggle.setAttribute("aria-label",next?"Cerrar menú":"Abrir menú");
  if(sidebarRailToggle){
    sidebarRailToggle.setAttribute("aria-label",next?"Menú expandido":"Expandir menú");
    sidebarRailToggle.title=next?"Menú expandido":"Expandir menú";
  }
}

function setSidebarOpen(open){
  if(!adminSidebar)return;
  clearTimeout(sidebarHoverCloseTimer);
  if(sidebarIsMobile()){
    const next=!!open;
    adminSidebar.classList.toggle("is-open",next);
    sidebarBackdrop?.classList.toggle("is-open",next);
    document.body.classList.toggle("menu-open",next);
    document.body.classList.toggle("sidebar-peek-open",next);
    document.body.classList.remove("sidebar-collapsed");
    syncSidebarA11y(next);
    return;
  }
  const next=!!open;
  document.body.classList.toggle("sidebar-collapsed",!next);
  document.body.classList.toggle("sidebar-hover-open",next);
  adminSidebar.classList.remove("is-open");
  sidebarBackdrop?.classList.remove("is-open");
  document.body.classList.remove("menu-open","sidebar-peek-open");
  syncSidebarA11y(next);
}

function scheduleSidebarCollapse(){
  if(sidebarIsMobile())return;
  clearTimeout(sidebarHoverCloseTimer);
  sidebarHoverCloseTimer=setTimeout(()=>{
    // Si el usuario navega con teclado dentro del menú, se mantiene abierto.
    if(adminSidebar?.contains(document.activeElement))return;
    setSidebarOpen(false);
  },140);
}

function restoreSidebarState(){
  // Escritorio siempre inicia como rail compacto. En móvil permanece off-canvas.
  setSidebarOpen(false);
}

// Escritorio: entrar con el cursor abre; salir vuelve automáticamente al ancho de iconos.
adminSidebar?.addEventListener("pointerenter",()=>{
  if(sidebarIsMobile())return;
  clearTimeout(sidebarHoverCloseTimer);
  setSidebarOpen(true);
});
adminSidebar?.addEventListener("pointerleave",scheduleSidebarCollapse);

// Accesibilidad por teclado: el rail también se expande al recibir foco.
adminSidebar?.addEventListener("focusin",()=>{if(!sidebarIsMobile())setSidebarOpen(true)});
adminSidebar?.addEventListener("focusout",e=>{
  if(sidebarIsMobile())return;
  if(adminSidebar?.contains(e.relatedTarget))return;
  scheduleSidebarCollapse();
});

menuToggle?.addEventListener("click",()=>{
  if(sidebarIsMobile()) setSidebarOpen(!adminSidebar.classList.contains("is-open"));
  else setSidebarOpen(true);
});
sidebarRailToggle?.addEventListener("click",()=>setSidebarOpen(true));
sidebarClose?.addEventListener("click",()=>setSidebarOpen(false));
sidebarBackdrop?.addEventListener("click",()=>setSidebarOpen(false));
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape")return;
  setSidebarOpen(false);
});
window.addEventListener("resize",restoreSidebarState);

// Tooltips accesibles para el rail compacto de escritorio.
$$('.admin-nav button').forEach(btn=>{const label=btn.textContent.trim();if(label){btn.title=label;btn.setAttribute('aria-label',label)}});
$$('.nav-group summary').forEach(summary=>{
  const label=summary.querySelector('span')?.textContent?.trim()||'Grupo';
  summary.title=label;
  summary.setAttribute('aria-label',label);
});
$$('.sidebar-bottom .btn').forEach(btn=>{const label=btn.textContent.trim();if(label){btn.title=label;btn.setAttribute('aria-label',label)}});

// Sidebar categorizado: un solo bloque abierto a la vez y el grupo activo permanece visible.
const NAV_GROUP_STORAGE='aleAtencioAdminNavGroupV1';
function openNavGroupForButton(btn,{persist=true}={}){
  const group=btn?.closest?.('.nav-group');
  if(!group)return;
  $$('.nav-group').forEach(x=>{if(x!==group)x.removeAttribute('open')});
  group.setAttribute('open','');
  if(persist)try{localStorage.setItem(NAV_GROUP_STORAGE,group.dataset.navGroup||'')}catch{}
}
$$('.nav-group').forEach(group=>{
  group.addEventListener('toggle',()=>{
    if(group.open){
      $$('.nav-group').forEach(x=>{if(x!==group)x.removeAttribute('open')});
      try{localStorage.setItem(NAV_GROUP_STORAGE,group.dataset.navGroup||'')}catch{}
      return;
    }
    try{if(localStorage.getItem(NAV_GROUP_STORAGE)===(group.dataset.navGroup||''))localStorage.removeItem(NAV_GROUP_STORAGE)}catch{}
  });
});
try{
  const saved=localStorage.getItem(NAV_GROUP_STORAGE);
  if(saved){document.querySelector(`.nav-group[data-nav-group="${CSS.escape(saved)}"]`)?.setAttribute('open','')}
}catch{}
restoreSidebarState();

function toast(msg){const t=$("#adminToast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}

// ========================= NOTIFICACIONES R9.18.26 · ESTADO SERVIDOR =========================
const NOTIFY_STORE_PREFIX="aleAtencioAdminNotificationsV3";
const NOTIFY_LEGACY_STORE_KEY="aleAtencioAdminNotificationsV2";
const NOTIFY_CURSOR_PREFIX="aleAtencioAdminNotifyCursorV3";
const NOTIFY_LEGACY_OWNER_KEY="aleAtencioAdminNotificationsV2Owner";
const NOTIFY_VOICE_KEY="aleAtencioAdminVoiceV2";
const NOTIFY_READ_MIGRATION_PREFIX="aleAtencioNotifyReadMigratedV1";
let notifyTimer=null;
let notifyBusy=false;
let notifyVoice=localStorage.getItem(NOTIFY_VOICE_KEY)!=="0";
let notifications=[];
let notificationCacheUserId="";

function notificationUserId(){return String(data.currentUser?.id||"").trim()}
function notificationStoreKey(){const uid=notificationUserId();return `${NOTIFY_STORE_PREFIX}:${uid||"anonymous"}`}
function notificationCursorKey(){const uid=notificationUserId();return `${NOTIFY_CURSOR_PREFIX}:${uid||"anonymous"}`}
function loadNotificationCache(){
  const uid=notificationUserId();
  if(!uid||notificationCacheUserId===uid)return;
  notificationCacheUserId=uid;
  let raw=localStorage.getItem(notificationStoreKey());
  // Migración única desde la caché antigua: se vincula al primer usuario que actualiza para no mezclar cuentas.
  if(raw===null){
    const legacy=localStorage.getItem(NOTIFY_LEGACY_STORE_KEY),owner=localStorage.getItem(NOTIFY_LEGACY_OWNER_KEY);
    if(legacy!==null&&(!owner||owner===uid)){raw=legacy;if(!owner)localStorage.setItem(NOTIFY_LEGACY_OWNER_KEY,uid)}
  }
  try{const parsed=JSON.parse(raw||"[]");notifications=Array.isArray(parsed)?parsed.slice(0,60):[]}catch(_){notifications=[]}
}
function persistNotifications(){
  notifications=notifications.slice(0,60);
  const uid=notificationUserId();if(uid)localStorage.setItem(notificationStoreKey(),JSON.stringify(notifications));
}
function unreadCount(){return notifications.filter(n=>!n.read).length}
function notificationIcon(kind){return kind==="payment"?"credit-card-2-front":kind==="transfer"?"bank":kind==="order"?"bag-check":"clipboard-heart"}
function notificationKicker(kind){return kind==="payment"?"PAGO CONFIRMADO":kind==="transfer"?"COMPROBANTE RECIBIDO":kind==="order"?"NUEVO PEDIDO":"NUEVA SOLICITUD"}
function renderNotificationCenter(){
  const badge=$("#notificationBadge"), list=$("#notificationList"), voiceBtn=$("#notificationVoiceToggle");
  if(badge){const n=unreadCount();badge.textContent=String(n);badge.classList.toggle("hidden",n===0)}
  if(voiceBtn){voiceBtn.innerHTML=`<i class="bi bi-${notifyVoice?"volume-up":"volume-mute"}"></i><span>${notifyVoice?"Voz activada":"Voz silenciada"}</span>`}
  if(!list)return;
  if(!notifications.length){list.innerHTML='<div class="notification-empty">No hay notificaciones nuevas.</div>';return}
  list.innerHTML=notifications.map(n=>`<button type="button" class="notification-item ${n.read?"":"unread"}" data-notification-key="${esc(n.key)}" data-notification-view="${esc(n.view)}"><span class="notification-icon ${n.kind}"><i class="bi bi-${notificationIcon(n.kind)}"></i></span><span class="notification-copy"><strong>${esc(n.title)}</strong><small>${esc(n.message)}</small><time>${esc(formatDate(n.at))}</time></span>${n.read?"":'<span class="notification-dot" aria-label="No leída"></span>'}</button>`).join("");
}
function setNotificationPanel(open){
  const panel=$("#notificationPanel"), bell=$("#notificationBell");
  if(!panel)return;
  panel.classList.toggle("hidden",!open);bell?.setAttribute("aria-expanded",String(open));
}
function speakNotification(text){
  if(!notifyVoice||!("speechSynthesis" in window))return;
  try{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(speechFriendlyClpText(text));u.lang="es-CL";u.rate=.96;u.pitch=1;window.speechSynthesis.speak(u)}catch(_){ }
}
function showNotificationCard(n){
  const stack=$("#notificationToastStack");if(!stack)return;
  const card=document.createElement("button");card.type="button";card.className=`notification-toast-card ${n.kind}`;card.innerHTML=`<span class="notification-toast-icon"><i class="bi bi-${notificationIcon(n.kind)}"></i></span><span><small>${notificationKicker(n.kind)}</small><strong>${esc(n.message)}</strong></span><i class="bi bi-chevron-right"></i>`;
  card.addEventListener("click",()=>{markNotificationRead(n.key);openAdminView(n.view);card.remove()});
  stack.prepend(card);requestAnimationFrame(()=>card.classList.add("show"));
  setTimeout(()=>{card.classList.remove("show");setTimeout(()=>card.remove(),260)},9000);
}
function applyServerReadKeys(keys){
  const set=new Set((Array.isArray(keys)?keys:[]).map(String));if(!set.size)return false;
  let changed=false;for(const n of notifications){if(!n.read&&set.has(String(n.key))){n.read=true;changed=true}}
  if(changed){persistNotifications();renderNotificationCenter()}return changed;
}
async function markNotificationRead(key){
  key=String(key||"").trim();if(!key)return false;
  const n=notifications.find(x=>x.key===key),wasRead=!!n?.read;
  if(n){n.read=true;persistNotifications();renderNotificationCenter()}
  try{await AleAPI.markNotificationRead(key,token);return true}catch(err){
    console.warn("notificationRead",err);
    if(n&&!wasRead){n.read=false;persistNotifications();renderNotificationCenter()}
    toast("No fue posible sincronizar la lectura de la notificación");return false;
  }
}
async function markAllNotificationsRead(){
  const keys=notifications.filter(n=>!n.read).map(n=>String(n.key)).filter(Boolean);
  if(!keys.length)return true;
  const previous=new Set(keys);notifications.forEach(n=>{if(previous.has(String(n.key)))n.read=true});persistNotifications();renderNotificationCenter();
  try{await AleAPI.markAllNotificationsRead(keys,token);return true}catch(err){
    console.warn("notificationReadAll",err);
    notifications.forEach(n=>{if(previous.has(String(n.key)))n.read=false});persistNotifications();renderNotificationCenter();
    toast("No fue posible sincronizar las notificaciones");return false;
  }
}
async function migrateLocalReadStateOnce(){
  const uid=notificationUserId();if(!uid||!token)return;
  const flag=`${NOTIFY_READ_MIGRATION_PREFIX}:${uid}`;if(localStorage.getItem(flag)==="1")return;
  const keys=notifications.filter(n=>n.read).map(n=>String(n.key)).filter(Boolean);
  try{if(keys.length)await AleAPI.markAllNotificationsRead(keys,token);localStorage.setItem(flag,"1")}catch(err){console.warn("notification read migration",err)}
}
function addIncomingNotification(kind,item,serverReadKeys){
  const suffix=kind==="payment"?String(item.fecha_pago||item.updated_at||"paid"):"";
  const key=`${kind}:${item.id}${suffix?":"+suffix:""}`;if(notifications.some(n=>n.key===key))return false;
  const isOrder=kind==="order",isPayment=kind==="payment",isTransfer=kind==="transfer";const name=String(item.nombre||"Cliente"),reqNumber=item.numero_solicitud||"",orderNumber=item.numero_pedido||item.id||"";
  const alreadyRead=serverReadKeys instanceof Set&&serverReadKeys.has(key);
  const n={key,kind,view:isOrder||isPayment||isTransfer?"orders":"requests",id:item.id,at:item.fecha_pago||item.updated_at||item.fecha||new Date().toISOString(),read:alreadyRead,title:isPayment?"Pago confirmado":isTransfer?"Comprobante de transferencia":isOrder?"Nuevo pedido":"Nueva solicitud",message:isTransfer?`${orderNumber} · ${name} · comprobante pendiente de revisión`:isPayment?`${orderNumber} · ${name} · ${money(item.total||0)}`:isOrder?`${orderNumber} · ${name} · ${money(item.total||0)}`:`${reqNumber?reqNumber+" · ":""}${name} · ${item.tipo||"Solicitud web"}`};
  notifications.unshift(n);persistNotifications();renderNotificationCenter();
  // Una alerta ya leída en otro dispositivo se incorpora al historial, pero no vuelve a interrumpir al usuario.
  if(!alreadyRead){showNotificationCard(n);speakNotification(isTransfer?`Comprobante de transferencia recibido para el pedido ${orderNumber}`:isPayment?`Pago confirmado del pedido ${orderNumber} por ${money(item.total||0)}`:isOrder?`Nuevo pedido recibido de ${name}`:`Nueva solicitud recibida de ${name}`)}
  return true;
}
function mergeIncomingFeed(feed){
  const serverReadKeys=new Set((feed?.readKeys||feed?.read_keys||[]).map(String));
  applyServerReadKeys([...serverReadKeys]);
  let changed=false,paymentChanged=false;
  for(const o of feed.orders||[]){
    const ix=data.orders.findIndex(x=>String(x.id)===String(o.id));const prev=ix>=0?data.orders[ix]:null;const prevPay=String(prev?.estado_pago||"").toUpperCase();
    if(ix<0){data.orders.unshift(o);changed=addIncomingNotification("order",o,serverReadKeys)||changed}else{data.orders[ix]={...prev,...o};changed=true}
    if(String(o.estado_pago||"").toUpperCase()==="PAGADO"){if(prevPay!=="PAGADO")paymentChanged=true;changed=addIncomingNotification("payment",o,serverReadKeys)||changed}
    if(String(o.comprobante_pago_estado||"").toUpperCase()==="PENDIENTE_REVISION"&&String(prev?.comprobante_pago_estado||"").toUpperCase()!=="PENDIENTE_REVISION")changed=addIncomingNotification("transfer",o,serverReadKeys)||changed;
  }
  for(const r of feed.requests||[]){const ix=data.requests.findIndex(x=>String(x.id)===String(r.id));if(ix<0){data.requests.unshift(r);changed=addIncomingNotification("request",r,serverReadKeys)||changed}else data.requests[ix]={...data.requests[ix],...r}}
  if(changed){renderOrders();renderRequests();$("#kpiOrders").textContent=data.orders.filter(x=>String(x.estado).toUpperCase()==="PENDIENTE").length;$("#kpiRequests").textContent=data.requests.filter(x=>String(x.estado).toUpperCase()==="NUEVA").length}
  if(paymentChanged){reportAnalytics=null;renderDashboardSalesSnapshot();if($("#view-reports")?.classList.contains("active"))loadReports(true).catch(err=>console.warn("report refresh after payment",err))}
}
async function pollNotifications(){
  if(!token||notifyBusy||document.body.classList.contains("login-open"))return;
  notifyBusy=true;
  try{
    const cursorKey=notificationCursorKey();
    let since=localStorage.getItem(cursorKey)||"";
    if(!since){since=new Date(Date.now()-24*60*60*1000).toISOString();localStorage.setItem(cursorKey,since)}
    const feed=await AleAPI.notificationFeed(since,token);
    mergeIncomingFeed(feed||{});
    if(feed?.serverTime)localStorage.setItem(cursorKey,feed.serverTime);
  }catch(err){console.warn("notificationFeed",err)}finally{notifyBusy=false}
}
function startNotificationWatcher(){
  stopNotificationWatcher();loadNotificationCache();renderNotificationCenter();migrateLocalReadStateOnce();
  const cursorKey=notificationCursorKey();if(!localStorage.getItem(cursorKey))localStorage.setItem(cursorKey,new Date(Date.now()-24*60*60*1000).toISOString());
  notifyTimer=setInterval(pollNotifications,5000);setTimeout(pollNotifications,700);
}
function stopNotificationWatcher(){if(notifyTimer){clearInterval(notifyTimer);notifyTimer=null}}

$("#notificationBell")?.addEventListener("click",e=>{e.stopPropagation();setNotificationPanel($("#notificationPanel").classList.contains("hidden"))});
$("#closeNotifications")?.addEventListener("click",()=>setNotificationPanel(false));
$("#markAllNotifications")?.addEventListener("click",()=>{markAllNotificationsRead()});
$("#notificationVoiceToggle")?.addEventListener("click",()=>{notifyVoice=!notifyVoice;localStorage.setItem(NOTIFY_VOICE_KEY,notifyVoice?"1":"0");renderNotificationCenter();toast(notifyVoice?"Voz de alertas activada":"Voz de alertas silenciada")});
$("#notificationList")?.addEventListener("click",e=>{const b=e.target.closest("[data-notification-key]");if(!b)return;markNotificationRead(b.dataset.notificationKey);setNotificationPanel(false);openAdminView(b.dataset.notificationView)});
document.addEventListener("click",e=>{if(!e.target.closest(".notification-wrap"))setNotificationPanel(false)});
renderNotificationCenter();
function showLogin(msg=""){
  stopNotificationWatcher();
  document.body.classList.add("auth-locked");
  document.body.classList.remove("auth-active","sidebar-peek-open");
  const shell=$("#adminShell"),login=$("#loginScreen");
  if(shell){shell.classList.add("hidden");shell.setAttribute("aria-hidden","true");try{shell.inert=true}catch(_){}}
  if(login){login.classList.remove("hidden");login.setAttribute("aria-hidden","false")}
  adminSidebar?.classList.remove("is-open");
  sidebarBackdrop?.classList.remove("is-open");
  menuToggle?.setAttribute("aria-expanded","false");
  sidebarRailToggle?.setAttribute("aria-expanded","false");
  if($("#apiWarning"))$("#apiWarning").textContent=msg;
}
function showAdmin(){
  if(!token)return showLogin("Ingresa para acceder al cPanel.");
  const shell=$("#adminShell"),login=$("#loginScreen");
  document.body.classList.remove("auth-locked");
  document.body.classList.add("auth-active");
  if(login){login.classList.add("hidden");login.setAttribute("aria-hidden","true")}
  if(shell){shell.classList.remove("hidden");shell.setAttribute("aria-hidden","false");try{shell.inert=false}catch(_){}}
}
function beginBusy(btn){if(!btn)return;btn.dataset.busy="1";btn.classList.add("is-loading");btn.disabled=true}
function endBusy(btn){if(!btn)return;delete btn.dataset.busy;btn.classList.remove("is-loading");btn.disabled=false}
async function busy(btn,fn){beginBusy(btn);try{return await fn()}finally{endBusy(btn)}}
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled)return;b.classList.add("is-loading");setTimeout(()=>{if(!b.dataset.busy)b.classList.remove("is-loading")},360)},true);
function resetFilePicker(target){
  const input=typeof target==="string"?$(target):target;
  if(!input)return;
  input.value="";
  const field=input.closest?.(".file-field");
  if(!field)return;
  field.classList.remove("has-file");
  const name=field.querySelector(".file-name");
  if(name)name.textContent="Sin archivo seleccionado";
  const text=field.querySelector(".file-picker-text");
  if(text){
    const kind=field.dataset.filePicker||"image";
    text.textContent=kind==="xlsx"?"Seleccionar XLSX":input.id==="sLogo"?"Seleccionar logo":"Seleccionar imagen";
  }
}
function syncFilePicker(input){
  if(!input)return;
  const field=input.closest?.(".file-field");
  if(!field)return;
  const file=input.files?.[0]||null;
  field.classList.toggle("has-file",!!file);
  const name=field.querySelector(".file-name");
  if(name)name.textContent=file?.name||"Sin archivo seleccionado";
  const text=field.querySelector(".file-picker-text");
  if(text){
    const kind=field.dataset.filePicker||"image";
    text.textContent=file?(kind==="xlsx"?"Cambiar XLSX":input.id==="sLogo"?"Cambiar logo":"Cambiar imagen"):(kind==="xlsx"?"Seleccionar XLSX":input.id==="sLogo"?"Seleccionar logo":"Seleccionar imagen");
  }
}
document.addEventListener("change",e=>{const input=e.target.closest?.('input[type="file"]');if(input)syncFilePicker(input)});

async function login(username,password){
  const r=await AleAPI.login(username||"admin",password);
  if(String(r.user?.rol||"").toUpperCase()==="MAYORISTA"){
    // R9.18.53: Mayoristas usa un acceso independiente. Nunca conservar su sesión como token de cPanel.
    clearAdminToken();
    localStorage.setItem("aleMayoristaToken",r.token);
    location.href="mayoristas.html";
    return r;
  }
  persistAdminToken(r.token);
  localStorage.setItem("aleAdminUser",String(username||"admin"));
  if(r.user) data.currentUser=r.user;
  if(r.permissions) data.permissions=r.permissions;

  // R9 Supabase: entrar al cPanel inmediatamente después de validar credenciales.
  // La carga pesada del dashboard ocurre después y ya no bloquea el login.
  showAdmin();
  renderSessionHeader(r.user);
  reload().catch(err=>console.warn("admin reload",err)).finally(()=>startNotificationWatcher());
  return r;
}
function normalizePanelData(src={}){
  return {
    ...data,
    ...src,
    products:Array.isArray(src.products)?src.products:(Array.isArray(data.products)?data.products:[]),
    categories:Array.isArray(src.categories)?src.categories:(Array.isArray(data.categories)?data.categories:[]),
    banners:Array.isArray(src.banners)?src.banners:(Array.isArray(data.banners)?data.banners:[]),
    orders:Array.isArray(src.orders)?src.orders:(Array.isArray(data.orders)?data.orders:[]),
    requests:Array.isArray(src.requests)?src.requests:(Array.isArray(data.requests)?data.requests:[]),
    quotes:Array.isArray(src.quotes)?src.quotes:(Array.isArray(data.quotes)?data.quotes:[]),
    clients:Array.isArray(src.clients)?src.clients:(Array.isArray(data.clients)?data.clients:[]),
    users:Array.isArray(src.users)?src.users:(Array.isArray(data.users)?data.users:[]),
    priceLists:Array.isArray(src.priceLists)?src.priceLists:(Array.isArray(data.priceLists)?data.priceLists:[]),
    priceListItems:Array.isArray(src.priceListItems)?src.priceListItems:(Array.isArray(data.priceListItems)?data.priceListItems:[]),
    wholesalers:Array.isArray(src.wholesalers)?src.wholesalers:(Array.isArray(data.wholesalers)?data.wholesalers:[]),
    wholesaleRequests:Array.isArray(src.wholesaleRequests)?src.wholesaleRequests:(Array.isArray(data.wholesaleRequests)?data.wholesaleRequests:[]),
    wholesaleUsers:Array.isArray(src.wholesaleUsers)?src.wholesaleUsers:(Array.isArray(data.wholesaleUsers)?data.wholesaleUsers:[]),
    wholesaleDocuments:Array.isArray(src.wholesaleDocuments)?src.wholesaleDocuments:(Array.isArray(data.wholesaleDocuments)?data.wholesaleDocuments:[]),
    wholesaleNotifications:Array.isArray(src.wholesaleNotifications)?src.wholesaleNotifications:(Array.isArray(data.wholesaleNotifications)?data.wholesaleNotifications:[]),
    wholesaleCredits:Array.isArray(src.wholesaleCredits)?src.wholesaleCredits:(Array.isArray(data.wholesaleCredits)?data.wholesaleCredits:[]),
    wholesaleCreditMovements:Array.isArray(src.wholesaleCreditMovements)?src.wholesaleCreditMovements:(Array.isArray(data.wholesaleCreditMovements)?data.wholesaleCreditMovements:[]),
    wholesaleCreditEvaluations:Array.isArray(src.wholesaleCreditEvaluations)?src.wholesaleCreditEvaluations:(Array.isArray(data.wholesaleCreditEvaluations)?data.wholesaleCreditEvaluations:[]),
    suppliers:Array.isArray(src.suppliers)?src.suppliers:(Array.isArray(data.suppliers)?data.suppliers:[]),
    supplies:Array.isArray(src.supplies)?src.supplies:(Array.isArray(data.supplies)?data.supplies:[]),
    purchases:Array.isArray(src.purchases)?src.purchases:(Array.isArray(data.purchases)?data.purchases:[]),
    purchaseItems:Array.isArray(src.purchaseItems)?src.purchaseItems:(Array.isArray(data.purchaseItems)?data.purchaseItems:[]),
    warehouses:Array.isArray(src.warehouses)?src.warehouses:(Array.isArray(data.warehouses)?data.warehouses:[]),
    warehouseChannels:Array.isArray(src.warehouseChannels)?src.warehouseChannels:(Array.isArray(data.warehouseChannels)?data.warehouseChannels:[]),
    warehouseStock:Array.isArray(src.warehouseStock)?src.warehouseStock:(Array.isArray(data.warehouseStock)?data.warehouseStock:[]),
    warehouseMovements:Array.isArray(src.warehouseMovements)?src.warehouseMovements:(Array.isArray(data.warehouseMovements)?data.warehouseMovements:[]),
    inventoryOperations:Array.isArray(src.inventoryOperations)?src.inventoryOperations:(Array.isArray(data.inventoryOperations)?data.inventoryOperations:[]),
    ledgerRows:Array.isArray(src.ledgerRows)?src.ledgerRows:(Array.isArray(data.ledgerRows)?data.ledgerRows:[]),
    gallery:Array.isArray(src.gallery)?src.gallery:(Array.isArray(data.gallery)?data.gallery:[]),
    config:(src.config&&typeof src.config==="object")?src.config:(data.config||{}),
    currentUser:src.currentUser||data.currentUser||null
  };
}
const ADMIN_CORE_MODULES=["products","categories","banners","config"];
const ADMIN_SECONDARY_MODULES=["orders","requests","quotes","clients","users","wholesale","suppliers","warehouses","stock","ledger","inventory","gallery"];
const ADMIN_DATA_MODULES=[...ADMIN_CORE_MODULES,...ADMIN_SECONDARY_MODULES];
let adminModulesRetryTimer=null,adminReloadPromise=null,adminRetryAttempt=0;
const adminRetryModules=new Set();
let adminModuleCapability=null; // null=sin comprobar, true=nuevo backend, false=compatibilidad R9.15.0/R9.15.1
function setSyncState(state,message=""){
  const pill=$("#syncPill"),txt=$("#syncPillText");
  if(pill){pill.dataset.state=state||"ok";pill.classList.toggle("syncing",state==="syncing");pill.classList.toggle("warning",state==="warning")}
  if(txt)txt.textContent=message||(state==="syncing"?"Sincronizando":state==="warning"?"Conexión intermitente":"Conectado");
}
function isUnsupportedAdminModuleError(err){
  if(typeof AleAPI?.isUnsupportedActionError==="function"&&AleAPI.isUnsupportedActionError(err))return true;
  const code=sessionErrorCode(err);
  return ["ACCION_NO_VALIDA","MODULO_ADMIN_NO_VALIDO","ADMINMODULE_NO_DISPONIBLE"].some(x=>code.includes(x));
}
async function mapWithConcurrency(items,limit,worker){
  const out=new Array(items.length);let cursor=0;
  async function runner(){
    while(true){
      const i=cursor++;if(i>=items.length)return;
      try{out[i]={status:"fulfilled",value:await worker(items[i],i)}}
      catch(reason){out[i]={status:"rejected",reason}}
    }
  }
  await Promise.all(Array.from({length:Math.min(Math.max(1,limit),items.length||1)},runner));
  return out;
}
function scheduleAdminRetry(failed=[]){
  (failed.length?failed:ADMIN_DATA_MODULES).forEach(m=>adminRetryModules.add(m));
  // Un único temporizador acumula pendientes de núcleo y módulos secundarios.
  // Así una carga secundaria exitosa no cancela el reintento de Productos/Config, etc.
  if(adminModulesRetryTimer)return;
  const delay=Math.min(30000,2500*Math.max(1,2**Math.min(adminRetryAttempt,3)));
  adminRetryAttempt++;
  adminModulesRetryTimer=setTimeout(()=>{
    adminModulesRetryTimer=null;
    const modules=[...adminRetryModules];adminRetryModules.clear();
    loadAdminModules({modules:modules.length?modules:ADMIN_DATA_MODULES,retry:true}).catch(e=>{
      if(isDefinitiveSessionError(e)){clearAdminToken();showLogin("La sesión venció o fue cerrada. Ingresa nuevamente.")}
      else console.warn("admin retry",e);
    });
  },delay);
}
async function loadLegacyAdminBootstrap(){
  setSyncState("syncing","Sincronizando");
  const legacy=await AleAPI.adminBootstrap(token,{});
  data=normalizePanelData(legacy||{});
  if(legacy?.permissions)data.permissions=legacy.permissions;
  if(legacy?.currentUser)data.currentUser=legacy.currentUser;
  renderAll();
  renderSessionHeader(data.currentUser);
  adminModuleCapability=false;
  adminRetryAttempt=0;
  if(adminModulesRetryTimer){clearTimeout(adminModulesRetryTimer);adminModulesRetryTimer=null}
  adminRetryModules.clear();
  setSyncState("ok","Conectado");
  return{ok:true,failed:[],loaded:ADMIN_DATA_MODULES.length,compatibility:true};
}
async function loadAdminModules({modules=ADMIN_DATA_MODULES,retry=true}={}){
  const list=[...new Set(modules.filter(m=>ADMIN_DATA_MODULES.includes(m)))];
  if(!list.length)return{ok:true,failed:[]};

  // Compatibilidad automática: si el servidor aún es R9.15.0/R9.15.1,
  // usamos el adminbootstrap clásico en vez de dejar el cPanel sin datos.
  if(adminModuleCapability===false){
    try{return await loadLegacyAdminBootstrap()}catch(err){
      if(isDefinitiveSessionError(err))throw err;
      setSyncState("warning","Reconectando");
      if(retry)scheduleAdminRetry(list);
      return{ok:false,failed:list,loaded:0,compatibility:true,error:err};
    }
  }

  setSyncState("syncing","Sincronizando");
  // Limitar concurrencia evita ráfagas de 9-18 solicitudes simultáneas a la Edge Function.
  const results=await mapWithConcurrency(list,3,module=>AleAPI.adminModuleReliable(module,token,2));
  const failed=[],definitive=[];let unsupported=false,loaded=0;
  results.forEach((res,i)=>{
    const module=list[i];
    if(res.status==="fulfilled"){
      loaded++;adminModuleCapability=true;data=normalizePanelData(res.value||{});
      if(res.value?.permissions)data.permissions=res.value.permissions;
      if(res.value?.currentUser)data.currentUser=res.value.currentUser;
    }else{
      failed.push(module);console.warn(`adminModule:${module}`,res.reason);
      if(isDefinitiveSessionError(res.reason))definitive.push(res.reason);
      if(isUnsupportedAdminModuleError(res.reason))unsupported=true;
    }
  });

  if(definitive.length)throw definitive[0];
  if(unsupported){
    adminModuleCapability=false;
    try{return await loadLegacyAdminBootstrap()}catch(err){
      if(isDefinitiveSessionError(err))throw err;
      setSyncState("warning","Reconectando");
      if(retry)scheduleAdminRetry(list);
      return{ok:false,failed:list,loaded:0,compatibility:true,error:err};
    }
  }

  renderAll();
  renderSessionHeader(data.currentUser);
  // Quitar de la cola únicamente los módulos que esta ejecución sí recuperó.
  list.forEach(m=>{if(!failed.includes(m))adminRetryModules.delete(m)});
  if(failed.length){
    setSyncState("warning",`Sincronizando ${failed.length} módulo${failed.length===1?"":"s"}`);
    if(retry)scheduleAdminRetry(failed);
  }else if(adminRetryModules.size===0){
    adminRetryAttempt=0;setSyncState("ok","Conectado");
  }
  return{ok:failed.length===0,failed,loaded};
}
async function reload(){
  // Production Ready: primero núcleo, luego datos secundarios en segundo plano.
  // Una falla parcial jamás invalida login/sesión.
  if(adminReloadPromise)return adminReloadPromise;
  adminReloadPromise=(async()=>{
    try{
      const core=await loadAdminModules({modules:ADMIN_CORE_MODULES,retry:true});
      if(adminModuleCapability===false)return core; // el fallback clásico ya cargó todo.
      // Pedidos/Solicitudes/Cotizaciones/Clientes/Usuarios no bloquean la entrada.
      loadAdminModules({modules:ADMIN_SECONDARY_MODULES,retry:true}).catch(err=>{
        if(isDefinitiveSessionError(err)){clearAdminToken();showLogin("La sesión venció o fue cerrada. Ingresa nuevamente.")}
        else console.warn("secondary admin modules",err);
      });
      return core;
    }finally{adminReloadPromise=null}
  })();
  return adminReloadPromise;
}
function renderSessionHeader(user){
  const me=user||data.currentUser||{};
  if($("#currentUserAvatar")) $("#currentUserAvatar").src=me.profile_url||"favicon.png";
  if($("#currentUserName")) $("#currentUserName").textContent=me.nombre||me.usuario||"Usuario";
  if($("#currentUserRole")){const rm={ADMIN:"Administrador",GERENCIA:"Gerencia",OPERADOR:"Operador",EDITOR:"Editor",LECTURA:"Lectura",MAYORISTA:"Mayorista"};$("#currentUserRole").textContent=rm[String(me.rol||"EDITOR").toUpperCase()]||String(me.rol||"Editor");}
}

const rememberedAdminUser=localStorage.getItem("aleAdminUser");
if(rememberedAdminUser && $("#adminUsername")) $("#adminUsername").value=rememberedAdminUser;

$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault(); const btn=e.submitter||e.currentTarget.querySelector('button[type="submit"]');
  if(!AleAPI.configured())return showLogin("Configura la URL de Supabase Edge Function en config.js.");
  await busy(btn,async()=>{
    try{
      await login($("#adminUsername").value.trim()||"admin",$("#adminPassword").value);
    }catch(err){
      console.warn(err);
      const code=String(err&&err.message||"");
      if(code.includes("LOGIN_BLOQUEADO")) return showLogin("Demasiados intentos fallidos. Espera unos minutos e intenta nuevamente.");
      if(code.includes("CREDENCIALES")||code.includes("USUARIO_O_CLAVE")) return showLogin("Usuario o contraseña incorrectos.");
      if(code.includes("BACKEND_AUTH_NO_ACTUALIZADO")) return showLogin("El backend de Supabase no corresponde a la API esperada. Revisa index.ts y vuelve a desplegar la Edge Function.");
            if(code.includes("TIMEOUT")) return showLogin("Supabase no respondió a tiempo. Verifica que dynamic-processor esté desplegada y activa.");
      if(code.includes("SESION")) return showLogin("La sesión no es válida. Ingresa nuevamente.");
      showLogin("No fue posible iniciar sesión ("+(code||"SIN_RESPUESTA")+").");
    }
  });
});
$("#logoutBtn").addEventListener("click",async()=>{const oldToken=token;stopNotificationWatcher();clearAdminToken();showLogin();if(oldToken){try{await AleAPI.post("logout",{},oldToken)}catch(_){}}});


// ========================= R9.18.149 · DASHBOARD EJECUTIVO =========================
const DASH_REGIONS=[
  ["Arica y Parinacota",["Arica","Camarones","Putre","General Lagos"]],
  ["Tarapacá",["Iquique","Alto Hospicio","Pozo Almonte","Camiña","Colchane","Huara","Pica"]],
  ["Antofagasta",["Antofagasta","Mejillones","Sierra Gorda","Taltal","Calama","Ollagüe","San Pedro de Atacama","Tocopilla","María Elena"]],
  ["Atacama",["Copiapó","Caldera","Tierra Amarilla","Chañaral","Diego de Almagro","Vallenar","Alto del Carmen","Freirina","Huasco"]],
  ["Coquimbo",["La Serena","Coquimbo","Andacollo","La Higuera","Paihuano","Vicuña","Illapel","Canela","Los Vilos","Salamanca","Ovalle","Combarbalá","Monte Patria","Punitaqui","Río Hurtado"]],
  ["Valparaíso",["Valparaíso","Casablanca","Concón","Juan Fernández","Puchuncaví","Quintero","Viña del Mar","Isla de Pascua","Los Andes","Calle Larga","Rinconada","San Esteban","La Ligua","Cabildo","Papudo","Petorca","Zapallar","Quillota","Calera","Hijuelas","La Cruz","Nogales","San Antonio","Algarrobo","Cartagena","El Quisco","El Tabo","Santo Domingo","San Felipe","Catemu","Llaillay","Panquehue","Putaendo","Santa María","Quilpué","Limache","Olmué","Villa Alemana"]],
  ["Metropolitana",["Santiago","Cerrillos","Cerro Navia","Conchalí","El Bosque","Estación Central","Huechuraba","Independencia","La Cisterna","La Florida","La Granja","La Pintana","La Reina","Las Condes","Lo Barnechea","Lo Espejo","Lo Prado","Macul","Maipú","Ñuñoa","Pedro Aguirre Cerda","Peñalolén","Providencia","Pudahuel","Quilicura","Quinta Normal","Recoleta","Renca","San Joaquín","San Miguel","San Ramón","Vitacura","Puente Alto","Pirque","San José de Maipo","Colina","Lampa","Tiltil","San Bernardo","Buin","Calera de Tango","Paine","Melipilla","Alhué","Curacaví","María Pinto","San Pedro","Talagante","El Monte","Isla de Maipo","Padre Hurtado","Peñaflor","Santiago Centro"]],
  ["O'Higgins",["Rancagua","Codegua","Coinco","Coltauco","Doñihue","Graneros","Las Cabras","Machalí","Malloa","Mostazal","Olivar","Peumo","Pichidegua","Quinta de Tilcoco","Rengo","Requínoa","San Vicente","Pichilemu","La Estrella","Litueche","Marchihue","Navidad","Paredones","San Fernando","Chépica","Chimbarongo","Lolol","Nancagua","Palmilla","Peralillo","Placilla","Pumanque","Santa Cruz"]],
  ["Maule",["Talca","Constitución","Curepto","Empedrado","Maule","Pelarco","Pencahue","Río Claro","San Clemente","San Rafael","Cauquenes","Chanco","Pelluhue","Curicó","Hualañé","Licantén","Molina","Rauco","Romeral","Sagrada Familia","Teno","Vichuquén","Linares","Colbún","Longaví","Parral","Retiro","San Javier","Villa Alegre","Yerbas Buenas"]],
  ["Ñuble",["Chillán","Bulnes","Chillán Viejo","El Carmen","Pemuco","Pinto","Quillón","San Ignacio","Yungay","Quirihue","Cobquecura","Coelemu","Ninhue","Portezuelo","Ránquil","Treguaco","San Carlos","Coihueco","Ñiquén","San Fabián","San Nicolás"]],
  ["Biobío",["Concepción","Coronel","Chiguayante","Florida","Hualqui","Lota","Penco","San Pedro de la Paz","Santa Juana","Talcahuano","Tomé","Hualpén","Lebu","Arauco","Cañete","Contulmo","Curanilahue","Los Álamos","Tirúa","Los Ángeles","Antuco","Cabrero","Laja","Mulchén","Nacimiento","Negrete","Quilaco","Quilleco","San Rosendo","Santa Bárbara","Tucapel","Yumbel","Alto Biobío"]],
  ["La Araucanía",["Temuco","Carahue","Cunco","Curarrehue","Freire","Galvarino","Gorbea","Lautaro","Loncoche","Melipeuco","Nueva Imperial","Padre Las Casas","Perquenco","Pitrufquén","Pucón","Saavedra","Teodoro Schmidt","Toltén","Vilcún","Villarrica","Cholchol","Angol","Collipulli","Curacautín","Ercilla","Lonquimay","Los Sauces","Lumaco","Purén","Renaico","Traiguén","Victoria"]],
  ["Los Ríos",["Valdivia","Corral","Lanco","Los Lagos","Máfil","Mariquina","Paillaco","Panguipulli","La Unión","Futrono","Lago Ranco","Río Bueno"]],
  ["Los Lagos",["Puerto Montt","Calbuco","Cochamó","Fresia","Frutillar","Los Muermos","Llanquihue","Maullín","Puerto Varas","Castro","Ancud","Chonchi","Curaco de Vélez","Dalcahue","Puqueldón","Queilén","Quellón","Quemchi","Quinchao","Osorno","Puerto Octay","Purranque","Puyehue","Río Negro","San Juan de la Costa","San Pablo","Chaitén","Futaleufú","Hualaihué","Palena"]],
  ["Aysén",["Coyhaique","Lago Verde","Aysén","Cisnes","Guaitecas","Cochrane","O'Higgins","Tortel","Chile Chico","Río Ibáñez"]],
  ["Magallanes",["Punta Arenas","Laguna Blanca","Río Verde","San Gregorio","Cabo de Hornos","Antártica","Porvenir","Primavera","Timaukel","Natales","Torres del Paine"]]
];
const DASH_REGION_COLORS=["#f3dfb6","#eac06c","#d89d3a","#b9761c","#855016"];
const dashNorm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const DASH_COMMUNE_REGION=new Map();for(const [region,communes] of DASH_REGIONS)for(const c of communes)DASH_COMMUNE_REGION.set(dashNorm(c),region);
function dashRegionOf(value){const n=dashNorm(value);if(!n)return"Sin región";if(DASH_COMMUNE_REGION.has(n))return DASH_COMMUNE_REGION.get(n);for(const [k,r] of DASH_COMMUNE_REGION){if(n===k||n.includes(k)||k.includes(n))return r}return"Sin región"}
let dashboardAnalytics=null,dashboardRange="year",dashboardBound=false,dashboardLoading=false;
function dashDateRange(range=dashboardRange){const now=new Date(),end=new Date(now),start=new Date(now),fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;start.setHours(0,0,0,0);if(range==="today"){}else if(range==="7d")start.setDate(start.getDate()-6);else if(range==="30d")start.setDate(start.getDate()-29);else if(range==="month")start.setDate(1);else{start.setMonth(0,1)}return{from:fmt(start),to:fmt(end)}}
function dashNumber(v){return Number(v||0).toLocaleString("es-CL")}
function dashMoney(v){return money(Number(v||0))}
function dashSafeText(v){return esc(String(v??""))}
function dashboardFilterOrders(){
  const region=$("#dashRegionFilter")?.value||"",commune=$("#dashCommuneFilter")?.value||"",channel=$("#dashChannelFilter")?.value||"",type=$("#dashSaleTypeFilter")?.value||"";
  const rows=(dashboardAnalytics?.sales_orders||[]).map(o=>({...o,_region:dashRegionOf(o.comuna||o.ciudad)}));
  return rows.filter(o=>(!region||o._region===region)&&(!commune||dashNorm(o.comuna)===dashNorm(commune))&&(!channel||String(o.origen||o.canal||"WEB").toUpperCase()===channel)&&(!type||(type==="MAYORISTA"?String(o.tipo_venta||o.origen||"").toUpperCase().includes("MAYORISTA"):!String(o.tipo_venta||o.origen||"").toUpperCase().includes("MAYORISTA"))));
}
function dashGroup(rows,keyFn,valueFn=()=>1){const m=new Map();for(const row of rows){const k=keyFn(row)||"Sin dato";m.set(k,(m.get(k)||0)+Number(valueFn(row)||0))}return [...m.entries()].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)}
function dashSet(id,value){const el=$(id);if(el)el.textContent=value}
function renderDashBars(rows){const host=$("#dashSalesChart");if(!host)return;const monthNames=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],totals=Array(12).fill(0);for(const o of rows){const d=new Date(o.fecha_pago||o.fecha||o.created_at);if(!Number.isNaN(d.getTime()))totals[d.getMonth()]+=Number(o.total||0)}const max=Math.max(1,...totals);host.innerHTML=totals.map((v,i)=>`<div class="dash-bar-item" title="${monthNames[i]} · ${dashMoney(v)}" style="--bar-h:${Math.max(2,(v/max)*100)}%"><i style="height:${Math.max(2,(v/max)*100)}%"></i><small>${v?dashMoney(v):"$0"}</small><span>${monthNames[i]}</span></div>`).join("")}
function renderDashLine(){const host=$("#dashVisitsChart");if(!host)return;const source=dashboardAnalytics?.visits_by_day||[];if(!source.length){host.innerHTML='<div class="dash-line-empty">Aún no hay visitas registradas para este período.</div>';return}const data=source.slice(-31),w=420,h=150,pad=18,max=Math.max(1,...data.map(x=>Number(x.visits||0))),step=data.length>1?(w-pad*2)/(data.length-1):0,pts=data.map((x,i)=>({x:pad+i*step,y:h-pad-(Number(x.visits||0)/max)*(h-pad*2),...x})),path=pts.map((p,i)=>`${i?"L":"M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),area=`M${pad},${h-pad} ${pts.map(p=>`L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} L${pts[pts.length-1].x},${h-pad} Z`;host.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="dashLineFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e4b85c" stop-opacity=".45"/><stop offset="100%" stop-color="#e4b85c" stop-opacity=".03"/></linearGradient></defs>${[.25,.5,.75].map(n=>`<line class="dash-line-grid" x1="${pad}" x2="${w-pad}" y1="${pad+(h-pad*2)*n}" y2="${pad+(h-pad*2)*n}"/>`).join("")}<path class="dash-line-area" d="${area}"/><path class="dash-line-path" d="${path}"/>${pts.map((p,i)=>`<circle class="dash-line-dot" cx="${p.x}" cy="${p.y}" r="3"><title>${dashSafeText(p.day)} · ${dashNumber(p.visits)} visitas</title></circle>${(i===0||i===pts.length-1||i%Math.max(1,Math.floor(pts.length/5))===0)?`<text class="dash-line-label" x="${p.x}" y="${h-2}" text-anchor="middle">${dashSafeText(String(p.day||"").slice(5))}</text>`:""}`).join("")}</svg>`}
function renderDashRanking(hostId,items,{moneyValue=true,onClick=null,limit=5}={}){const host=$(hostId);if(!host)return;const data=items.slice(0,limit),max=Math.max(1,...data.map(x=>Number(x.value||0)));host.innerHTML=data.length?data.map((x,i)=>`<div class="dash-rank-row" data-name="${dashSafeText(x.name)}"><span class="dash-rank-name">${dashSafeText(x.name)}</span><span class="dash-rank-track"><i class="dash-rank-fill" style="width:${Math.max(4,Number(x.value||0)/max*100)}%"></i></span><b class="dash-rank-value">${moneyValue?dashMoney(x.value):dashNumber(x.value)}</b></div>`).join(""):'<div class="dash-empty">Sin datos para este filtro.</div>';if(onClick)host.querySelectorAll('.dash-rank-row').forEach(el=>el.addEventListener('click',()=>onClick(el.dataset.name||"")))}
function dashRegionStats(rows){return dashGroup(rows,o=>o._region,o=>o.total)}
function dashRegionLevel(value,max){if(!value)return 0;const r=value/Math.max(1,max);return r>.78?4:r>.52?3:r>.28?2:r>.08?1:0}
function renderDashMap(rows){
  const svg=$("#dashChileMap");if(!svg)return;
  const stats=new Map(dashRegionStats(rows).map(x=>[x.name,x.value])),counts=new Map(dashGroup(rows,o=>o._region).map(x=>[x.name,x.value])),max=Math.max(1,...stats.values());
  // Silueta estilizada de Chile inspirada en el mockup original: más orgánica, con costa irregular y sur fragmentado.
  const y=[14,54,96,139,183,228,274,321,368,416,465,515,566,620,680,742,804];
  const left=[111,108,112,107,110,103,108,104,108,101,99,103,96,98,91,84,77];
  const right=[157,161,165,163,168,166,174,171,169,173,177,181,185,190,198,207,216];
  const shapes=[];
  DASH_REGIONS.forEach(([region],i)=>{
    const y1=y[i],y2=y[i+1],ym=(y1+y2)/2,l1=left[i],l2=left[i+1],r1=right[i],r2=right[i+1];
    const coastJitter=[-5,3,-3,4,-4,5,-2,4,-5,3,-4,5,-3,4,-6,-8][i]||0;
    const eastJitter=[2,-2,3,-3,2,-2,4,-3,2,-2,3,-3,3,-2,5,7][i]||0;
    const lm=(l1+l2)/2+coastJitter,rm=(r1+r2)/2+eastJitter;
    const value=stats.get(region)||0,level=dashRegionLevel(value,max),active=$("#dashRegionFilter")?.value===region;
    const d=`M${l1},${y1} Q${lm-3},${ym-8} ${lm},${ym} Q${lm+3},${ym+8} ${l2},${y2} L${r2},${y2} Q${rm+3},${ym+8} ${rm},${ym} Q${rm-3},${ym-8} ${r1},${y1} Z`;
    const labelX=Math.max(r1,r2)+15,labelY=ym+3;
    shapes.push(`<path class="dash-region-shape${active?' active':''}" data-region="${dashSafeText(region)}" d="${d}" fill="${DASH_REGION_COLORS[level]}"><title>${dashSafeText(region)} · ${dashMoney(value)} · ${dashNumber(counts.get(region)||0)} pedidos</title></path><text class="dash-region-label${active?' active':''}" x="${labelX}" y="${labelY}">${dashSafeText(region)}</text>`);
  });
  // Archipiélagos australes para que el extremo sur no parezca un bloque rectangular.
  const southRegion=DASH_REGIONS[DASH_REGIONS.length-1]?.[0]||'Magallanes';
  const southLevel=dashRegionLevel(stats.get(southRegion)||0,max),southActive=$("#dashRegionFilter")?.value===southRegion;
  shapes.push(`<path class="dash-map-coastline" d="M105 14 C95 145 101 250 95 365 C88 510 89 650 77 804"/>`);
  [[62,752,14,20],[54,775,18,15],[70,792,12,14],[225,776,20,12],[213,798,15,10]].forEach(([x0,y0,w,h])=>shapes.push(`<path class="dash-map-island dash-region-shape${southActive?' active':''}" data-region="${dashSafeText(southRegion)}" fill="${DASH_REGION_COLORS[southLevel]}" d="M${x0},${y0} q${w*.45},-${h*.25} ${w},2 l-${w*.18},${h} q-${w*.45},${h*.18} -${w*.82},0 z"/>`));
  svg.innerHTML=shapes.join("");
  svg.querySelectorAll('.dash-region-shape').forEach(el=>{
    el.addEventListener('click',()=>{const r=el.dataset.region||"";if($("#dashRegionFilter")){ $("#dashRegionFilter").value=r; dashboardRegionChanged(); }});
    el.addEventListener('mousemove',e=>{const tip=$("#dashMapTooltip"),r=el.dataset.region||"",v=stats.get(r)||0,c=counts.get(r)||0;if(!tip)return;tip.innerHTML=`<strong>${dashSafeText(r)}</strong><b>${dashMoney(v)}</b><br>${dashNumber(c)} pedidos`;const rect=el.ownerSVGElement.closest('.dash-map-stage').getBoundingClientRect();tip.style.left=Math.min(rect.width-145,Math.max(8,e.clientX-rect.left+10))+"px";tip.style.top=Math.min(rect.height-70,Math.max(8,e.clientY-rect.top-15))+"px";tip.classList.remove('hidden')});
    el.addEventListener('mouseleave',()=>$("#dashMapTooltip")?.classList.add('hidden'));
  });
}
function dashboardRegionChanged(){const region=$("#dashRegionFilter")?.value||"",communeSel=$("#dashCommuneFilter");if(communeSel){const communes=[...new Set((dashboardAnalytics?.sales_orders||[]).map(o=>String(o.comuna||"").trim()).filter(Boolean).filter(c=>!region||dashRegionOf(c)===region))].sort((a,b)=>a.localeCompare(b,'es'));const current=communeSel.value;communeSel.innerHTML='<option value="">Todas</option>'+communes.map(c=>`<option value="${dashSafeText(c)}">${dashSafeText(c)}</option>`).join('');if([...communeSel.options].some(o=>o.value===current))communeSel.value=current;else communeSel.value=""}renderModernDashboardLocal()}
function renderModernDashboardLocal(){if(!dashboardAnalytics)return;const rows=dashboardFilterOrders(),sales=rows.reduce((a,o)=>a+Number(o.total||0),0),orders=rows.length,ticket=orders?sales/orders:0,visits=Number(dashboardAnalytics.visits_count||0),visitors=Number(dashboardAnalytics.unique_visitors||0),conversion=visits?orders/visits*100:0,communes=dashGroup(rows,o=>String(o.comuna||"Sin comuna").trim()||"Sin comuna",o=>o.total),region=$("#dashRegionFilter")?.value||"";
  dashSet("#dashKpiSales",dashMoney(sales));dashSet("#dashKpiOrders",dashNumber(orders));dashSet("#dashKpiTicket",dashMoney(ticket));dashSet("#dashKpiVisits",dashNumber(visits));dashSet("#dashKpiVisitors",`${dashNumber(visitors)} visitantes únicos`);dashSet("#dashKpiConversion",`${conversion.toLocaleString('es-CL',{maximumFractionDigits:1})}%`);dashSet("#dashKpiTopCommune",communes[0]?.name||"—");dashSet("#dashKpiTopCommuneMeta",communes[0]?`${dashGroup(rows,o=>String(o.comuna||"Sin comuna")).find(x=>x.name===communes[0].name)?.value||0} pedidos · ${dashMoney(communes[0].value)}`:"Sin ventas");dashSet("#dashChileTotal",dashMoney((dashboardAnalytics.sales_orders||[]).reduce((a,o)=>a+Number(o.total||0),0)));dashSet("#dashChileOrders",`${dashNumber((dashboardAnalytics.sales_orders||[]).length)} pedidos`);
  dashSet("#dashRegionTitle",region?`Región: ${region}`:"Todo Chile");dashSet("#dashRegionSales",dashMoney(sales));dashSet("#dashRegionOrders",dashNumber(orders));dashSet("#dashRegionTicket",dashMoney(ticket));dashSet("#dashCommuneChartTitle",region?`Ventas por Comuna · ${region}`:"Ventas por Comuna");
  renderDashBars(rows);renderDashLine();renderDashMap((dashboardAnalytics.sales_orders||[]).map(o=>({...o,_region:dashRegionOf(o.comuna||o.ciudad)})));renderDashRanking("#dashCommuneChart",communes,{moneyValue:true,onClick:name=>{if($("#dashCommuneFilter")){ $("#dashCommuneFilter").value=name; renderModernDashboardLocal(); }}});
  const counts=new Map(dashGroup(rows,o=>String(o.comuna||"Sin comuna").trim()||"Sin comuna").map(x=>[x.name,x.value]));const topHost=$("#dashTopCommunes");if(topHost)topHost.innerHTML=communes.slice(0,5).map((x,i)=>`<div class="dash-commune-item" data-name="${dashSafeText(x.name)}"><span>${i+1}</span><div><strong>${dashSafeText(x.name)}</strong><small>${dashNumber(counts.get(x.name)||0)} pedidos</small></div><b>${dashMoney(x.value)}</b></div>`).join("")||'<div class="dash-empty">Sin datos</div>';topHost?.querySelectorAll('.dash-commune-item').forEach(el=>el.addEventListener('click',()=>{const name=el.dataset.name||"",r=dashRegionOf(name);if($("#dashRegionFilter"))$("#dashRegionFilter").value=r==='Sin región'?"":r;dashboardRegionChanged();if($("#dashCommuneFilter"))$("#dashCommuneFilter").value=name;renderModernDashboardLocal()}));
  const products=(dashboardAnalytics.top_products||[]).map(x=>({name:x.producto_nombre||"Producto",value:Number(x.cantidad||0)}));renderDashRanking("#dashTopProducts",products,{moneyValue:false,limit:5});
}
async function loadModernDashboard(force=false){if(dashboardLoading)return;if(!$("#view-dashboard"))return;dashboardLoading=true;$("#dashRefresh")?.classList.add('is-loading');try{const range=dashDateRange();const out=await AleAPI.dashboardAnalytics({from:range.from,to:range.to},token);dashboardAnalytics=out;const regionSel=$("#dashRegionFilter");if(regionSel&&regionSel.options.length<=1)regionSel.innerHTML='<option value="">Todas</option>'+DASH_REGIONS.map(([r])=>`<option value="${dashSafeText(r)}">${dashSafeText(r)}</option>`).join('');dashboardRegionChanged();const status=$("#dashStatus");if(status){status.classList.toggle('ok',out.analytics_installed!==false);status.innerHTML=out.analytics_installed===false?'<i class="bi bi-exclamation-triangle"></i><span>Ventas cargadas. Para comenzar a medir visitas web instala el SQL 20 y despliega dynamic-processor incluido en este ZIP.</span>':'<i class="bi bi-shield-check"></i><span>Dashboard conectado: ventas pagadas y analítica web real desde Supabase.</span>'}}catch(err){console.warn('dashboard analytics',err);const status=$("#dashStatus");if(status){status.classList.remove('ok');status.innerHTML=`<i class="bi bi-exclamation-triangle"></i><span>No fue posible cargar la analítica avanzada: ${dashSafeText(err?.message||err)}. Las demás funciones del cPanel siguen disponibles.</span>`}}finally{dashboardLoading=false;$("#dashRefresh")?.classList.remove('is-loading')}}
function bindModernDashboard(){if(dashboardBound)return;dashboardBound=true;$("#dashRegionFilter")?.addEventListener('change',dashboardRegionChanged);$("#dashCommuneFilter")?.addEventListener('change',renderModernDashboardLocal);$("#dashChannelFilter")?.addEventListener('change',renderModernDashboardLocal);$("#dashSaleTypeFilter")?.addEventListener('change',renderModernDashboardLocal);$("#dashRefresh")?.addEventListener('click',()=>loadModernDashboard(true));$("#dashClearRegion")?.addEventListener('click',()=>{if($("#dashRegionFilter"))$("#dashRegionFilter").value="";if($("#dashCommuneFilter"))$("#dashCommuneFilter").value="";dashboardRegionChanged()});$("#dashRangeTabs")?.querySelectorAll('button[data-range]').forEach(btn=>btn.addEventListener('click',()=>{$("#dashRangeTabs")?.querySelectorAll('button').forEach(x=>x.classList.remove('active'));btn.classList.add('active');dashboardRange=btn.dataset.range||'year';dashSet('#dashVisitsPeriodLabel',btn.textContent.trim());loadModernDashboard(true)}));$$('[data-dash-action]').forEach(btn=>btn.addEventListener('click',()=>{const a=btn.dataset.dashAction;if(a==='orders'||a==='sales')openAdminView('orders');else if(a==='commune')document.querySelector('#dashCommuneChart')?.scrollIntoView({behavior:'smooth',block:'center'});else if(a==='visits'||a==='conversion')document.querySelector('#dashVisitsChart')?.scrollIntoView({behavior:'smooth',block:'center'})}))}
function renderModernDashboard(){bindModernDashboard();if(!dashboardAnalytics)loadModernDashboard(true);else renderModernDashboardLocal()}

function renderDashboardSalesSnapshot(){
  const paid=(data.orders||[]).filter(o=>String(o.estado_pago||"").toUpperCase()==="PAGADO");const today=new Date();const sameDay=v=>{const d=new Date(v);return d.getFullYear()===today.getFullYear()&&d.getMonth()===today.getMonth()&&d.getDate()===today.getDate()};const sameMonth=v=>{const d=new Date(v);return d.getFullYear()===today.getFullYear()&&d.getMonth()===today.getMonth()};
  const day=paid.filter(o=>sameDay(o.fecha_pago||o.fecha)).reduce((a,o)=>a+Number(o.total||0),0),month=paid.filter(o=>sameMonth(o.fecha_pago||o.fecha)).reduce((a,o)=>a+Number(o.total||0),0);
  if($("#dashboardSalesToday"))$("#dashboardSalesToday").textContent=money(day);if($("#dashboardSalesMonth"))$("#dashboardSalesMonth").textContent=money(month);
}
function renderAll(){
  data=normalizePanelData(data);
  $("#adminLogo").src=(data.config&&data.config.logo_url)||"logo-ale-atencio.png";
  const me=data.currentUser||{};
  $("#currentUserAvatar").src=me.profile_url||"favicon.png";
  $("#currentUserName").textContent=me.nombre||me.usuario||"Usuario";
  $("#currentUserRole").textContent=String(me.rol||"EDITOR").toUpperCase()==="ADMIN"?"Administrador":"Editor";
  const isAdmin=String(me.rol||"").toUpperCase()==="ADMIN";
  $("#usersNavBtn").classList.toggle("hidden-role",!isAdmin);
  if($("#kpiProducts")) $("#kpiProducts").textContent=data.products.length;
  if($("#kpiOrders")) $("#kpiOrders").textContent=data.orders.filter(x=>String(x.estado).toUpperCase()==="PENDIENTE").length;
  if($("#kpiRequests")) $("#kpiRequests").textContent=data.requests.filter(x=>String(x.estado).toUpperCase()==="NUEVA").length;
  if($("#kpiStock")) $("#kpiStock").textContent=data.products.reduce((s,p)=>s+Number(p.stock||0),0);
  if($("#dashboardSummary")) $("#dashboardSummary").innerHTML=`<div class="summary-row"><span>Productos destacados</span><strong>${data.products.filter(p=>String(p.destacado).toUpperCase()==="SI").length}</strong></div><div class="summary-row"><span>Categorías activas</span><strong>${data.categories.length}</strong></div><div class="summary-row"><span>Banners activos</span><strong>${data.banners.length}</strong></div><div class="summary-row"><span>Total pedidos</span><strong>${data.orders.length}</strong></div><div class="summary-row"><span>Cotizaciones</span><strong>${data.quotes.length}</strong></div>`;
  fillCategorySelects();renderProducts();renderCategories();renderBanners();renderOrders();renderRequests();renderQuotes();renderClients();renderDashboardSalesSnapshot();renderModernDashboard();renderReports();renderUsers();renderIntegrations();renderPayments();renderSettings();renderWholesale();renderSuppliers();renderWarehouses();renderWarehouseStock();renderLedger();renderInventory();renderGallery();
}
function fillCategorySelects(){
  const opts=data.categories.map(c=>`<option value="${esc(c.nombre)}">${esc(c.nombre)}</option>`).join("");
  const currentFilter=$("#productFilter")?.value||"";
  $("#pCategory").innerHTML=opts;
  $("#productFilter").innerHTML='<option value="">Todas las categorías</option>'+opts;
  if([...$("#productFilter").options].some(o=>o.value===currentFilter))$("#productFilter").value=currentFilter;
  fillQuoteProductPicker();
}
function table(headers,rows){return `<table class="admin-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}">Sin registros</td></tr>`}</tbody></table>`}

// R9.18.6 · Montos siempre lineales en todos los módulos/tablas del cPanel.
const MONEY_COLUMN_TOKENS=["total","subtotal","precio","p unitario","monto","valor","costo","iva","despacho","saldo","importe","total comprado"];
function adminHeaderKey(value){return normalizeText(String(value||"").replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9 ]/g," ")).replace(/\s+/g," ").trim()}
function isMoneyColumnHeader(value){const key=adminHeaderKey(value);return MONEY_COLUMN_TOKENS.some(token=>key===token||key.startsWith(token+" ")||key.endsWith(" "+token))}
function decorateMoneyColumns(scope=document){
  const tables=[];
  if(scope?.matches?.("table.admin-table"))tables.push(scope);
  if(scope?.querySelectorAll)tables.push(...scope.querySelectorAll("table.admin-table"));
  [...new Set(tables)].forEach(tbl=>{
    const headers=[...tbl.querySelectorAll("thead th")];
    headers.forEach((th,index)=>{
      if(!isMoneyColumnHeader(th.textContent))return;
      th.classList.add("money-column");
      tbl.querySelectorAll("tbody tr").forEach(tr=>tr.children[index]?.classList?.add("money-column"));
    });
  });
}
function scheduleMoneyColumns(){requestAnimationFrame(()=>decorateMoneyColumns(document))}
const moneyColumnObserver=new MutationObserver(mutations=>{
  let needsRefresh=false;
  for(const mutation of mutations){
    if(mutation.addedNodes?.length){needsRefresh=true;break}
  }
  if(needsRefresh)scheduleMoneyColumns();
});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{decorateMoneyColumns(document);moneyColumnObserver.observe(document.body,{childList:true,subtree:true})},{once:true});
else{decorateMoneyColumns(document);moneyColumnObserver.observe(document.body,{childList:true,subtree:true})}

const CPANEL_MEDIA_VERSION="20260922-r91863-portal-completo";
function resolveMediaUrl(value){
  const u=String(value||"").trim();
  if(!u||/^(?:https?:|data:|blob:)/i.test(u))return u;
  return `${u}${u.includes("?")?"&":"?"}v=${CPANEL_MEDIA_VERSION}`;
}
function imageSourceInfo(value){
  const u=String(value||"").trim();
  if(!u)return{label:"Sin imagen publicada",kind:"none",file:""};
  if(/^https?:/i.test(u)){
    const isSupabase=/\.supabase\.co\/storage\/v1\/object\/public\//i.test(u)||/\/storage\/v1\/object\/public\//i.test(u);
    let file=u.split("?")[0].split("/").pop()||"imagen";
    try{file=decodeURIComponent(file)}catch(_){}
    return{label:isSupabase?"Supabase Storage":"Servidor externo",kind:isSupabase?"supabase":"remote",file};
  }
  return{label:"GitHub / archivo local",kind:"local",file:u.split("?")[0].split("/").pop()||u};
}
function renderProductImageSource(value,{pending=false}={}){
  const el=$("#pCurrentImageName");if(!el)return;
  if(pending){el.innerHTML=`<span class="image-source-copy">Nueva imagen seleccionada</span><span class="image-source-badge supabase"><i class="bi bi-cloud-arrow-up"></i> Se subirá a Supabase Storage al guardar</span>`;return}
  const info=imageSourceInfo(value);
  if(info.kind==="none"){el.textContent=info.label;return}
  const icon=info.kind==="local"?"github":info.kind==="supabase"?"cloud-check":"globe2";
  el.innerHTML=`<span class="image-source-copy">Imagen actual: ${esc(info.file)}</span><span class="image-source-badge ${esc(info.kind)}"><i class="bi bi-${icon}"></i> ${esc(info.label)}</span>`;
}
function imgTag(url){const src=resolveMediaUrl(url);return src?`<img class="thumb" src="${esc(src)}" alt="">`:'<div class="thumb"></div>'}

function syncProductStockVisibilityControl(){
  const input=$("#productShowStockClients"),value=$("#productShowStockClientsValue"),hint=$("#productShowStockClientsHint"),bar=$("#productStockVisibilityBar");
  if(!input)return;
  const on=yesNo(data.config?.mostrar_stock_clientes)==="SI";
  if(document.activeElement!==input)input.checked=on;
  if(value){value.textContent=input.checked?"TRUE":"FALSE";value.classList.toggle("is-true",input.checked);value.classList.toggle("is-false",!input.checked)}
  if(hint)hint.textContent=input.checked?"TRUE: la Web muestra el stock general y el stock disponible por tamaño.":"FALSE: el inventario sigue funcionando, pero el cliente solo ve producto, tamaño y precio.";
  const canWrite=data.permissions?.settings?.write!==false;
  input.disabled=!canWrite;
  if(bar)bar.classList.toggle("is-readonly",!canWrite);
}

async function saveProductStockVisibility(on){
  const input=$("#productShowStockClients");
  if(!input)return;
  input.disabled=true;
  try{
    const out=await AleAPI.post("saveConfig",{mostrar_stock_clientes:on?"SI":"NO"},token);
    data.config={...(data.config||{}),...(out?.config||{}),mostrar_stock_clientes:on?"SI":"NO"};
    if($("#sShowStockClients"))$("#sShowStockClients").checked=on;
    syncStockVisibilitySetting();
    syncProductStockVisibilityControl();
    toast(on?"✓ Stock visible para clientes":"✓ Stock oculto para clientes");
  }catch(err){
    console.warn(err);
    input.checked=!on;
    if(data.config)data.config.mostrar_stock_clientes=input.checked?"SI":"NO";
    syncProductStockVisibilityControl();
    toast("✕ No fue posible cambiar la visibilidad del stock");
  }finally{
    input.disabled=data.permissions?.settings?.write===false;
  }
}

function productInventoryRows(p){return Array.isArray(p?.inventario_bodegas)?p.inventario_bodegas:[]}
function productInventoryWarehouseSummary(p){
  const rows=productInventoryRows(p),group=new Map();
  for(const x of rows){
    const key=String(x.bodega_id||x.bodega_codigo||"");
    if(!group.has(key))group.set(key,{codigo:x.bodega_codigo||warehouseCode(x.bodega_id)||"Bodega",nombre:x.bodega_nombre||"",fisico:0,reservado:0,seguridad:0,disponible:0});
    const g=group.get(key);g.fisico+=Number(x.stock||0);g.reservado+=Number(x.reservado||0);g.seguridad+=Number(x.stock_seguridad||0);g.disponible+=Number(x.disponible??Math.max(0,Number(x.stock||0)-Number(x.reservado||0)-Number(x.stock_seguridad||0)));
  }
  return [...group.values()];
}
function productInventorySummaryHtml(p){
  const wh=productInventoryWarehouseSummary(p);
  if(!wh.length)return '<span class="muted product-no-inventory">Sin inventario cargado</span>';
  const total=wh.reduce((a,x)=>a+x.disponible,0);
  return `<div class="product-warehouse-stock">${wh.map(x=>`<span class="product-warehouse-stock-chip" title="${esc(x.nombre||x.codigo)} · Físico ${x.fisico} · Reservado ${x.reservado} · Seguridad ${x.seguridad}"><b>${esc(x.codigo)}</b><small>F ${x.fisico.toLocaleString("es-CL",{maximumFractionDigits:3})}</small><strong>D ${x.disponible.toLocaleString("es-CL",{maximumFractionDigits:3})}</strong></span>`).join("")}<span class="product-stock-total">Disponible <b>${total.toLocaleString("es-CL",{maximumFractionDigits:3})}</b></span></div>`;
}
function renderProducts(){
  syncProductStockVisibilityControl();
  const q=normalizeText($("#productSearch").value),f=$("#productFilter").value,status=$("#productStatusFilter")?.value||"";
  pruneSelection("products",data.products);
  const list=data.products.filter(p=>{const active=String(p.activo??"SI").toUpperCase()==="NO"?"NO":"SI";return normalizeText([p.nombre,p.descripcion,p.categoria_nombre,p.ocasion].filter(Boolean).join(" ")).includes(q)&&(!f||p.categoria_nombre===f)&&(!status||active===status)});
  const meta=$("#productResultsMeta");if(meta)meta.textContent=`Mostrando ${list.length} de ${data.products.length} productos${f?` · Categoría: ${f}`:""}${status?` · Estado: ${status==="SI"?"Activos":"Inactivos"}`:""}${q?` · Búsqueda: “${$("#productSearch").value.trim()}”`:""}`;
  const canDelete=!!data.permissions?.products?.delete;if(!canDelete)selectedSet("products").clear();const visibleIds=list.map(p=>String(p.id));
  const headers=canDelete?[`<span class="bulk-select-col">${bulkHeaderCheckbox("products",visibleIds)}</span>`,"Imagen","Producto","Categoría","Tamaños / precios","Inventario por bodega","Estado","Destacado","Acciones"]:["Imagen","Producto","Categoría","Tamaños / precios","Inventario por bodega","Estado","Destacado","Acciones"];
  const rows=list.map(p=>{const active=String(p.activo??"SI").toUpperCase()!=="NO",selected=selectedSet("products").has(String(p.id)),sizes=Array.isArray(p.tamanos)?p.tamanos.filter(x=>String(x.activo??"SI").toUpperCase()!=="NO"):[],sizeHtml=sizes.length?`<div class="product-size-summary">${sizes.map(z=>`<span><b>${esc(z.nombre)}</b> ${Number(z.precio||0)>0?money(z.precio):"Consultar"}</span>`).join("")}</div>`:`<span class="muted">Sin tamaños configurados</span>`;return `<tr class="${active?"":"product-row-inactive"} ${selected?"is-selected":""}">${canDelete?`<td class="bulk-select-col">${bulkCheckbox("products",p.id)}</td>`:""}<td class="product-image-cell">${imgTag(p.image_url)}</td><td class="product-name-cell"><strong>${esc(p.nombre)}</strong></td><td>${esc(p.categoria_nombre||"")}</td><td>${sizeHtml}</td><td class="product-inventory-cell">${productInventorySummaryHtml(p)}</td><td><span class="product-state-badge ${active?"is-active":"is-inactive"}"><span class="product-state-dot" aria-hidden="true"></span>${active?"Activo":"Inactivo"}</span></td><td>${String(p.destacado).toUpperCase()==="SI"?"Sí":"No"}</td><td><div class="row-actions"><button type="button" data-edit-product="${esc(p.id)}">Editar</button><button type="button" data-stock-product="${esc(p.id)}">Inventario</button>${canDelete?`<button type="button" class="danger" data-delete-product="${esc(p.id)}">Eliminar</button>`:""}</div></td></tr>`}).join("");
  $("#productsTable").innerHTML=table(headers,rows);updateBulkBar("products");syncSelectedRows($("#productsTable"));
}
let productPreviewObjectUrl="";
function revokeProductPreviewObjectUrl(){
  if(productPreviewObjectUrl){
    try{URL.revokeObjectURL(productPreviewObjectUrl)}catch(_){}
    productPreviewObjectUrl="";
  }
}
function standardProductSizes(){return ["Pequeña","Mediana","Grande"].map((nombre,i)=>({id:"",nombre,precio:0,orden:i+1,activo:"SI"}))}
function productEditorSizes(source){const rows=Array.isArray(source)&&source.length?source:standardProductSizes();return rows.map((x,i)=>({id:String(x.id||""),nombre:String(x.nombre||""),precio:parseClpAmount(x.precio),orden:Number(x.orden||i+1),activo:String(x.activo??"SI").toUpperCase()==="NO"?"NO":"SI"}))}
function renderProductSizeEditor(source){const box=$("#productSizesEditor");if(!box)return;const rows=productEditorSizes(source);box.innerHTML=rows.map((x,i)=>`<div class="product-size-row product-size-row-no-stock" data-size-id="${esc(x.id)}"><span class="product-size-order">${i+1}</span><label><small>Tamaño</small><input class="pSizeName" value="${esc(x.nombre)}" placeholder="Ej. Pequeña"></label><label><small>Precio CLP</small><input class="pSizePrice" type="text" inputmode="numeric" value="${new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(x.precio||0))}" placeholder="0"></label><label class="product-size-active"><small>Estado</small><select class="pSizeActive"><option value="SI" ${x.activo!=="NO"?"selected":""}>Activo</option><option value="NO" ${x.activo==="NO"?"selected":""}>Inactivo</option></select></label><button type="button" class="product-size-remove" data-remove-size title="Quitar tamaño" aria-label="Quitar tamaño">×</button></div>`).join("");syncProductBaseFromSizes()}
function collectProductSizes(){return $$("#productSizesEditor .product-size-row").map((row,i)=>({id:row.dataset.sizeId||"",nombre:row.querySelector(".pSizeName")?.value.trim()||"",precio:parseClpAmount(row.querySelector(".pSizePrice")?.value),orden:i+1,activo:row.querySelector(".pSizeActive")?.value||"SI"})).filter(x=>x.nombre)}
function syncProductBaseFromSizes(){const sizes=collectProductSizes().filter(x=>x.activo!=="NO"),prices=sizes.map(x=>Number(x.precio||0)).filter(x=>x>0);if($("#pPrice"))$("#pPrice").value=prices.length?Math.min(...prices):0}
function addProductSizeRow(){const rows=collectProductSizes();rows.push({id:"",nombre:"",precio:0,orden:rows.length+1,activo:"SI"});renderProductSizeEditor(rows);const inputs=$$("#productSizesEditor .pSizeName");inputs.at(-1)?.focus();renderProductWebPreview()}
function renderProductIngredientEditor(source){
  const box=$("#productIngredientsEditor");if(!box)return;const rows=Array.isArray(source)?source:[];
  const opts=(data.supplies||[]).filter(x=>String(x.activo??"SI").toUpperCase()!=="NO").map(x=>`<option value="${esc(x.id)}">${esc(x.nombre)} · ${esc(x.unidad||"UNIDAD")} · ${money(x.costo_promedio||0)}</option>`).join("");
  box.innerHTML=rows.map((x,i)=>`<div class="product-ingredient-row"><span class="product-size-order">${i+1}</span><label><small>Insumo</small><select class="pIngredientSupply"><option value="">Seleccionar</option>${opts}</select></label><label><small>Cantidad</small><input class="pIngredientQty" type="number" min="0" step="0.001" value="${Number(x.cantidad||0)}"></label><label><small>Notas</small><input class="pIngredientNotes" value="${esc(x.notas||"")}" placeholder="Opcional"></label><button type="button" class="product-size-remove" data-remove-ingredient aria-label="Quitar ingrediente">×</button></div>`).join("");
  [...box.querySelectorAll(".product-ingredient-row")].forEach((row,i)=>{const sel=row.querySelector(".pIngredientSupply");if(sel)sel.value=String(rows[i]?.insumo_id||"")});updateProductEstimatedCost();
}
function collectProductIngredients(){return $$("#productIngredientsEditor .product-ingredient-row").map((row,i)=>({insumo_id:row.querySelector(".pIngredientSupply")?.value||"",cantidad:Math.max(0,Number(row.querySelector(".pIngredientQty")?.value||0)),notas:row.querySelector(".pIngredientNotes")?.value.trim()||"",orden:i+1})).filter(x=>x.insumo_id&&x.cantidad>0)}
function updateProductEstimatedCost(){const total=collectProductIngredients().reduce((sum,x)=>{const ins=(data.supplies||[]).find(i=>String(i.id)===String(x.insumo_id));return sum+Number(x.cantidad||0)*Number(ins?.costo_promedio||0)},0);if($("#productEstimatedCost"))$("#productEstimatedCost").textContent=money(total)}
function addProductIngredientRow(){const rows=collectProductIngredients();rows.push({insumo_id:"",cantidad:1,notas:""});renderProductIngredientEditor(rows)}

function productEditorSnapshot(imageOverride=""){
  return {
    id:$("#pId")?.value||"",
    nombre:$("#pName")?.value.trim()||"Producto sin nombre",
    descripcion:$("#pDescription")?.value.trim()||"Agrega una descripción para mostrarla en la tienda.",
    precio:parseClpAmount($("#pPrice")?.value),
    categoria_nombre:$("#pCategory")?.value||"Categoría",
    permite_stock_negativo:true,
    tamanos:collectProductSizes(),
    activo:$("#pActive")?.value||"SI",
    ocasion:$("#pOccasion")?.value.trim()||"",
    destacado:$("#pFeatured")?.checked?"SI":"NO",
    image_url:imageOverride||$("#pImageUrl")?.value||"",
    orden:toNumber($("#pOrder")?.value)
  };
}
function productPreviewMediaUrl(value){return resolveMediaUrl(value)}
function productPreviewFallback(p){
  return ({Tortas:"🍰",Galletas:"🍪","Dulcería":"🍫",Postres:"🧁",Regalos:"🎁"})[p.categoria_nombre]||"🍰";
}
function renderProductWebPreview(productOverride=null){
  const box=$("#productWebPreview");if(!box)return;const p=productOverride||productEditorSnapshot(productPreviewObjectUrl),active=String(p.activo??"SI").toUpperCase()!=="NO",src=productPreviewMediaUrl(p.image_url),sizes=productEditorSizes(p.tamanos).filter(x=>x.activo!=="NO"),selected=sizes[0]||null,price=Number(selected?.precio??p.precio??0),priced=price>0;box.classList.toggle("is-inactive",!active);const media=src?`<img src="${esc(src)}" alt="${esc(p.nombre)}">`:`<span>${productPreviewFallback(p)}</span>`,badge=String(p.destacado).toUpperCase()==="SI"?'<span class="product-preview-badge">Destacado</span>':"";box.innerHTML=`<div class="product-preview-media">${media}${badge}<span class="product-preview-status">${active?"Activo":"Inactivo"}</span></div><div class="product-preview-body"><small>${esc(p.categoria_nombre||"Categoría")}</small><h4>${esc(p.nombre||"Producto sin nombre")}</h4><p>${esc(p.descripcion||"Agrega una descripción para mostrarla en la tienda.")}</p>${sizes.length?`<div class="product-preview-sizes">${sizes.map((z,i)=>`<span class="${i===0?"active":""}">${esc(z.nombre)}</span>`).join("")}</div><div class="product-preview-size-caption">Tamaño: <strong>${esc(selected?.nombre||"")}</strong></div>`:""}<div class="product-preview-bottom"><span class="product-preview-price">${priced?money(price):"Consultar"}</span><button type="button" class="product-preview-action" ${active?"":"disabled"}>${active?(priced?"Agregar":"Consultar"):"No disponible"}</button></div></div>`;const idLabel=$("#productEditorIdLabel");if(idLabel)idLabel.textContent=p.id?`ID ${p.id} · conectado al catálogo Web`:"Producto nuevo · se generará un ID al guardar";
}
function renderProductWarehouseInventoryPreview(p){
  const box=$("#productWarehouseInventoryPreview");if(!box)return;
  if(!p?.id){box.innerHTML='<span class="muted">Guarda el producto para habilitar su inventario.</span>';return}
  const rows=productInventoryRows(p);
  if(!rows.length){box.innerHTML='<div class="product-inventory-empty"><i class="bi bi-box-seam"></i><span>Sin existencias registradas. La bodega BOD-01 queda disponible para la carga inicial.</span></div>';return}
  const wh=new Map();
  for(const x of rows){
    const key=String(x.bodega_id||x.bodega_codigo||"");
    if(!wh.has(key))wh.set(key,{codigo:x.bodega_codigo||warehouseCode(x.bodega_id)||"",nombre:x.bodega_nombre||"",items:[]});
    wh.get(key).items.push(x);
  }
  box.innerHTML=[...wh.values()].map(w=>`<div class="product-inventory-warehouse"><div class="product-inventory-warehouse-head"><strong>${esc(w.codigo)} · ${esc(w.nombre)}</strong></div>${w.items.map(x=>`<div class="product-inventory-line"><span>${esc(productSizeById(p.id,x.tamano_id)||"General")}</span><small>Físico <b>${Number(x.stock||0).toLocaleString("es-CL",{maximumFractionDigits:3})}</b></small><small>Reservado <b>${Number(x.reservado||0).toLocaleString("es-CL",{maximumFractionDigits:3})}</b></small><strong>Disponible ${Number(x.disponible??Math.max(0,Number(x.stock||0)-Number(x.reservado||0)-Number(x.stock_seguridad||0))).toLocaleString("es-CL",{maximumFractionDigits:3})}</strong></div>`).join("")}</div>`).join("");
}

function openProductEditor(id=""){
  const editor=$("#productEditor");
  revokeProductPreviewObjectUrl();
  resetFilePicker("#pImage");
  if(id){
    const p=data.products.find(x=>String(x.id)===String(id));
    if(!p){toast("Producto no encontrado");return}
    $("#pId").value=p.id||"";
    $("#pImageId").value=p.drive_file_id||"";
    $("#pImageUrl").value=p.image_url||"";
    $("#pOrder").value=toNumber(p.orden);
    $("#pName").value=p.nombre||"";
    $("#pPrice").value=toNumber(p.precio);
    $("#pCategory").value=p.categoria_nombre||"";
    renderProductSizeEditor(Array.isArray(p.tamanos)&&p.tamanos.length?p.tamanos:standardProductSizes());
    renderProductIngredientEditor(Array.isArray(p.ingredientes)?p.ingredientes:[]);
    $("#pActive").value=String(p.activo??"SI").toUpperCase()==="NO"?"NO":"SI";
    updateProductStatusHint();updateStockPolicyHint();
    $("#pOccasion").value=p.ocasion||"";
    $("#pDescription").value=p.descripcion||"";
    $("#pFeatured").checked=String(p.destacado).toUpperCase()==="SI";
    renderProductImageSource(p.image_url||"");
    renderProductWebPreview({...p,image_url:p.image_url||""});renderProductWarehouseInventoryPreview(p);
  }else{
    clearProduct();
    const nextOrder=Math.max(0,...data.products.map(p=>toNumber(p.orden)))+1;
    $("#pOrder").value=nextOrder;
    renderProductWebPreview();renderProductWarehouseInventoryPreview(null);
  }
  editor.classList.remove("hidden");
  document.body.classList.add("product-editor-open");
  requestAnimationFrame(()=>{editor.scrollTop=0;$("#pName")?.focus({preventScroll:true})});
}
function closeProductEditor(){
  revokeProductPreviewObjectUrl();
  $("#productEditor").classList.add("hidden");
  document.body.classList.remove("product-editor-open");
}
window.editProduct=id=>openProductEditor(id);
$("#manageProductInventory")?.addEventListener("click",()=>{const id=$("#pId")?.value||"";if(!id)return toast("Guarda primero el producto");closeProductEditor();openProductStockEditor(id)});
window.saveQuickPrice=async(id,btn)=>busy(btn,async()=>{const input=$("#price-"+CSS.escape(String(id)));if(!input)return;const precio=parseClpAmount(input.value);if(!Number.isFinite(precio)||precio<0){toast("Precio no válido");return}try{await AleAPI.savePriceVerified({id,precio},token);const p=data.products.find(x=>String(x.id)===String(id));if(p)p.precio=precio;input.value=precio;toast("✓ Precio actualizado")}catch(e){console.warn(e);toast("✕ No se confirmó el cambio de precio")}});
$("#productsTable").addEventListener("click",e=>{
  const edit=e.target.closest("[data-edit-product]"); if(edit){openProductEditor(edit.dataset.editProduct);return}
  const stock=e.target.closest("[data-stock-product]"); if(stock){openProductStockEditor(stock.dataset.stockProduct);return}
  const save=e.target.closest("[data-save-price]"); if(save){window.saveQuickPrice(save.dataset.savePrice,save);return}
  const del=e.target.closest("[data-delete-product]"); if(del){window.removeEntity("product",del.dataset.deleteProduct,del);return}
});
$("#productsTable").addEventListener("change",e=>{
  if(handleBulkCheckboxChange(e))return;
  const all=e.target.closest('input[data-bulk-select-all="products"]');if(all){const ids=data.products.filter(p=>{const q=normalizeText($("#productSearch").value),f=$("#productFilter").value,status=$("#productStatusFilter")?.value||"",active=String(p.activo??"SI").toUpperCase()==="NO"?"NO":"SI";return normalizeText([p.nombre,p.descripcion,p.categoria_nombre,p.ocasion].filter(Boolean).join(" ")).includes(q)&&(!f||p.categoria_nombre===f)&&(!status||active===status)}).map(p=>String(p.id));handleBulkSelectAllChange(e,ids);renderProducts()}
});
$("#deleteSelectedProducts")?.addEventListener("click",e=>deleteSelected("products",e.currentTarget));
["pName","pPrice","pCategory","pStock","pActive","pOccasion","pDescription","pFeatured"].forEach(id=>{
  const el=$("#"+id); if(!el)return;
  const eventName=(id==="pFeatured"||id==="pActive"||id==="pCategory")?"change":"input";
  el.addEventListener(eventName,()=>{if(id==="pActive")updateProductStatusHint();renderProductWebPreview()});
});
$("#pImage")?.addEventListener("change",()=>{
  revokeProductPreviewObjectUrl();
  const file=$("#pImage")?.files?.[0];
  if(file){productPreviewObjectUrl=URL.createObjectURL(file);renderProductImageSource("",{pending:true})}
  else renderProductImageSource($("#pImageUrl")?.value||"");
  renderProductWebPreview(productEditorSnapshot(productPreviewObjectUrl));
});
$("#addProductSize")?.addEventListener("click",addProductSizeRow);
$("#productSizesEditor")?.addEventListener("input",()=>{syncProductBaseFromSizes();renderProductWebPreview()});
$("#productSizesEditor")?.addEventListener("change",()=>{syncProductBaseFromSizes();renderProductWebPreview()});
$("#productSizesEditor")?.addEventListener("click",e=>{const b=e.target.closest("[data-remove-size]");if(!b)return;const row=b.closest(".product-size-row");if(!row)return;const rows=collectProductSizes(),domRows=[...$("#productSizesEditor").querySelectorAll(".product-size-row")],idx=domRows.indexOf(row);if(rows.length<=1){toast("Debe existir al menos un tamaño");return}if(idx>=0)rows.splice(idx,1);renderProductSizeEditor(rows);renderProductWebPreview()});
$("#addProductIngredient")?.addEventListener("click",addProductIngredientRow);
$("#productIngredientsEditor")?.addEventListener("input",updateProductEstimatedCost);
$("#productIngredientsEditor")?.addEventListener("change",updateProductEstimatedCost);
$("#productIngredientsEditor")?.addEventListener("click",e=>{const b=e.target.closest("[data-remove-ingredient]");if(!b)return;b.closest(".product-ingredient-row")?.remove();updateProductEstimatedCost()});
$("#productSearch").addEventListener("input",renderProducts);$("#productFilter").addEventListener("change",renderProducts);$("#productStatusFilter")?.addEventListener("change",renderProducts);
$("#clearProductFilter")?.addEventListener("click",()=>{$("#productSearch").value="";$("#productFilter").value="";if($("#productStatusFilter"))$("#productStatusFilter").value="";renderProducts()});
$("#productShowStockClients")?.addEventListener("change",e=>saveProductStockVisibility(!!e.currentTarget.checked));
$("#newProduct").addEventListener("click",()=>openProductEditor());
function updateProductStatusHint(){const select=$("#pActive"),hint=$("#pActiveHint");if(!select||!hint)return;const active=select.value!=="NO";hint.textContent=active?"Activo: el producto se muestra y puede comprarse en la Web.":"Inactivo: el producto se oculta y no puede comprarse en la Web.";hint.classList.toggle("is-inactive",!active)}
function updateStockPolicyHint(){}
$("#pActive")?.addEventListener("change",updateProductStatusHint);
function clearProduct(){revokeProductPreviewObjectUrl();["pId","pImageId","pImageUrl","pOrder","pName","pPrice","pOccasion","pDescription"].forEach(id=>$("#"+id).value="");$("#pFeatured").checked=false;if($("#pActive"))$("#pActive").value="SI";renderProductSizeEditor(standardProductSizes());renderProductIngredientEditor([]);updateProductStatusHint();updateStockPolicyHint();resetFilePicker("#pImage");renderProductImageSource("");renderProductWebPreview()}
$("#closeProductEditorX")?.addEventListener("click",closeProductEditor);
$("#saveProduct").addEventListener("click",e=>busy(e.currentTarget,async()=>{try{
  let imageId=$("#pImageId").value,imageUrl=$("#pImageUrl").value;const file=$("#pImage").files[0];
  if(file){const u=await upload(file,"PRODUCTOS");imageId=u.fileId;imageUrl=u.imageUrl||imageUrl}
  syncProductBaseFromSizes();const tamanos=collectProductSizes(),ingredientes=collectProductIngredients();
  const payload={id:$("#pId").value,nombre:$("#pName").value.trim(),descripcion:$("#pDescription").value.trim(),precio:parseClpAmount($("#pPrice").value),categoria_nombre:$("#pCategory").value,tamanos,ingredientes,drive_file_id:imageId,image_url:imageUrl,destacado:$("#pFeatured").checked?"SI":"NO",activo:$("#pActive")?.value||"SI",permite_stock_negativo:true,ocasion:$("#pOccasion").value.trim(),orden:toNumber($("#pOrder").value)};
  if(!payload.nombre){toast("El nombre es obligatorio");return}
  if(!tamanos.length){toast("Configura al menos un tamaño");return}
  const saved=await AleAPI.saveProductVerified(payload,token),verified=await AleAPI.adminModuleReliable("products",token,2);
  data=normalizePanelData(verified||{});const persisted=(data.products||[]).find(x=>String(x.id)===String(saved.id||payload.id));if(!persisted)throw new Error("PRODUCTO_NO_CONFIRMADO");
  const expected=tamanos.map(x=>({nombre:String(x.nombre||"").trim().toLowerCase(),precio:Number(x.precio||0),activo:String(x.activo||"SI").toUpperCase()}));
  const got=(persisted.tamanos||[]).map(x=>({nombre:String(x.nombre||"").trim().toLowerCase(),precio:Number(x.precio||0),activo:String(x.activo??"SI").toUpperCase()}));
  const mismatch=expected.some(e=>!got.some(g=>g.nombre===e.nombre&&g.precio===e.precio&&((e.activo==="NO")===(g.activo==="NO"||g.activo==="FALSE"))));
  if(mismatch)throw new Error("PRECIO_TAMANO_NO_PERSISTIDO");
  toast(file?"✓ Producto y precios verificados · inventario conservado":"✓ Producto y precios verificados · inventario conservado");
  closeProductEditor();renderAll()
}catch(err){console.warn(err);const code=String(err?.message||err||"");toast(code.includes("PRECIO_TAMANO_NO_PERSISTIDO")?"✕ El servidor no confirmó los precios por tamaño.":code.includes("PRODUCTO_NO_CONFIRMADO")?"✕ El producto no apareció al verificar el servidor.":"✕ No se confirmó la actualización")}}));

async function openProductStockEditor(id){
  const p=data.products.find(x=>String(x.id)===String(id));if(!p){toast("Producto no encontrado");return}
  closeProductEditor();
  openAdminView("stock");
  if($("#stockSearch"))$("#stockSearch").value=p.nombre||"";
  renderWarehouseStock();
  requestAnimationFrame(()=>$("#stockSearch")?.focus({preventScroll:true}));
}

function renderCategories(){$("#categoriesTable").innerHTML=table(["Imagen","Categoría","Descripción","Orden","Acciones"],data.categories.map(c=>`<tr><td>${imgTag(c.image_url)}</td><td><strong>${esc(c.nombre)}</strong></td><td>${esc(c.descripcion||"")}</td><td>${Number(c.orden||0)}</td><td><div class="row-actions"><button onclick="editCategory('${c.id}')">Editar</button><button class="danger" onclick="removeEntity('category','${c.id}',this)">Eliminar</button></div></td></tr>`).join(""))}
$("#newCategory").addEventListener("click",()=>{clearCategory();$("#categoryEditor").classList.remove("hidden")});
function clearCategory(){["cId","cImageId","cImageUrl","cName","cOrder","cDescription"].forEach(id=>$("#"+id).value="");resetFilePicker("#cImage")}
window.editCategory=id=>{const c=data.categories.find(x=>x.id===id);if(!c)return;resetFilePicker("#cImage");$("#cId").value=c.id;$("#cImageId").value=c.drive_file_id||"";$("#cImageUrl").value=c.image_url||"";$("#cName").value=c.nombre||"";$("#cOrder").value=c.orden||0;$("#cDescription").value=c.descripcion||"";$("#categoryEditor").classList.remove("hidden")};
$("#saveCategory").addEventListener("click",e=>busy(e.currentTarget,async()=>{try{let imageId=$("#cImageId").value,imageUrl=$("#cImageUrl").value;const file=$("#cImage").files[0];if(file){const u=await upload(file,"CATEGORIAS");imageId=u.fileId;imageUrl=u.imageUrl||imageUrl}await AleAPI.post("saveCategory",{id:$("#cId").value,nombre:$("#cName").value.trim(),descripcion:$("#cDescription").value.trim(),drive_file_id:imageId,image_url:imageUrl,orden:Number($("#cOrder").value||0),activo:"SI"},token);toast("Categoría guardada");$("#categoryEditor").classList.add("hidden");await reload()}catch(err){console.warn(err);toast("No fue posible guardar")}}));

function renderBanners(){$("#bannersTable").innerHTML=table(["Imagen","Título","Botón","Orden","Acciones"],data.banners.map(b=>`<tr><td>${imgTag(b.image_url)}</td><td><strong>${esc(b.titulo)}</strong><br><small>${esc(b.subtitulo||"")}</small></td><td>${esc(b.cta_texto||"")}</td><td>${Number(b.orden||0)}</td><td><div class="row-actions"><button onclick="editBanner('${b.id}')">Editar</button><button class="danger" onclick="removeEntity('banner','${b.id}',this)">Eliminar</button></div></td></tr>`).join(""))}
$("#newBanner").addEventListener("click",()=>{clearBanner();$("#bannerEditor").classList.remove("hidden")});
function clearBanner(){["bId","bImageId","bImageUrl","bTitle","bSubtitle","bCta","bLink","bOrder"].forEach(id=>$("#"+id).value="");resetFilePicker("#bImage")}
window.editBanner=id=>{const b=data.banners.find(x=>x.id===id);if(!b)return;resetFilePicker("#bImage");$("#bId").value=b.id;$("#bImageId").value=b.drive_file_id||"";$("#bImageUrl").value=b.image_url||"";$("#bTitle").value=b.titulo||"";$("#bSubtitle").value=b.subtitulo||"";$("#bCta").value=b.cta_texto||"";$("#bLink").value=b.enlace||"";$("#bOrder").value=b.orden||0;$("#bannerEditor").classList.remove("hidden")};
$("#saveBanner").addEventListener("click",e=>busy(e.currentTarget,async()=>{try{let imageId=$("#bImageId").value,imageUrl=$("#bImageUrl").value;const file=$("#bImage").files[0];if(file){const u=await upload(file,"BANNERS");imageId=u.fileId;imageUrl=u.imageUrl||imageUrl}await AleAPI.post("saveBanner",{id:$("#bId").value,titulo:$("#bTitle").value.trim(),subtitulo:$("#bSubtitle").value.trim(),cta_texto:$("#bCta").value.trim(),enlace:$("#bLink").value.trim(),drive_file_id:imageId,image_url:imageUrl,activo:"SI",orden:Number($("#bOrder").value||0)},token);toast("Banner guardado");$("#bannerEditor").classList.add("hidden");await reload()}catch(err){console.warn(err);toast("No fue posible guardar")}}));


function parseOrderLines(text){return String(text||"").split(/\n+/).map(line=>{const p=line.split("|").map(x=>x.trim());if(p.length<3)return null;const nombre=p[0],cantidad=Math.max(1,Number(p[1])||1),precio=parseClpAmount(p[2]);return nombre?{nombre,producto_nombre:nombre,cantidad,precio_unitario:precio,precio}:null}).filter(Boolean)}
function quoteIsConsumed(q){
  if(!q)return false;
  if(q._consumida||q.pedido_id)return true;
  return (data.orders||[]).some(o=>String(o.cotizacion_id||"")===String(q.id));
}
function fillOrderQuoteSelect(){
  const sel=$("#ocQuote");if(!sel)return;
  sel.innerHTML='<option value="">Pedido manual</option>'+data.quotes
    .filter(q=>!quoteIsConsumed(q)&&!["ANULADA","RECHAZADA","VENCIDA"].includes(String(q.estado||"").toUpperCase()))
    .map(q=>`<option value="${esc(q.id)}">${esc(q.numero_cotizacion||q.id)} · ${esc(q.cliente_nombre||"")} · ${money(q.total||0)}</option>`).join("");
}
function ensureOrderCreateBackdrop(){
  let backdrop=$("#orderCreateBackdrop");
  if(!backdrop){
    backdrop=document.createElement("div");
    backdrop.id="orderCreateBackdrop";
    backdrop.className="hidden";
    backdrop.setAttribute("aria-hidden","true");
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click",closeOrderCreate);
  }
  return backdrop;
}
function openOrderCreate(){
  fillOrderQuoteSelect();
  ["#ocName","#ocRut","#ocPhone","#ocEmail","#ocAddress","#ocCommune","#ocItems","#ocNotes"].forEach(x=>{if($(x))$(x).value=""});
  if($("#ocDispatch"))$("#ocDispatch").value=0;
  if($("#ocPayment"))$("#ocPayment").value="EFECTIVO";
  if($("#ocDelivery"))$("#ocDelivery").value="Retiro";
  setClientLookupState("#ocClientLookupState","Ingresa un RUT válido para buscar en Clientes.");
  const editor=$("#orderCreateEditor");if(!editor)return;
  // El modal se monta directamente en body para evitar stacking/overflow de tablas, tarjetas o sidebar.
  if(editor.parentElement!==document.body)document.body.appendChild(editor);
  ensureOrderCreateBackdrop().classList.remove("hidden");
  editor.classList.remove("hidden");
  document.body.classList.add("order-create-open");
  requestAnimationFrame(()=>{editor.scrollTop=0;$("#ocQuote")?.focus({preventScroll:true})});
}
function closeOrderCreate(){
  $("#orderCreateEditor")?.classList.add("hidden");
  $("#orderCreateBackdrop")?.classList.add("hidden");
  document.body.classList.remove("order-create-open");
}
$("#newOrder")?.addEventListener("click",openOrderCreate);
$("#closeOrderCreateX")?.addEventListener("click",closeOrderCreate);
$("#cancelOrderCreate")?.addEventListener("click",closeOrderCreate);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#orderCreateEditor")?.classList.contains("hidden"))closeOrderCreate()});
$("#ocQuote")?.addEventListener("change",async e=>{const q=data.quotes.find(x=>String(x.id)===String(e.target.value));if(!q)return;$("#ocName").value=q.cliente_nombre||"";$("#ocRut").value=q.rut?formatRutChile(q.rut):"";$("#ocPhone").value=q.telefono||"";$("#ocEmail").value=q.email||"";$("#ocNotes").value=q.observaciones||"";$("#ocItems").value=(Array.isArray(q.items)?q.items:[]).map(i=>`${i.descripcion||i.nombre||"Producto"} | ${i.cantidad||1} | ${i.precio_unitario||i.precio||0}`).join("\n");const request=data.requests.find(r=>String(r.id)===String(q.solicitud_id||""));const pref=String(q.medio_pago_preferido||request?.medio_pago_preferido||"").trim().toUpperCase();const pay=$("#ocPayment");if(pay){if(pref.includes("TRANSFER"))pay.value="TRANSFERENCIA";else if(pref.includes("TRANSBANK")||pref.includes("TARJETA")||pref.includes("WEBPAY"))pay.value="TRANSBANK";else if(pref.includes("EFECTIVO"))pay.value="EFECTIVO";}if(q.rut)await hydrateClientByRut({rutSelector:"#ocRut",statusSelector:"#ocClientLookupState",fields:{name:"#ocName",phone:"#ocPhone",email:"#ocEmail",address:"#ocAddress",commune:"#ocCommune",delivery:"#ocDelivery"},mode:"overwrite"});});
wireClientRutLookup({rutSelector:"#ocRut",statusSelector:"#ocClientLookupState",fields:{name:"#ocName",phone:"#ocPhone",email:"#ocEmail",address:"#ocAddress",commune:"#ocCommune",delivery:"#ocDelivery"}});
$("#saveOrderFromCpanel")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const detalle=parseOrderLines($("#ocItems").value);if(!detalle.length){toast("✕ Agrega al menos un producto");return}const delivery=$("#ocDelivery").value,commune=$("#ocCommune").value.trim();if(String(delivery).toUpperCase()==="DESPACHO"&&!commune){toast("✕ Ingresa la comuna para el despacho");$("#ocCommune").focus();return}const payload={cotizacion_id:$("#ocQuote").value||null,nombre:$("#ocName").value.trim(),rut:requireRutChile($("#ocRut").value),telefono:$("#ocPhone").value.trim(),email:$("#ocEmail").value.trim(),metodo_entrega:delivery,direccion:$("#ocAddress").value.trim(),comuna:commune,medio_pago:$("#ocPayment").value,bodega_id:$("#ocWarehouse")?.value||"",despacho:parseClpAmount($("#ocDispatch").value),detalle,total:(data.quotes.find(x=>String(x.id)===String($("#ocQuote").value))?.total||0),observaciones:$("#ocNotes").value.trim()};const out=await AleAPI.post("admincreateorder",payload,token);const consumedQuoteId=String(payload.cotizacion_id||"");if(consumedQuoteId){const qix=data.quotes.findIndex(x=>String(x.id)===consumedQuoteId);if(qix>=0)data.quotes[qix]={...data.quotes[qix],estado:"UTILIZADA",pedido_id:out.order?.id||"CONSUMIDA",pedido_numero:out.order?.numero_pedido||"",_consumida:true};if(out.order?.id&&!data.orders.some(x=>String(x.id)===String(out.order.id)))data.orders.unshift({...out.order,cotizacion_id:consumedQuoteId});fillOrderQuoteSelect();renderQuotes()}toast(`✓ Pedido ${out.order?.numero_pedido||out.order?.id||""} creado`);closeOrderCreate();await loadAdminModules({modules:["orders","quotes"],retry:true});if(out.order?.id){window.openOrderDetail(out.order.id);const o=data.orders.find(x=>String(x.id)===String(out.order.id));if(o&&out.payment_link_required)o._payment_link_required=true}}catch(err){console.warn(err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("COTIZACION_YA_CONVERTIDA")?"✕ Esta cotización ya fue utilizada en un pedido y no puede reutilizarse.":code.includes("COTIZACION_NO_VIGENTE")?"✕ La cotización ya no está vigente para crear pedidos.":code.includes("TELEFONO_YA_ASOCIADO")?"✕ Ese teléfono ya está asociado a otro RUT en Clientes.":code.includes("EMAIL_YA_ASOCIADO")?"✕ Ese correo ya está asociado a otro RUT en Clientes.":"✕ No fue posible crear el pedido")}}));

window.changeCashPaymentState=async(id,next,control)=>{
  const o=data.orders.find(x=>String(x.id)===String(id));
  if(!o){toast("✕ Pedido no encontrado");renderOrders();return}
  const target=String(next||"").trim().toUpperCase();
  if(target!=="PAGADO"){renderOrders();return}
  if(isFinalOrder(o)){toast(`✕ ${orderFinalMessage(o.estado)}. El pedido está bloqueado.`);renderOrders();return}
  if(canonicalOrderPaymentMethod(o.medio_pago)!=="EFECTIVO"){toast("✕ Solo los pedidos en EFECTIVO pueden confirmarse manualmente desde este control.");renderOrders();return}
  if(String(o.estado_pago||"").toUpperCase()==="PAGADO"){toast("✓ Este pedido ya está pagado");renderOrders();return}
  const total=money(o.total);
  if(!window.confirm(`¿Marcar como PAGADO el pedido ${o.numero_pedido||o.id}?

Medio: EFECTIVO
Monto recibido: ${total}

El movimiento quedará registrado en la trazabilidad.`)){renderOrders();return}
  try{
    beginBusy(control);
    const out=await AleAPI.post("adminmarkcashpaid",{id:o.id},token);
    const ix=data.orders.findIndex(x=>String(x.id)===String(o.id));
    if(ix>=0)data.orders[ix]={...data.orders[ix],estado_pago:"PAGADO",estado:out?.estado||data.orders[ix].estado,fecha_pago:out?.fecha_pago||new Date().toISOString(),medio_pago:"EFECTIVO"};
    toast("✓ Pedido marcado como PAGADO · EFECTIVO");
    await loadAdminModules({modules:["orders","requests"],retry:true});
    renderOrders();renderRequests();reportAnalytics=null;
    if(currentOrderDetailId&&String(currentOrderDetailId)===String(o.id))await window.openOrderDetail(o.id);
  }catch(err){
    console.warn("changeCashPaymentState",err);
    const code=String(err?.message||err||"").toUpperCase();
    toast(code.includes("PEDIDO_NO_ES_EFECTIVO")?"✕ El pedido no está registrado como EFECTIVO":code.includes("PEDIDO_ESTADO_FINAL")?"✕ El pedido está finalizado y no admite cambios":code.includes("PEDIDO_YA_PAGADO")?"✓ Este pedido ya está pagado":"✕ No fue posible marcar el pedido como PAGADO");
    try{await loadAdminModules({modules:["orders"],retry:true})}catch(_){ }
    renderOrders();
  }finally{endBusy(control)}
};
function orderDteName(tipo){
  const map={33:"Factura 33",34:"Factura Exenta 34",39:"Boleta 39",41:"Boleta Exenta 41",52:"Guía 52",56:"Nota Débito 56",61:"Nota Crédito 61"};
  return map[Number(tipo)]||`DTE ${Number(tipo)||""}`;
}
function orderDteTone(doc){
  if(doc?.es_prueba_local)return"local";
  const s=String(doc?.estado||doc?.estado_sii||"").toUpperCase();
  if(s.includes("RECHAZ")||s.includes("ERROR"))return"error";
  if(s.includes("ACEPT"))return"accepted";
  if(s.includes("ENVIADO"))return"sent";
  return"issued";
}
function orderDteBadges(order,full=false){
  const docs=Array.isArray(order?.documentos_tributarios)?order.documentos_tributarios:[];
  if(!docs.length)return '<span class="muted-text order-dte-none">Sin DTE</span>';
  const limit=full?20:3,shown=docs.slice(0,limit);
  const badges=shown.map(doc=>{
    const tone=orderDteTone(doc),folio=Number(doc.folio||0).toLocaleString("es-CL"),state=String(doc.estado||doc.estado_sii||"REGISTRADO").toUpperCase(),mode=doc.es_prueba_local?"PRUEBA LOCAL":String(doc.ambiente||"").toUpperCase()==="PRODUCCION"?"PROD":"CERT";
    const title=`${orderDteName(doc.tipo_dte)} · Folio ${folio} · ${mode} · ${state}${doc.track_id?` · TrackID ${doc.track_id}`:""}`;
    return `<span class="order-dte-chip ${tone}" title="${esc(title)}"><i class="bi bi-receipt"></i>${esc(orderDteName(doc.tipo_dte))}<b>F${esc(folio)}</b>${doc.es_prueba_local?'<em>PRUEBA</em>':state.includes("ACEPT")?'<em>ACEPTADO</em>':state.includes("RECHAZ")?'<em>RECHAZADO</em>':""}</span>`;
  }).join("");
  return `<div class="order-dte-list">${badges}${docs.length>limit?`<span class="order-dte-more">+${docs.length-limit}</span>`:""}</div>`;
}
function renderOrders(){
  const host=$("#ordersTable");if(!host)return;
  const normalStates=["PENDIENTE","CONFIRMADO","EN PREPARACION","LISTO","ENTREGADO"];
  const visibleOrders=filteredCommercialRows("orders",data.orders);updateCommercialFilterUi("orders",visibleOrders.length,data.orders.length);
  host.innerHTML=table(["N.º pedido","Tipo","Fecha","Cliente / RUT","Contacto","Entrega","Total","Pago","DTE","Estado","PDF"],visibleOrders.map(o=>{
    const final=isFinalOrder(o),st=orderState(o.estado),saleType=String(o.tipo_venta||o.origen||"MINORISTA").toUpperCase()==="MAYORISTA"?"MAYORISTA":"MINORISTA";
    const statusHtml=final?`<select class="status-select is-final" disabled title="${esc(orderFinalMessage(st))}"><option selected>${esc(st)}</option></select>`:`<select class="status-select" title="${esc(st)}" onchange="this.title=this.value;changeStatus('order','${o.id}',this.value)">${normalStates.map(x=>`<option ${st===x?"selected":""}>${x}</option>`).join("")}</select>`;
    const cancelAction=final?`<span class="order-final-chip ${st==="CANCELADO"?"cancelled":""}"><i class="bi ${st==="CANCELADO"?"bi-x-octagon":"bi-check2-circle"}"></i>${st}</span>`:`<button type="button" class="cancel-order-row" onclick="openOrderCancel('${o.id}')"><i class="bi bi-x-octagon"></i> Anular</button>`;
    const paymentState=String(o.estado_pago||"PENDIENTE").trim().toUpperCase();
    const paymentMethod=canonicalOrderPaymentMethod(o.medio_pago);
    const paymentClass=paymentState==="PAGADO"?"payment-pagado":(["RECHAZADO","CANCELADO"].includes(paymentState)?"payment-rechazado":"payment-pendiente");
    const paymentControl=paymentMethod==="EFECTIVO"&&!final
      ?(paymentState==="PAGADO"
        ?`<select class="status-select payment-cash-select payment-pagado" disabled title="Pago en efectivo confirmado"><option selected>PAGADO</option></select>`
        :`<select class="status-select payment-cash-select payment-pendiente" title="Cambiar estado de pago en efectivo" onchange="changeCashPaymentState('${o.id}',this.value,this)"><option value="PENDIENTE" selected>PENDIENTE</option><option value="PAGADO">PAGADO</option></select>`)
      :`<span class="payment-status-badge ${paymentClass}" title="${esc(paymentState)}">${esc(paymentState)}</span>`;
    const fullDate=formatDate(o.fecha),dateParts=String(fullDate||"").split(","),dateMain=dateParts.shift()||"",dateTime=dateParts.join(",").trim();
    const orderInlineActions=`<div class="row-actions order-row-actions order-inline-actions"><button type="button" onclick="openOrderDetail('${o.id}')"><i class="bi bi-eye"></i> Ver pedido</button>${cancelAction}</div>`;
    return `<tr class="order-row-clickable" data-order-id="${esc(o.id)}" tabindex="0" aria-label="Abrir detalle del pedido ${esc(o.numero_pedido||o.id)}">
    <td class="order-number-cell"><strong>${esc(o.numero_pedido||o.id)}</strong>${orderInlineActions}</td>
    <td class="order-type-cell"><span class="sale-type-badge ${saleType.toLowerCase()}">${saleType}</span>${saleType==="MAYORISTA"&&o.lista_precio_nombre?`<small>${esc(o.lista_precio_nombre)}</small>`:""}</td>
    <td class="order-date-cell"><span>${esc(dateMain)}</span>${dateTime?`<small>${esc(dateTime)}</small>`:""}</td>
    <td class="order-client-cell"><strong title="${esc(o.nombre||"")}">${esc(o.nombre||"")}</strong><small>${esc(o.rut?formatRutChile(o.rut):"")}</small></td>
    <td class="order-contact-cell"><span title="${esc(o.telefono||"")}">${esc(o.telefono||"")}</span><small title="${esc(o.email||"")}">${esc(o.email||"")}</small></td>
    <td class="order-delivery-cell"><span title="${esc(o.metodo_entrega||"")}">${esc(o.metodo_entrega||"")}</span><small title="${esc([o.direccion,o.comuna].filter(Boolean).join(" · ")||"")}">${esc([o.direccion,o.comuna].filter(Boolean).join(" · "))}</small></td>
    <td class="money-column"><strong>${money(o.total||0)}</strong></td>
    <td class="order-payment-cell">${paymentControl}<small title="${esc(orderPaymentMethodLabel(paymentMethod))}">${esc(orderPaymentMethodLabel(paymentMethod))}</small></td>
    <td class="order-dte-cell">${orderDteBadges(o,false)}</td>
    <td class="order-status-cell">${statusHtml}</td>
    <td class="order-pdf-cell">${(o.pdf_url||o.pdf_path)?`<button class="pdf-link order-pdf-secure-btn" type="button" data-order-pdf="${esc(o.id)}"><i class="bi bi-file-earmark-pdf"></i> PDF</button>`:'<span class="muted-text">Pendiente</span>'}</td>
  </tr>`}).join(""));
}
async function secureOrderPdfUrl(orderId){const out=await AleAPI.post("orderpdflink",{id:String(orderId||"")},token);if(!out?.pdf_url)throw new Error("PDF_PEDIDO_NO_DISPONIBLE");return clientPublicUrl(out.pdf_url)}
async function openSecureOrderPdf(orderId,button=null){let tab=null;try{tab=window.open("about:blank","_blank");if(tab)tab.document.write('<title>Ale Atencio · PDF</title><body style="font-family:Arial,sans-serif;padding:24px">Cargando PDF seguro…</body>');const url=await secureOrderPdfUrl(orderId);if(tab)tab.location.replace(url);else window.location.href=url}catch(err){try{tab?.close()}catch(_){}console.warn("secureOrderPdf",err);toast("✕ No fue posible abrir el PDF seguro")}}
$("#ordersTable")?.addEventListener("click",e=>{
  const pdf=e.target.closest("[data-order-pdf]");
  if(pdf){e.stopPropagation();openSecureOrderPdf(pdf.dataset.orderPdf,pdf);return}
  if(e.target.closest("button,a,select,input,textarea,label,[role=button]"))return;
  const row=e.target.closest("tr[data-order-id]");
  if(row?.dataset?.orderId)window.openOrderDetail(row.dataset.orderId);
});
$("#ordersTable")?.addEventListener("keydown",e=>{
  if(e.key!=="Enter"&&e.key!==" ")return;
  if(e.target.closest("button,a,select,input,textarea,label,[role=button]"))return;
  const row=e.target.closest("tr[data-order-id]");
  if(!row?.dataset?.orderId)return;
  e.preventDefault();
  window.openOrderDetail(row.dataset.orderId);
});
window.changeStatus=async(kind,id,status)=>{
  if(kind==="request"){const r=data.requests.find(x=>String(x.id)===String(id));if(requestIsClosed(r)){toast("✕ La solicitud está CERRADA por pago confirmado y ya no admite cambios.");renderRequests();return}}
  if(kind==="order"){const o=data.orders.find(x=>String(x.id)===String(id));if(o&&isFinalOrder(o)){toast(`✕ ${orderFinalMessage(o.estado)}. No se puede modificar.`);renderOrders();return}if(orderState(status)==="CANCELADO"){window.openOrderCancel(id);renderOrders();return}}
  try{await AleAPI.post("updatestatus",{kind,id,status},token);const list=kind==="order"?data.orders:data.requests;const ix=list.findIndex(x=>String(x.id)===String(id));if(ix>=0)list[ix]={...list[ix],estado:status,updated_at:new Date().toISOString()};if(kind==="order"){renderOrders();reportAnalytics=null;if($("#view-reports")?.classList.contains("active"))loadReports(true).catch(()=>{})}else renderRequests();toast(orderState(status)==="ENTREGADO"?"✓ Pedido marcado como ENTREGADO. El estado quedó bloqueado.":"✓ Estado actualizado")}catch(err){console.warn("changeStatus",err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("PEDIDO_ESTADO_FINAL")?"✕ El pedido está finalizado y no admite cambios.":code.includes("SOLICITUD_CERRADA")?"✕ La solicitud está CERRADA y protegida contra cambios.":"No fue posible actualizar el estado");try{await loadAdminModules({modules:[kind==="order"?"orders":"requests"],retry:true})}catch(_){}}};
let currentOrderDetailId="";
function canonicalOrderPaymentMethod(v){const s=String(v||"").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");if(!s)return"";if(s.includes("TRANSFER"))return"TRANSFERENCIA";if(s.includes("TRANSBANK")||s.includes("TARJETA")||s.includes("WEBPAY")||s.includes("CARD"))return"TRANSBANK";if(s.includes("EFECTIVO")||s.includes("CASH"))return"EFECTIVO";return s}
function orderPaymentMethodLabel(v){const m=canonicalOrderPaymentMethod(v);return m==="TRANSFERENCIA"?"Transferencia":m==="TRANSBANK"?"Tarjeta · Transbank":m==="EFECTIVO"?"Efectivo":(m||"Por definir")}
function closeOrderDetail(){currentOrderDetailId="";$("#orderDetailEditor")?.classList.add("hidden");document.body.classList.remove("order-detail-open")}
function renderOrderDetail(order,items,history=[],dtes=[]){
  currentOrderDetailId=String(order.id||"");
  $("#orderDetailNumber").textContent=order.numero_pedido||order.id||"";
  const final=isFinalOrder(order),finalState=orderState(order.estado);
  const paymentMethod=canonicalOrderPaymentMethod(order.medio_pago);
  const docs=Array.isArray(dtes)&&dtes.length?dtes:(Array.isArray(order.documentos_tributarios)?order.documentos_tributarios:[]);
  order.documentos_tributarios=docs;
  $("#orderDetailSummary").innerHTML=`<div><span>Cliente</span><strong>${esc(order.nombre||"")}</strong></div><div><span>RUT</span><strong>${esc(order.rut?formatRutChile(order.rut):"-")}</strong></div><div><span>WhatsApp</span><strong>${esc(order.telefono||"-")}</strong></div><div><span>Correo</span><strong>${esc(order.email||"-")}</strong></div><div><span>Entrega</span><strong>${esc(order.metodo_entrega||"-")}</strong></div><div><span>Dirección</span><strong>${esc([order.direccion,order.comuna].filter(Boolean).join(" · ")||"-")}</strong></div><div><span>Tipo de venta</span><strong>${String(order.tipo_venta||order.origen||"MINORISTA").toUpperCase()==="MAYORISTA"?"MAYORISTA":"MINORISTA"}</strong></div>${String(order.tipo_venta||order.origen||"").toUpperCase()==="MAYORISTA"?`<div><span>Lista de precios</span><strong>${esc(order.lista_precio_nombre||order.lista_precio_id||"-")}</strong></div>`:""}<div><span>Estado</span><strong>${esc(order.estado||"")}</strong></div><div><span>Estado de pago</span><strong>${esc(order.estado_pago||"PENDIENTE")}</strong></div><div><span>Medio de pago</span><strong>${esc(orderPaymentMethodLabel(paymentMethod))}</strong></div><div><span>Fecha</span><strong>${esc(formatDate(order.fecha))}</strong></div><div class="order-detail-dte-card"><span>Documento tributario</span>${orderDteBadges(order,true)}</div>${final?`<div class="order-detail-final-note ${finalState==="ENTREGADO"?"delivered":""}"><span>Estado final</span><strong>${esc(orderFinalMessage(finalState))}${finalState==="CANCELADO"&&order.anulado_motivo?` · Motivo: ${esc(order.anulado_motivo)}`:""}</strong></div>`:""}`;
  const proofBox=$("#orderTransferProof"),proofLink=$("#orderTransferProofLink"),proofState=$("#orderTransferProofState"),approveBtn=$("#approveTransferPayment"),cashBtn=$("#confirmCashPayment"),payWa=$("#sendOrderPaymentWhatsApp"),cancelBtn=$("#cancelOrderBtn"),regenBtn=$("#regenerateOrderPdf");
  const paymentPaid=String(order.estado_pago||"").toUpperCase()==="PAGADO";
  if(proofBox){const transfer=paymentMethod==="TRANSFERENCIA";proofBox.classList.toggle("hidden",!transfer);if(transfer){const has=!!order.comprobante_pago_url;proofLink.classList.toggle("hidden",!has);if(has)proofLink.href=order.comprobante_pago_url;proofState.textContent=has?(order.comprobante_pago_estado||"PENDIENTE_REVISION"):"Aún sin comprobante";approveBtn.classList.toggle("hidden",final||!has||paymentPaid)}}
  if(cashBtn){cashBtn.classList.toggle("hidden",final||paymentMethod!=="EFECTIVO"||paymentPaid);cashBtn.disabled=final||paymentPaid;cashBtn.title=paymentPaid?"Este pedido ya está pagado":"Registrar cobro manual en efectivo";}
  if(payWa)payWa.classList.toggle("hidden",final||paymentMethod!=="TRANSBANK"||paymentPaid);if(cancelBtn)cancelBtn.classList.toggle("hidden",final);if(regenBtn){regenBtn.disabled=false;regenBtn.title=final?"El estado comercial permanece bloqueado; el PDF sí puede reimprimirse/actualizarse.":"";}
  $("#orderDetailItems").innerHTML=(items||[]).length?(items||[]).map(i=>`<div class="order-detail-line"><span><strong>${esc(i.producto_nombre||i.nombre||"Producto")}</strong><small>${i.tamano_nombre?`Tamaño: ${esc(i.tamano_nombre)} · `:""}${esc(i.producto_id||i.id||"")}</small></span><span>${Number(i.cantidad||1)}</span><span>${money(i.precio_unitario??i.precio)}</span><span><strong>${money(i.subtotal??(Number(i.cantidad||1)*Number(i.precio_unitario??i.precio??0)))}</strong></span></div>`).join(""):'<div class="empty-card">Este pedido histórico no tiene líneas de producto recuperables.</div>';
  $("#orderDetailTotals").innerHTML=`<div><span>Subtotal</span><strong>${money(order.subtotal)}</strong></div><div><span>Despacho</span><strong>${money(order.despacho)}</strong></div><div class="grand"><span>Total</span><strong>${money(order.total)}</strong></div>${order.observaciones?`<p><b>Observaciones:</b> ${esc(order.observaciones)}</p>`:""}`;
  const hh=$("#orderDetailHistory");if(hh)hh.innerHTML=(history||[]).length?(history||[]).map(h=>{const isDte=String(h.evento||"").toUpperCase().startsWith("DTE_");return `<div class="order-history-row ${isDte?"is-dte":""}"><span class="order-history-dot"></span><div><strong>${isDte?'<i class="bi bi-receipt"></i> ':''}${esc(h.descripcion||h.evento||"Actualización")}</strong><small>${esc(formatDate(h.creado_en||h.fecha))}${h.estado_pago?` · Pago: ${esc(h.estado_pago)}`:""}${h.estado_pedido?` · Pedido: ${esc(h.estado_pedido)}`:""}</small></div></div>`}).join(""):'<div class="muted-text">La trazabilidad se registrará desde esta versión.</div>';
  const link=$("#orderDetailPdfLink"),reprint=$("#reprintOrderPdf"),hasPdf=!!(order.pdf_url||order.pdf_path);if(hasPdf){link.href="#";link.dataset.orderPdfId=String(order.id||"");link.classList.remove("hidden")}else{link.href="#";delete link.dataset.orderPdfId;link.classList.add("hidden")}if(reprint){reprint.disabled=!hasPdf;reprint.title=hasPdf?`Abrir PDF guardado para reimprimir · ${documentFormatLabel()}`:"Genera primero el PDF del pedido"}
}
window.openOrderDetail=async id=>{
  const local=data.orders.find(x=>String(x.id)===String(id));if(!local)return toast("Pedido no encontrado");
  $("#orderDetailEditor")?.classList.remove("hidden");document.body.classList.add("order-detail-open");renderOrderDetail(local,Array.isArray(local.detalle)?local.detalle:[],[],local.documentos_tributarios||[]);
  try{const out=await AleAPI.post("orderdetail",{id},token);if(out?.order){renderOrderDetail(out.order,out.items||[],out.history||[],out.documentos_tributarios||out.order.documentos_tributarios||[]);const ix=data.orders.findIndex(x=>String(x.id)===String(id));if(ix>=0){data.orders[ix]={...data.orders[ix],...out.order,documentos_tributarios:out.documentos_tributarios||out.order.documentos_tributarios||data.orders[ix].documentos_tributarios||[]};renderOrders()}}}catch(err){console.warn("orderdetail",err);toast("El pedido se abrió con los datos disponibles; no se pudo actualizar el detalle completo")}
};
$("#closeOrderDetailX")?.addEventListener("click",closeOrderDetail);$("#closeOrderDetail")?.addEventListener("click",closeOrderDetail);
$("#orderDetailPdfLink")?.addEventListener("click",e=>{e.preventDefault();const id=e.currentTarget.dataset.orderPdfId||currentOrderDetailId;if(id)openSecureOrderPdf(id,e.currentTarget)});
$("#regenerateOrderPdf")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{if(!currentOrderDetailId)return;try{const out=await AleAPI.post("generateorderpdf",{id:currentOrderDetailId},token);if(out?.order){renderOrderDetail(out.order,out.items||[],out.history||[],out.documentos_tributarios||out.order.documentos_tributarios||[]);const ix=data.orders.findIndex(x=>String(x.id)===String(currentOrderDetailId));if(ix>=0)data.orders[ix]={...data.orders[ix],...out.order,documentos_tributarios:out.documentos_tributarios||out.order.documentos_tributarios||data.orders[ix].documentos_tributarios||[]};renderOrders()}toast("PDF del pedido generado correctamente")}catch(err){console.warn(err);toast(`No fue posible generar el PDF del pedido: ${String(err?.message||"ERROR")}`)}}));
$("#reprintOrderPdf")?.addEventListener("click",()=>{if(!currentOrderDetailId)return;openSecureOrderPdf(currentOrderDetailId)});

async function secureOrderTrackingUrl(order){const out=await AleAPI.post("ordertrackinglink",{id:order.id},token);if(!out?.tracking_url)throw new Error("SEGUIMIENTO_NO_DISPONIBLE");return clientPublicUrl(out.tracking_url)}
$("#copyOrderTracking")?.addEventListener("click",async()=>{const o=data.orders.find(x=>String(x.id)===String(currentOrderDetailId));if(!o)return;try{const url=await secureOrderTrackingUrl(o);await navigator.clipboard.writeText(url);toast("✓ Enlace seguro de seguimiento copiado")}catch(err){console.warn(err);toast("No fue posible copiar el enlace")}});
$("#sendOrderTrackingWhatsApp")?.addEventListener("click",async()=>{const o=data.orders.find(x=>String(x.id)===String(currentOrderDetailId));if(!o)return;const phone=String(o.telefono||"").replace(/\D/g,"");if(!phone)return toast("El pedido no tiene WhatsApp");try{const url=await secureOrderTrackingUrl(o);const text=`Hola ${o.nombre||""}, puedes consultar el estado de tu pedido ${o.numero_pedido||o.id} aquí: ${url}`;window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,"_blank","noopener")}catch(err){console.warn(err);toast("No fue posible generar el enlace de seguimiento")}});
let pendingCancelOrderId="";
function closeOrderCancel(){pendingCancelOrderId="";$("#orderCancelEditor")?.classList.add("hidden");document.body.classList.remove("order-cancel-open");if($("#orderCancelReason"))$("#orderCancelReason").value=""}
window.openOrderCancel=id=>{const o=data.orders.find(x=>String(x.id)===String(id));if(!o)return toast("Pedido no encontrado");if(isFinalOrder(o))return toast(`✕ ${orderFinalMessage(o.estado)}. No se puede volver a anular ni modificar.`);pendingCancelOrderId=String(id);const modal=$("#orderCancelEditor");if(!modal)return;if(modal.parentElement!==document.body)document.body.appendChild(modal);if($("#orderCancelNumber"))$("#orderCancelNumber").textContent=o.numero_pedido||o.id||"";if($("#orderCancelReason"))$("#orderCancelReason").value="";modal.classList.remove("hidden");document.body.classList.add("order-cancel-open");setTimeout(()=>$("#orderCancelReason")?.focus(),30)};
$("#closeOrderCancelX")?.addEventListener("click",closeOrderCancel);$("#closeOrderCancel")?.addEventListener("click",closeOrderCancel);
$("#orderCancelEditor")?.addEventListener("click",e=>{if(e.target===$("#orderCancelEditor"))closeOrderCancel()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#orderCancelEditor")?.classList.contains("hidden"))closeOrderCancel()});
$("#confirmCancelOrder")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{const id=pendingCancelOrderId||currentOrderDetailId;if(!id)return;const motivo=String($("#orderCancelReason")?.value||"").trim();if(motivo.length<5)return toast("✕ Debes indicar un motivo de anulación claro (mínimo 5 caracteres).");try{const out=await AleAPI.post("cancelorder",{id,motivo},token);const ix=data.orders.findIndex(x=>String(x.id)===String(id));if(ix>=0)data.orders[ix]={...data.orders[ix],estado:"CANCELADO",anulado_motivo:motivo,anulado_en:out.anulado_en||new Date().toISOString(),updated_at:new Date().toISOString()};closeOrderCancel();renderOrders();reportAnalytics=null;toast("✓ Pedido CANCELADO. El estado quedó bloqueado de forma irreversible.");if(String(currentOrderDetailId)===String(id))await window.openOrderDetail(id)}catch(err){console.warn("cancelorder",err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("PEDIDO_ESTADO_FINAL")?"✕ El pedido ya está en un estado final y no admite cambios.":code.includes("MOTIVO")?"✕ Debes ingresar el motivo de anulación.":"✕ No fue posible anular el pedido")}}));

function openOrderPaymentLinkEditor(){
  const o=data.orders.find(x=>String(x.id)===String(currentOrderDetailId));if(!o)return;
  if(isFinalOrder(o))return toast(`✕ ${orderFinalMessage(o.estado)}. No se puede asignar un nuevo enlace de pago.`);
  if(String(o.medio_pago||"").toUpperCase()!=="TRANSBANK")return toast("Este pedido no usa Transbank");
  if(String(o.estado_pago||"").toUpperCase()==="PAGADO")return toast("Este pedido ya está pagado");
  const modal=$("#orderPaymentLinkEditor");if(!modal)return;
  if(modal.parentElement!==document.body)document.body.appendChild(modal);
  if($("#orderPaymentExpiryDate"))$("#orderPaymentExpiryDate").value="";if($("#orderPaymentExpiryTime"))$("#orderPaymentExpiryTime").value="";if($("#orderPaymentOrderNumber"))$("#orderPaymentOrderNumber").textContent=o.numero_pedido||o.id||"";if($("#orderPaymentAmount"))$("#orderPaymentAmount").textContent=clpLabel(o.total);modal.classList.remove("hidden");document.body.classList.add("payment-link-open");setTimeout(()=>$("#orderPaymentExpiryDate")?.focus(),30);
}
function closeOrderPaymentLinkEditor(){$("#orderPaymentLinkEditor")?.classList.add("hidden");document.body.classList.remove("payment-link-open")}
function selectedPaymentExpiryIso(){const date=$("#orderPaymentExpiryDate")?.value||"",time=$("#orderPaymentExpiryTime")?.value||"";if(!date||!time)throw new Error("VIGENCIA_ENLACE_REQUERIDA");const d=new Date(`${date}T${time}:00`);if(!Number.isFinite(d.getTime())||d.getTime()<=Date.now()+60000)throw new Error("VIGENCIA_ENLACE_INVALIDA");return d.toISOString()}
async function generateAssignedPaymentLink(mode,btn){
  const o=data.orders.find(x=>String(x.id)===String(currentOrderDetailId));if(!o)return;
  const expiresAt=selectedPaymentExpiryIso();const out=await AleAPI.post("adminorderpaymentlink",{id:o.id,expires_at:expiresAt},token);
  const paymentUrl=clientPublicUrl(out.payment_url);const label=new Date(out.expires_at||expiresAt).toLocaleString("es-CL");const text=`Hola ${o.nombre||""}, tu pedido ${o.numero_pedido||o.id} está listo para pagar con Transbank. Este enlace estará disponible hasta ${label}: ${paymentUrl}`;
  closeOrderPaymentLinkEditor();
  if(mode==="whatsapp"){const phone=String(o.telefono||"").replace(/\D/g,"");if(!phone)throw new Error("PEDIDO_SIN_WHATSAPP");window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`,"_blank","noopener");toast(`✓ Enlace asignado hasta ${label}`)}
  else{await navigator.clipboard.writeText(paymentUrl);toast(`✓ Enlace copiado · vigente hasta ${label}`)}
}
$("#sendOrderPaymentWhatsApp")?.addEventListener("click",openOrderPaymentLinkEditor);
$("#closeOrderPaymentLinkX")?.addEventListener("click",closeOrderPaymentLinkEditor);
$("#cancelOrderPaymentLink")?.addEventListener("click",closeOrderPaymentLinkEditor);
$("#generatePaymentLinkWhatsapp")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{await generateAssignedPaymentLink("whatsapp",e.currentTarget)}catch(err){console.warn(err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("VIGENCIA")?"✕ Define una fecha y hora futura para la vigencia del enlace.":code.includes("WHATSAPP")?"✕ El pedido no tiene WhatsApp.":"✕ No fue posible generar el enlace de pago")}}));
$("#generatePaymentLinkCopy")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{await generateAssignedPaymentLink("copy",e.currentTarget)}catch(err){console.warn(err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("VIGENCIA")?"✕ Define una fecha y hora futura para la vigencia del enlace.":"✕ No fue posible generar el enlace de pago")}}));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#orderPaymentLinkEditor")?.classList.contains("hidden"))closeOrderPaymentLinkEditor()});
$("#approveTransferPayment")?.addEventListener("click",async e=>busy(e.currentTarget,async()=>{const o=data.orders.find(x=>String(x.id)===String(currentOrderDetailId));if(o&&isFinalOrder(o))return toast(`✕ ${orderFinalMessage(o.estado)}. No se puede modificar el pago.`);try{await AleAPI.post("adminverifytransfer",{id:currentOrderDetailId},token);toast("✓ Transferencia verificada: pago PAGADO y pedido CONFIRMADO");await reload();if(currentOrderDetailId)openOrderDetail(currentOrderDetailId)}catch(err){console.warn(err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("PEDIDO_ESTADO_FINAL")?"✕ El pedido está finalizado y no admite cambios.":"✕ No fue posible confirmar la transferencia")}}));
$("#confirmCashPayment")?.addEventListener("click",async e=>{
  const o=data.orders.find(x=>String(x.id)===String(currentOrderDetailId));
  if(!o)return toast("✕ Pedido no encontrado");
  if(isFinalOrder(o))return toast(`✕ ${orderFinalMessage(o.estado)}. No se puede modificar el pago.`);
  if(canonicalOrderPaymentMethod(o.medio_pago)!=="EFECTIVO")return toast("✕ Este pedido no usa pago en efectivo");
  if(String(o.estado_pago||"").toUpperCase()==="PAGADO")return toast("✓ Este pedido ya está pagado");
  const total=money(o.total);
  if(!window.confirm(`¿Confirmar que se recibió ${total} en EFECTIVO para el pedido ${o.numero_pedido||o.id}?\n\nEsta acción quedará registrada en la trazabilidad.`))return;
  await busy(e.currentTarget,async()=>{
    try{
      const out=await AleAPI.post("adminmarkcashpaid",{id:currentOrderDetailId},token);
      toast(`✓ Pedido marcado como PAGADO · EFECTIVO`);
      await reload();
      if(currentOrderDetailId)openOrderDetail(currentOrderDetailId);
    }catch(err){
      console.warn(err);
      const code=String(err?.message||err||"").toUpperCase();
      toast(code.includes("PEDIDO_YA_PAGADO")?"✓ Este pedido ya está pagado":code.includes("PEDIDO_NO_ES_EFECTIVO")?"✕ El pedido no está configurado para pago en efectivo":code.includes("PEDIDO_ESTADO_FINAL")?"✕ El pedido está finalizado y no admite cambios.":"✕ No fue posible confirmar el pago en efectivo");
    }
  });
});

function requestIsClosed(r){return String(r?.estado||"").trim().toUpperCase()==="CERRADA"}
function renderRequests(){
  pruneSelection("requests",data.requests);
  const canDelete=!!data.permissions?.requests?.delete;if(!canDelete)selectedSet("requests").clear();
  const visibleRequests=filteredCommercialRows("requests",data.requests);updateCommercialFilterUi("requests",visibleRequests.length,data.requests.length);
  const visibleIds=visibleRequests.filter(r=>!requestIsClosed(r)).map(r=>String(r.id));
  const headers=canDelete?[`<span class="bulk-select-col">${bulkHeaderCheckbox("requests",visibleIds)}</span>`,"N.º solicitud","Fecha","Cliente / RUT","Tipo","Evento","Detalle","Estado","Acciones"]:["N.º solicitud","Fecha","Cliente / RUT","Tipo","Evento","Detalle","Estado","Acciones"];
  const rows=visibleRequests.map(r=>{const closed=requestIsClosed(r),selected=!closed&&selectedSet("requests").has(String(r.id)),used=requestConsumedQuoteId(r),usedLabel=r.cotizacion_numero||used;const quoteAction=used?`<span class="request-used-badge" title="Esta solicitud ya fue utilizada en una cotización"><i class="bi bi-check2-circle"></i> Cotizada${usedLabel?` · ${esc(usedLabel)}`:""}</span>`:closed?`<span class="request-closed-lock"><i class="bi bi-lock-fill"></i> Cerrada</span>`:`<button type="button" onclick="quoteFromRequest('${r.id}')"><i class="bi bi-receipt-cutoff"></i> Cotizar</button>`;const statusHtml=closed?`<select class="status-select is-request-closed" disabled title="Solicitud cerrada por pedido pagado"><option selected>CERRADA</option></select>`:`<select class="status-select" onchange="changeStatus('request','${r.id}',this.value)">${["NUEVA","CONTACTADA","COTIZADA","ACEPTADA","CERRADA"].map(st=>`<option ${String(r.estado).toUpperCase()===st?"selected":""}>${st}</option>`).join("")}</select>`;return `<tr class="request-row-client-clickable ${selected?"is-selected ":""}${closed?"request-row-closed":""}" data-request-id="${esc(r.id)}" tabindex="0" title="Abrir datos del cliente">${canDelete?`<td class="bulk-select-col">${closed?`<span class="bulk-locked" title="Solicitud CERRADA: no se puede eliminar"><i class="bi bi-lock-fill"></i></span>`:bulkCheckbox("requests",r.id)}</td>`:""}<td><strong>${esc(r.numero_solicitud||r.id)}</strong></td><td>${esc(formatDate(r.fecha))}</td><td><strong>${esc(r.nombre)}</strong><br><small>${esc(r.rut?formatRutChile(r.rut):"RUT sin registrar")} · ${esc(r.telefono||"")}</small></td><td>${esc(r.tipo||"")}</td><td>${esc(r.fecha_evento||"")}</td><td>${esc(r.detalle||"")}</td><td>${statusHtml}</td><td><div class="row-actions"><button type="button" onclick="openRequestClientEditor('${r.id}')" title="Ver o editar datos del cliente"><i class="bi bi-person-vcard"></i> Cliente</button>${quoteAction}<button type="button" onclick="generateRequestPdfFromList('${r.id}',this)" title="Generar / reimprimir PDF"><i class="bi bi-file-earmark-pdf"></i></button><button type="button" onclick="sendRequestWhatsapp('${r.id}',this)" title="Enviar seguimiento por WhatsApp"><i class="bi bi-whatsapp"></i></button>${canDelete&&!closed?`<button type="button" class="danger" onclick="deleteRequest('${r.id}',this)"><i class="bi bi-trash3"></i> Eliminar</button>`:closed?`<span class="request-closed-lock" title="Una solicitud CERRADA está protegida contra eliminación"><i class="bi bi-shield-lock"></i> Protegida</span>`:""}</div></td></tr>`}).join("");
  $("#requestsTable").innerHTML=table(headers,rows);updateBulkBar("requests");syncSelectedRows($("#requestsTable"));
}
$("#requestsTable")?.addEventListener("change",e=>{
  if(handleBulkCheckboxChange(e))return;
  const all=e.target.closest('input[data-bulk-select-all="requests"]');if(all){handleBulkSelectAllChange(e,filteredCommercialRows("requests",data.requests).filter(r=>!requestIsClosed(r)).map(r=>String(r.id)));renderRequests()}
});
let currentRequestClientEditorId="";
function closeRequestClientEditor(){currentRequestClientEditorId="";$("#requestClientEditor")?.classList.add("hidden");document.body.classList.remove("request-client-editor-open")}
window.openRequestClientEditor=id=>{const r=(data.requests||[]).find(x=>String(x.id)===String(id));if(!r)return toast("Solicitud no encontrada");currentRequestClientEditorId=String(id);const modal=$("#requestClientEditor");if(!modal)return;if(modal.parentElement!==document.body)document.body.appendChild(modal);$("#requestClientRequestId").value=r.id||"";$("#requestClientEditorNumber").textContent=`${r.numero_solicitud||r.id||""} · ${String(r.estado||"NUEVA").toUpperCase()}`;$("#requestClientName").value=r.nombre||"";$("#requestClientRut").value=r.rut?formatRutChile(r.rut):"";$("#requestClientPhone").value=r.telefono||"";$("#requestClientEmail").value=r.email||"";const closed=requestIsClosed(r),consumed=!!requestConsumedQuoteId(r),locked=closed||consumed,notice=$("#requestClientLockNotice"),save=$("#saveRequestClient");["#requestClientName","#requestClientRut","#requestClientPhone","#requestClientEmail"].forEach(sel=>{if($(sel))$(sel).disabled=locked});if(save)save.classList.toggle("hidden",locked);if(notice){notice.classList.toggle("is-visible",locked);notice.textContent=closed?"Solicitud CERRADA: los datos quedan en modo consulta y no pueden modificarse.":consumed?"Solicitud ya utilizada en una cotización: se conserva la ficha original para mantener la trazabilidad.":""}setClientLookupState("#requestClientLookupState",locked?"Ficha protegida: consulta solamente.":"Ingresa un RUT válido para buscar en Clientes.");modal.classList.remove("hidden");document.body.classList.add("request-client-editor-open");setTimeout(()=>$(locked?"#closeRequestClientEditor":"#requestClientRut")?.focus(),30)};
$("#closeRequestClientEditorX")?.addEventListener("click",closeRequestClientEditor);$("#closeRequestClientEditor")?.addEventListener("click",closeRequestClientEditor);$("#requestClientEditor")?.addEventListener("click",e=>{if(e.target===$("#requestClientEditor"))closeRequestClientEditor()});
$("#requestClientPdf")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const r=(data.requests||[]).find(x=>String(x.id)===String(currentRequestClientEditorId));if(!r)throw new Error("SOLICITUD_NO_ENCONTRADA");await generateRequestPdf(r,true);toast(`PDF ${documentFormatLabel()} generado`)}catch(err){console.warn(err);toast("No fue posible generar el PDF de la solicitud")}}));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#requestClientEditor")?.classList.contains("hidden"))closeRequestClientEditor()});
wireClientRutLookup({rutSelector:"#requestClientRut",statusSelector:"#requestClientLookupState",fields:{name:"#requestClientName",phone:"#requestClientPhone",email:"#requestClientEmail"},guard:()=>{const r=(data.requests||[]).find(x=>String(x.id)===String(currentRequestClientEditorId));return !requestIsClosed(r)&&!requestConsumedQuoteId(r)}});
$("#saveRequestClient")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const id=$("#requestClientRequestId").value||currentRequestClientEditorId,r=(data.requests||[]).find(x=>String(x.id)===String(id));if(requestIsClosed(r))throw new Error("SOLICITUD_CERRADA");if(requestConsumedQuoteId(r))throw new Error("SOLICITUD_COTIZADA_BLOQUEADA");const payload={id,nombre:$("#requestClientName").value.trim(),rut:requireRutChile($("#requestClientRut").value),telefono:$("#requestClientPhone").value.trim(),email:$("#requestClientEmail").value.trim()};const out=await AleAPI.post("updaterequestclient",payload,token);if(out?.request){const i=data.requests.findIndex(x=>String(x.id)===String(out.request.id));if(i>=0)data.requests[i]={...data.requests[i],...out.request}}if(out?.client)mergeClientCache(out.client);renderRequests();closeRequestClientEditor();toast("✓ Datos del cliente actualizados")}catch(err){console.warn(err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("SOLICITUD_CERRADA")?"✕ La solicitud está CERRADA y no admite cambios.":code.includes("SOLICITUD_COTIZADA_BLOQUEADA")?"✕ La solicitud ya fue utilizada en una cotización y conserva su ficha original.":code.includes("RUT")?"✕ Revisa el RUT del cliente.":code.includes("TELEFONO_YA_ASOCIADO")?"✕ Ese teléfono pertenece a otro RUT.":"✕ No fue posible guardar los datos del cliente")}}));
$("#requestsTable")?.addEventListener("click",e=>{if(e.target.closest("button,select,input,a,label"))return;const row=e.target.closest("tr[data-request-id]");if(row)window.openRequestClientEditor(row.dataset.requestId)});
$("#requestsTable")?.addEventListener("keydown",e=>{if(!["Enter"," "].includes(e.key)||e.target.closest("button,select,input,a"))return;const row=e.target.closest("tr[data-request-id]");if(row){e.preventDefault();window.openRequestClientEditor(row.dataset.requestId)}});

$("#deleteSelectedRequests")?.addEventListener("click",e=>deleteSelected("requests",e.currentTarget));
window.deleteRequest=async(id,btn)=>{
  const r=data.requests.find(x=>String(x.id)===String(id));
  if(requestIsClosed(r))return toast("✕ Esta solicitud está CERRADA y protegida. No se puede eliminar.");
  const label=r?.numero_solicitud||id;
  if(!confirm(`¿Eliminar definitivamente la solicitud ${label}?\n\nLas cotizaciones vinculadas se conservarán y quedarán sin solicitud asociada.`))return;
  await busy(btn,async()=>{
    try{
      const res=await AleAPI.post("deleteEntity",{kind:"request",id},token);
      if(!res?.deleted)throw new Error("SOLICITUD_NO_ELIMINADA");
      selectedSet("requests").delete(String(id));toast("✓ Solicitud eliminada");await reload();
    }catch(e){console.warn(e);const code=String(e?.message||e||"").toUpperCase();toast(code.includes("SOLICITUD_CERRADA")?"✕ La solicitud está CERRADA y no puede eliminarse.":"✕ No fue posible eliminar la solicitud")}
  });
};
window.sendRequestWhatsapp=(id,btn)=>{const popup=window.open("about:blank","_blank");return busy(btn,async()=>{const r=data.requests.find(x=>String(x.id)===String(id));if(!r){try{popup?.close()}catch(_){};throw new Error("SOLICITUD_NO_ENCONTRADA")}const phone=phoneForWhatsapp(r.telefono);if(!phone){try{popup?.close()}catch(_){};return toast("La solicitud no tiene WhatsApp")}try{const out=await AleAPI.post("requestsharelink",{id:r.id},token),url=clientPublicUrl(out?.public_url||"");const text=`Hola ${r.nombre||""}, puedes consultar tu solicitud ${r.numero_solicitud||r.id} aquí: ${url}`,waUrl=`https://wa.me/${phone}?text=${encodeURIComponent(text)}`;if(popup&&!popup.closed)popup.location.href=waUrl;else window.open(waUrl,"_blank","noopener");toast("Enlace público de solicitud preparado")}catch(err){try{popup?.close()}catch(_){};console.warn(err);toast("No fue posible generar el enlace de la solicitud")}})};
function renderUsers(){
  const list=data.users||[];
  $("#usersTable").innerHTML=table(["Perfil","Nombre / usuario","Rol","Estado","Último acceso","Acciones"],list.map(u=>`<tr><td><img class="user-avatar" src="${esc(u.profile_url||'favicon.png')}" alt=""></td><td><strong>${esc(u.nombre||'')}</strong><br><small>@${esc(u.usuario||'')}</small></td><td><span class="role-badge">${esc(({ADMIN:'Administrador',GERENCIA:'Gerencia',OPERADOR:'Operador',EDITOR:'Editor',LECTURA:'Lectura',MAYORISTA:'Mayorista'})[String(u.rol||'EDITOR').toUpperCase()]||u.rol||'Editor')}</span></td><td><span class="role-badge ${String(u.activo).toUpperCase()==='NO'?'inactive-badge':''}">${String(u.activo).toUpperCase()==='NO'?'Inactivo':'Activo'}</span></td><td>${esc(formatDate(u.ultimo_acceso))}</td><td><div class="row-actions"><button onclick="editUser('${u.id}')">Editar</button>${u.id!==data.currentUser?.id?`<button class="danger" onclick="deleteUser('${u.id}',this)">Desactivar</button>`:''}</div></td></tr>`).join(""));
}
function wholesaleActive(v){return v!==false&&!['NO','FALSE','0','INACTIVO'].includes(String(v??'SI').toUpperCase())}
function fillWholesaleSelectors(){
  const clients=(data.wholesalers?.length?data.wholesalers:data.clients||[]).filter(c=>String(c.tipo_cliente||'').toUpperCase()==='MAYORISTA');
  const lists=(data.priceLists||[]).filter(x=>wholesaleActive(x.activo));
  const cOpts='<option value="">Seleccionar cliente</option>'+clients.map(c=>`<option value="${esc(c.id)}">${esc(c.razon_social||c.nombre)} · ${esc(c.rut||'')}</option>`).join('');
  const lOpts='<option value="">Seleccionar lista</option>'+lists.map(l=>`<option value="${esc(l.id)}">${esc(l.nombre)}${l.codigo?` (${esc(l.codigo)})`:''}</option>`).join('');
  const apply=(selector,html)=>{const sel=$(selector);if(!sel)return;const prev=sel.value;sel.innerHTML=html;if(prev&&[...sel.options].some(o=>String(o.value)===String(prev)))sel.value=prev};
  apply("#uClient",cOpts);apply("#whDocClient",cOpts);apply("#whCreditClient",cOpts.replace('Seleccionar cliente','Seleccionar Mayorista'));apply("#whCreditPaymentClient",cOpts.replace('Seleccionar cliente','Seleccionar Mayorista'));apply("#whCreditIncreaseClient",cOpts.replace('Seleccionar cliente','Seleccionar Mayorista'));apply("#uPriceList",lOpts);apply("#clientPriceList",'<option value="">Sin lista</option>'+lists.map(l=>`<option value="${esc(l.id)}">${esc(l.nombre)}${l.codigo?` (${esc(l.codigo)})`:''}</option>`).join(''));
}
function syncWholesaleUserFields(){const show=$("#uRole")?.value==='MAYORISTA';$$('.wholesale-user-field').forEach(x=>x.classList.toggle('hidden',!show))}
function clearUser(){["uId","uProfileId","uProfileUrl","uName","uUsername","uPassword"].forEach(id=>$("#"+id).value="");$("#uRole").value="EDITOR";$("#uActive").value="SI";if($("#uClient"))$("#uClient").value="";if($("#uPriceList"))$("#uPriceList").value="";resetFilePicker("#uProfile");$("#uProfilePreview").src="favicon.png";fillWholesaleSelectors();syncWholesaleUserFields()}
$("#newUser").addEventListener("click",()=>{clearUser();$("#userEditor").classList.remove("hidden")});
window.editUser=id=>{const u=(data.users||[]).find(x=>x.id===id);if(!u)return;fillWholesaleSelectors();resetFilePicker("#uProfile");$("#uId").value=u.id;$("#uProfileId").value=u.profile_file_id||"";$("#uProfileUrl").value=u.profile_url||"";$("#uName").value=u.nombre||"";$("#uUsername").value=u.usuario||"";$("#uPassword").value="";$("#uRole").value=String(u.rol||"EDITOR").toUpperCase();$("#uActive").value=String(u.activo||"SI").toUpperCase();if($("#uClient"))$("#uClient").value=u.cliente_id||"";if($("#uPriceList"))$("#uPriceList").value=u.lista_precio_id||"";$("#uProfilePreview").src=u.profile_url||"favicon.png";syncWholesaleUserFields();$("#userEditor").classList.remove("hidden")};
$("#uProfile").addEventListener("change",e=>{const f=e.target.files[0];if(f)$("#uProfilePreview").src=URL.createObjectURL(f)});
$("#uRole")?.addEventListener("change",syncWholesaleUserFields);
function userSaveErrorMessage(err){const code=String(err?.message||err||"").toUpperCase();if(code.includes("USUARIO_YA_EXISTE"))return "Ese usuario ya existe";if(code.includes("EMAIL_YA_EXISTE"))return "Ese correo ya está asociado a otro usuario";if(code.includes("CLAVE_MINIMO_8_CARACTERES"))return "La contraseña debe tener al menos 8 caracteres";if(code.includes("MAYORISTA_CLIENTE_REQUERIDO"))return "Selecciona el cliente Mayorista";if(code.includes("CLIENTE_NO_ES_MAYORISTA"))return "El cliente seleccionado no está configurado como Mayorista";if(code.includes("LISTA_PRECIO_NO_DISPONIBLE"))return "La lista de precios seleccionada no está activa";if(code.includes("PERMISO_DENEGADO"))return "Tu sesión no tiene permiso para crear usuarios";if(code.includes("ACCION_NO_VALIDA"))return "El backend está desactualizado. Debes desplegar el index.ts incluido en esta versión";return `No fue posible guardar el usuario${code?` · ${code}`:""}`}
$("#saveUser").addEventListener("click",e=>busy(e.currentTarget,async()=>{try{let profileId=$("#uProfileId").value,profileUrl=$("#uProfileUrl").value;const f=$("#uProfile").files[0];if(f){const u=await upload(f,"USUARIOS");profileId=u.fileId;profileUrl=u.imageUrl||profileUrl}const payload={id:$("#uId").value,nombre:$("#uName").value.trim(),usuario:$("#uUsername").value.trim(),password:$("#uPassword").value,rol:$("#uRole").value,activo:$("#uActive").value,cliente_id:$("#uClient")?.value||"",lista_precio_id:$("#uPriceList")?.value||"",profile_file_id:profileId,profile_url:profileUrl};if(!payload.nombre||!payload.usuario){toast("Completa nombre y usuario");return}if(!payload.id&&String(payload.password||"").length<8){toast("La contraseña debe tener al menos 8 caracteres");return}if(payload.rol==='MAYORISTA'&&!payload.cliente_id){toast('Selecciona el cliente Mayorista');return}if(payload.rol==='MAYORISTA'&&!payload.lista_precio_id){payload.activo='NO'}const out=await AleAPI.post("saveUser",payload,token);toast(out?.pending_price_list?"✓ Usuario Mayorista creado · acceso pendiente hasta asignar lista de precios":"✓ Usuario guardado");$("#userEditor").classList.add("hidden");await reload()}catch(err){console.warn(err);toast(userSaveErrorMessage(err))}}));
window.deleteUser=async(id,btn)=>{if(!confirm("¿Desactivar este usuario?"))return;await busy(btn,async()=>{try{await AleAPI.post("deleteUser",{id},token);toast("Usuario desactivado");await reload()}catch(e){console.warn(e);toast("No fue posible desactivar")}})};
$("#changeMyPassword").addEventListener("click",e=>busy(e.currentTarget,async()=>{const password=$("#myNewPassword").value;if(password.length<8){toast("La contraseña debe tener al menos 8 caracteres");return}try{await AleAPI.post("changeMyPassword",{password},token);$("#myNewPassword").value="";toast("Contraseña actualizada") }catch(err){console.warn(err);toast("No fue posible cambiar la contraseña")}}));

function yesNo(v){return ["SI","SÍ","TRUE","1","YES","ON"].includes(String(v||"").trim().toUpperCase())?"SI":"NO"}
function safeHttpsAdminUrl(value){try{const u=new URL(String(value||"").trim());if(u.protocol!=="https:")throw new Error("URL_HTTPS_REQUERIDA");return u.toString()}catch(e){if(String(value||"").trim())throw new Error("URL_HTTPS_INVALIDA");return""}}
function isSupabaseHost(host){host=String(host||"").toLowerCase();return host==="supabase.co"||host.endsWith(".supabase.co")}
function clientPublicUrl(value){const url=safeHttpsAdminUrl(value);if(!url)throw new Error("URL_PUBLICA_REQUERIDA");const u=new URL(url),api=String(window.ALE_ATENCIO_CONFIG?.API_URL||"");let apiHost="";try{apiHost=new URL(api).hostname.toLowerCase()}catch(_){}const host=u.hostname.toLowerCase();if(isSupabaseHost(host)||host===apiHost||host==="script.google.com"||host.endsWith(".script.google.com")||host==="script.googleusercontent.com"||host.endsWith(".script.googleusercontent.com")||isTransbankHost(host)||/\/(?:functions|rest|storage)\/v1\//i.test(u.pathname))throw new Error("URL_CLIENTE_INTERNA_NO_PERMITIDA");return u.toString()}
function isTransbankHost(host){host=String(host||"").toLowerCase();return host==="webpay.cl"||host.endsWith(".webpay.cl")||host==="transbank.cl"||host.endsWith(".transbank.cl")}
function safeTransbankStorefrontUrl(value){const url=safeHttpsAdminUrl(value);if(!url)return"";const host=new URL(url).hostname.toLowerCase();if(isSupabaseHost(host)||isTransbankHost(host))throw new Error("TRANSBANK_DOMINIO_TIENDA_INVALIDO");return url}
function safeTransbankManualUrl(value){const url=safeHttpsAdminUrl(value);if(!url)return"";const host=new URL(url).hostname.toLowerCase();if(!isTransbankHost(host))throw new Error("TRANSBANK_LINK_MANUAL_INVALIDO");return url}
const integrationFields=[
  ["Shopify","iShopifyEnabled","iShopifyUrl","integration_shopify_enabled","integration_shopify_url"],
  ["WooCommerce","iWooEnabled","iWooUrl","integration_woocommerce_enabled","integration_woocommerce_url"],
  ["Mercado Libre","iMercadoLibreEnabled","iMercadoLibreUrl","integration_mercadolibre_enabled","integration_mercadolibre_url"],
  ["Meta","iMetaEnabled","iMetaUrl","integration_meta_enabled","integration_meta_url"],
  ["Google Merchant","iGoogleMerchantEnabled","iGoogleMerchantUrl","integration_google_merchant_enabled","integration_google_merchant_url"],
  ["TikTok Shop","iTiktokShopEnabled","iTiktokShopUrl","integration_tiktok_shop_enabled","integration_tiktok_shop_url"],
  ["WhatsApp Catalog","iWhatsappCatalogEnabled","iWhatsappCatalogUrl","integration_whatsapp_catalog_enabled","integration_whatsapp_catalog_url"],
  ["Jumpseller","iJumpsellerEnabled","iJumpsellerUrl","integration_jumpseller_enabled","integration_jumpseller_url"]
];
function renderIntegrations(){const c=data.config||{};for(const[,enabledId,urlId,enabledKey,urlKey]of integrationFields){const e=$("#"+enabledId),u=$("#"+urlId);if(e)e.checked=yesNo(c[enabledKey])==="SI";if(u)u.value=c[urlKey]||""}}
$("#saveIntegrations")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const payload={};for(const[name,enabledId,urlId,enabledKey,urlKey]of integrationFields){const enabled=$("#"+enabledId)?.checked;const raw=$("#"+urlId)?.value.trim()||"";const url=raw?safeHttpsAdminUrl(raw):"";if(enabled&&!url){toast(`✕ ${name}: agrega una URL HTTPS antes de activar`);return}payload[enabledKey]=enabled?"SI":"NO";payload[urlKey]=url}await AleAPI.post("saveConfig",payload,token);toast("✓ Integraciones guardadas");await reload()}catch(err){console.warn(err);toast(String(err?.message||"").includes("URL_HTTPS")?"✕ Revisa las URL: deben comenzar con https://":"✕ No fue posible guardar las integraciones")}}));
const TRANSBANK_DEFAULT_STOREFRONT_URL="https://aleatencioreposteria.cl/";
async function refreshTransbankHealth(showToast=false){
  const status=$("#transbankStatus"),env=$("#transbankEnvironment"),creds=$("#transbankCredentials"),callback=$("#pTransbankCallbackUrl");
  try{
    const out=await AleAPI.post("transbankhealth",{},token);
    if(env)env.textContent=out.environment==="PRODUCTION"?"Producción":"Integración / pruebas";
    if(creds){creds.textContent=out.credentials_ready?"Configuradas en servidor":"Pendientes en servidor";creds.classList.toggle("is-ok",!!out.credentials_ready);creds.classList.toggle("is-error",!out.credentials_ready)}
    if(callback)callback.value=out.callback_url||"";
    if(status){status.textContent=out.ready?"Listo para cobrar":(out.url_ready&&out.checkout_url_ready)?"Faltan credenciales":"Faltan dominios";status.classList.toggle("is-ready",!!out.ready);status.classList.toggle("is-warning",!out.ready)}
    if(showToast)toast(out.ready?"✓ Transbank está listo para crear transacciones":"Configuración incompleta: revisa dominios y Secrets del servidor");
    return out;
  }catch(err){console.warn("transbankhealth",err);if(status){status.textContent="No verificado";status.classList.remove("is-ready");status.classList.add("is-warning")}if(creds)creds.textContent="No verificado";if(callback)callback.value="";if(showToast)toast("✕ No fue posible verificar Transbank");return null}
}
const PAYMENT_SECRET_DEFAULTS=["TRANSBANK_COMMERCE_CODE","TRANSBANK_API_KEY_SECRET","TRANSBANK_ENVIRONMENT"];
let paymentSecretDrafts=[];
let paymentSecretsSaved=[];
function paymentSecretEsc(v){return esc(String(v||""))}
function paymentSecretDraft(name=""){return{id:`sec-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name:String(name||"").toUpperCase(),value:"",visible:false}}
function ensurePaymentSecretDrafts(){
  if(paymentSecretDrafts.length)return;
  const saved=new Set(paymentSecretsSaved.map(x=>String(x.name||"").toUpperCase()));
  const pending=PAYMENT_SECRET_DEFAULTS.filter(x=>!saved.has(x));
  (pending.length?pending:[""]).forEach(n=>paymentSecretDrafts.push(paymentSecretDraft(n)));
}
function renderPaymentSecretRows(){
  const host=$("#paymentSecretRows");if(!host)return;ensurePaymentSecretDrafts();
  host.innerHTML=paymentSecretDrafts.map((r,i)=>`<div class="payment-secret-row" data-secret-row="${paymentSecretEsc(r.id)}">
    <input class="secret-name-input" data-secret-name="${paymentSecretEsc(r.id)}" value="${paymentSecretEsc(r.name)}" placeholder="Ej: TRANSBANK_API_KEY_SECRET" autocomplete="off" spellcheck="false">
    <div class="secret-value-wrap"><input class="secret-value-input" data-secret-value="${paymentSecretEsc(r.id)}" type="${r.visible?"text":"password"}" value="${paymentSecretEsc(r.value)}" placeholder="Escribe el valor del Secret" autocomplete="new-password" spellcheck="false"><button type="button" class="secret-eye" data-secret-eye="${paymentSecretEsc(r.id)}" aria-label="${r.visible?"Ocultar":"Mostrar"} valor"><i class="bi ${r.visible?"bi-eye-slash":"bi-eye"}"></i></button></div>
    <button type="button" class="secret-row-remove" data-secret-remove="${paymentSecretEsc(r.id)}" aria-label="Quitar fila"><i class="bi bi-trash3"></i></button>
  </div>`).join("");
}
function renderPaymentSecretsExisting(){
  const host=$("#paymentSecretsExisting");if(!host)return;
  if(!paymentSecretsSaved.length){host.innerHTML='<span class="secret-empty">No hay Secrets de pasarela detectados.</span>';return}
  host.innerHTML=paymentSecretsSaved.map(s=>`<div class="stored-secret-item"><div><strong>${paymentSecretEsc(s.name)}</strong><span>••••••••••</span>${s.updated_at?`<small>Actualizado: ${paymentSecretEsc(formatDate(s.updated_at))}</small>`:""}</div><div class="stored-secret-actions"><button type="button" class="btn btn-light secret-replace-btn" data-secret-replace="${paymentSecretEsc(s.name)}"><i class="bi bi-pencil-square"></i> Reemplazar</button><button type="button" class="secret-delete-btn" data-secret-delete="${paymentSecretEsc(s.name)}" title="Eliminar Secret"><i class="bi bi-trash3"></i></button></div></div>`).join("");
}
async function loadPaymentSecrets(showToast=false){
  const panel=$("#paymentSecretsPanel"),status=$("#paymentSecretsManagerStatus"),bootstrap=$("#paymentSecretsBootstrap"),save=$("#savePaymentSecrets"),add=$("#addPaymentSecret");if(!panel)return;
  const isAdmin=String(data.currentUser?.rol||"").toUpperCase()==="ADMIN";
  if(!isAdmin){if(status){status.textContent="Solo Administrador";status.className="secret-manager-status is-warning"}if(bootstrap)bootstrap.classList.add("hidden");if(save)save.disabled=true;if(add)add.disabled=true;paymentSecretsSaved=[];paymentSecretDrafts=[];renderPaymentSecretRows();renderPaymentSecretsExisting();return}
  try{
    if(status){status.textContent="Consultando servidor…";status.className="secret-manager-status"}
    const out=await AleAPI.post("paymentsecretslist",{},token);paymentSecretsSaved=Array.isArray(out.secrets)?out.secrets:[];
    if(bootstrap)bootstrap.classList.toggle("hidden",!!out.bootstrap_ready);
    if(status){status.textContent=out.bootstrap_ready?"Conectado":"Activación inicial requerida";status.className=`secret-manager-status ${out.bootstrap_ready?"is-ready":"is-warning"}`}
    if(save)save.disabled=!out.bootstrap_ready;if(add)add.disabled=!out.bootstrap_ready;
    paymentSecretDrafts=[];renderPaymentSecretRows();renderPaymentSecretsExisting();if(showToast)toast(out.bootstrap_ready?"✓ Secrets del servidor actualizados":"Falta la activación inicial del gestor de Secrets");
  }catch(err){console.warn("paymentsecretslist",err);if(status){status.textContent="No disponible";status.className="secret-manager-status is-warning"}if(save)save.disabled=true;if(add)add.disabled=true;if(showToast)toast("✕ No fue posible consultar los Secrets del servidor")}
}
function addPaymentSecretDraft(name=""){const key=String(name||"").toUpperCase();if(key){const existing=paymentSecretDrafts.find(x=>String(x.name).toUpperCase()===key);if(existing){document.querySelector(`[data-secret-value="${CSS.escape(existing.id)}"]`)?.focus();return}paymentSecretDrafts.unshift(paymentSecretDraft(key))}else paymentSecretDrafts.push(paymentSecretDraft(""));renderPaymentSecretRows();const id=paymentSecretDrafts.find(x=>!x.name)?.id||paymentSecretDrafts[0]?.id;if(id)document.querySelector(`[data-secret-name="${CSS.escape(id)}"]`)?.focus()}
$("#paymentSecretRows")?.addEventListener("input",e=>{const n=e.target.closest("[data-secret-name]"),v=e.target.closest("[data-secret-value]");const id=n?.dataset.secretName||v?.dataset.secretValue;if(!id)return;const row=paymentSecretDrafts.find(x=>x.id===id);if(!row)return;if(n)row.name=String(n.value||"").toUpperCase().replace(/[^A-Z0-9_]/g,"");if(v)row.value=v.value});
$("#paymentSecretRows")?.addEventListener("click",e=>{const eye=e.target.closest("[data-secret-eye]"),rm=e.target.closest("[data-secret-remove]");if(eye){const row=paymentSecretDrafts.find(x=>x.id===eye.dataset.secretEye);if(row){row.visible=!row.visible;renderPaymentSecretRows()}return}if(rm){paymentSecretDrafts=paymentSecretDrafts.filter(x=>x.id!==rm.dataset.secretRemove);renderPaymentSecretRows()}});
$("#addPaymentSecret")?.addEventListener("click",()=>addPaymentSecretDraft(""));
$("#refreshPaymentSecrets")?.addEventListener("click",()=>loadPaymentSecrets(true));
$("#paymentSecretsExisting")?.addEventListener("click",async e=>{const rep=e.target.closest("[data-secret-replace]"),del=e.target.closest("[data-secret-delete]");if(rep){addPaymentSecretDraft(rep.dataset.secretReplace);return}if(del){const name=String(del.dataset.secretDelete||"");if(!name||!confirm(`¿Eliminar el Secret ${name} del servidor?\n\nLa pasarela puede dejar de funcionar hasta que vuelvas a configurarlo.`))return;try{await busy(del,()=>AleAPI.post("paymentsecretsdelete",{names:[name]},token));toast(`✓ Secret ${name} eliminado`);await loadPaymentSecrets(false);await refreshTransbankHealth(false)}catch(err){console.warn(err);toast("✕ No fue posible eliminar el Secret")}}});
$("#savePaymentSecrets")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const secrets=paymentSecretDrafts.map(r=>({name:String(r.name||"").trim().toUpperCase(),value:String(r.value||"")})).filter(x=>x.name||x.value);if(!secrets.length){toast("Agrega al menos un Secret para guardar");return}if(secrets.some(x=>!x.name||!x.value.trim())){toast("✕ Completa el nombre y el valor de cada Secret");return}await AleAPI.post("paymentsecretsset",{secrets},token);paymentSecretDrafts=[];toast("✓ Secrets guardados en el servidor. Los valores se limpiaron del navegador.");await loadPaymentSecrets(false);await refreshTransbankHealth(false)}catch(err){console.warn(err);const code=String(err?.message||err||"");if(code.includes("BOOTSTRAP"))toast("✕ Falta ALE_MANAGEMENT_TOKEN para activar el gestor");else if(code.includes("RESERVADO")||code.includes("SOLO_PASARELAS"))toast("✕ Ese nombre está reservado o no corresponde a una pasarela de pago");else toast("✕ No fue posible guardar los Secrets")}}));

function renderPayments(){const c=data.config||{},checkout=c.transbank_checkout_url||TRANSBANK_DEFAULT_STOREFRONT_URL;let returnUrl=c.transbank_return_url||checkout||TRANSBANK_DEFAULT_STOREFRONT_URL,manualUrl=c.transbank_payment_url||"";try{const legacyHost=returnUrl?new URL(returnUrl).hostname.toLowerCase():"";if(isTransbankHost(legacyHost)){if(!manualUrl)manualUrl=returnUrl;returnUrl=checkout||TRANSBANK_DEFAULT_STOREFRONT_URL}}catch(_){}if($("#pTransbankCheckoutUrl"))$("#pTransbankCheckoutUrl").value=checkout;if($("#pTransbankReturnUrl"))$("#pTransbankReturnUrl").value=returnUrl;if($("#pTransbankManualUrl"))$("#pTransbankManualUrl").value=manualUrl;refreshTransbankHealth(false);loadPaymentSecrets(false)}
$("#savePayments")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const checkoutRaw=$("#pTransbankCheckoutUrl")?.value.trim()||"",returnRaw=$("#pTransbankReturnUrl")?.value.trim()||"",manualRaw=$("#pTransbankManualUrl")?.value.trim()||"";const checkout=checkoutRaw?safeTransbankStorefrontUrl(checkoutRaw):"",returnUrl=returnRaw?safeTransbankStorefrontUrl(returnRaw):"",manualUrl=manualRaw?safeTransbankManualUrl(manualRaw):"";if(!checkout||!returnUrl){toast("✕ Debes indicar el dominio de tienda y el dominio de regreso");return}await AleAPI.post("saveConfig",{transbank_enabled:"SI",transbank_checkout_url:checkout,transbank_return_url:returnUrl,transbank_payment_url:manualUrl,transbank_button_label:"Pagar con Transbank"},token);toast("✓ Webpay Plus y Link Webpay manual guardados por separado. Verificando…");await reload();await refreshTransbankHealth(false)}catch(err){console.warn(err);const code=String(err?.message||"");if(code.includes("TRANSBANK_LINK_MANUAL_INVALIDO"))toast("✕ El Link Webpay manual debe pertenecer a webpay.cl o transbank.cl");else if(code.includes("TRANSBANK_DOMINIO_TIENDA_INVALIDO"))toast("✕ El dominio de tienda/regreso debe ser tu web, no Supabase ni Webpay");else toast(code.includes("TRANSBANK_URL")||code.includes("URL_HTTPS")?"✕ Revisa las URL HTTPS":"✕ No fue posible guardar Transbank")}}));
$("#testTransbankLink")?.addEventListener("click",()=>refreshTransbankHealth(true));
$("#openTransbankManualLink")?.addEventListener("click",()=>{try{const raw=$("#pTransbankManualUrl")?.value.trim()||"";if(!raw)return toast("Agrega primero el Link Webpay manual entregado por Transbank");const url=safeTransbankManualUrl(raw);window.open(url,"_blank","noopener,noreferrer")}catch(err){console.warn(err);toast("✕ El Link Webpay manual no es válido")}});

function syncStockVisibilitySetting(){const input=$("#sShowStockClients"),value=$("#sShowStockClientsValue"),hint=$("#sShowStockClientsHint");if(!input)return;const on=!!input.checked;if(value){value.textContent=on?"TRUE":"FALSE";value.classList.toggle("is-true",on);value.classList.toggle("is-false",!on)}if(hint)hint.textContent=on?"TRUE: la Web muestra el stock general disponible de cada producto.":"FALSE: el stock queda oculto en la Web; el cliente ve producto, tamaño y precio."}
function syncAllowNoStockSalesSetting(){const input=$("#sAllowNoStockSales"),value=$("#sAllowNoStockSalesValue"),hint=$("#sAllowNoStockSalesHint");if(!input)return;const on=!!input.checked;if(value){value.textContent=on?"TRUE":"FALSE";value.classList.toggle("is-true",on);value.classList.toggle("is-false",!on)}if(hint)hint.textContent=on?"TRUE: Web y Mayorista podrán comprar aunque el stock sea 0 o negativo. No se mostrará ningún aviso de stock insuficiente al cliente.":"FALSE: Web y Mayorista respetarán el stock disponible y bloquearán cantidades superiores a la existencia."}
function renderSettings(){const c=data.config||{};resetFilePicker("#sLogo");$("#sLogoId").value=c.logo_drive_file_id||"";$("#sBusiness").value=c.empresa||"";if($("#sBusinessRut"))$("#sBusinessRut").value=c.empresa_rut?formatRutChile(c.empresa_rut):"";if($("#sPublicWebUrl"))$("#sPublicWebUrl").value=c.web_public_url||c.transbank_checkout_url||window.ALE_ATENCIO_CONFIG?.PUBLIC_BASE_URL||"";if($("#sDocumentsPublicUrl"))$("#sDocumentsPublicUrl").value=c.documentos_public_url||new URL("documentos.html",c.web_public_url||window.ALE_ATENCIO_CONFIG?.PUBLIC_BASE_URL||location.origin+"/").toString();if($("#sEventsUrl"))$("#sEventsUrl").value=c.eventos_url||"https://franciscoferraris.cl/";$("#sWhatsapp").value=c.whatsapp||"";$("#sEmail").value=c.email||"";$("#sAddress").value=c.direccion||"";$("#sInstagram").value=c.instagram||"";$("#sFacebook").value=c.facebook||"";$("#sTiktok").value=c.tiktok||"";$("#sDelivery").value=c.valor_despacho||0;$("#sIva").value=c.iva_porcentaje||19;$("#sQuoteValidity").value=c.cotizacion_validez_dias||15;if($("#sDocumentFormat"))$("#sDocumentFormat").value=["A4","TICKET_80","TICKET_100"].includes(String(c.document_format||"").toUpperCase())?String(c.document_format).toUpperCase():"A4";if($("#sShowStockClients"))$("#sShowStockClients").checked=yesNo(c.mostrar_stock_clientes)==="SI";syncStockVisibilitySetting();if($("#sAllowNoStockSales"))$("#sAllowNoStockSales").checked=yesNo(c.permitir_venta_sin_stock)==="SI";syncAllowNoStockSalesSetting()}
if($("#sShowStockClients"))$("#sShowStockClients").addEventListener("change",()=>{syncStockVisibilitySetting();if($("#productShowStockClients")){$("#productShowStockClients").checked=$("#sShowStockClients").checked;const v=$("#productShowStockClientsValue");if(v){v.textContent=$("#productShowStockClients").checked?"TRUE":"FALSE";v.classList.toggle("is-true",$("#productShowStockClients").checked);v.classList.toggle("is-false",!$("#productShowStockClients").checked)}}});
if($("#sAllowNoStockSales"))$("#sAllowNoStockSales").addEventListener("change",async e=>{
  const input=e.currentTarget,on=!!input.checked;syncAllowNoStockSalesSetting();input.disabled=true;
  try{
    const out=await AleAPI.post("setglobalstockpolicy",{enabled:on},token);
    const persisted=!!out?.enabled;input.checked=persisted;data.config={...(data.config||{}),permitir_venta_sin_stock:persisted?"SI":"NO"};syncAllowNoStockSalesSetting();
    toast(persisted?"✓ Venta sin stock activada para Web y Mayorista":"✓ Venta sin stock desactivada");
  }catch(err){console.warn("SET_STOCK_POLICY",err);input.checked=!on;syncAllowNoStockSalesSetting();toast("✕ No fue posible guardar el switch de stock");}
  finally{input.disabled=false;}
});
$("#saveSettings").addEventListener("click",e=>busy(e.currentTarget,async()=>{try{let logoId=$("#sLogoId").value,logoUrl=data.config?.logo_url||"";const f=$("#sLogo").files[0];if(f){const up=await upload(f,"LOGO");logoId=up.fileId;logoUrl=up.imageUrl||logoUrl}const empresaRut=$("#sBusinessRut")?.value.trim()?requireRutChile($("#sBusinessRut").value):"";const publicWebUrl=clientPublicUrl($("#sPublicWebUrl")?.value.trim()||window.ALE_ATENCIO_CONFIG?.PUBLIC_BASE_URL||"");const documentsPublicUrl=$("#sDocumentsPublicUrl")?.value.trim()||new URL("documentos.html",publicWebUrl||window.ALE_ATENCIO_CONFIG?.PUBLIC_BASE_URL||location.origin+"/").toString();await AleAPI.post("saveConfig",{empresa:$("#sBusiness").value.trim(),empresa_rut:empresaRut,web_public_url:publicWebUrl,documentos_public_url:documentsPublicUrl,eventos_url:$("#sEventsUrl")?.value.trim()||"https://franciscoferraris.cl/",whatsapp:$("#sWhatsapp").value.trim(),email:$("#sEmail").value.trim(),direccion:$("#sAddress").value.trim(),instagram:$("#sInstagram").value.trim(),facebook:$("#sFacebook").value.trim(),tiktok:$("#sTiktok").value.trim(),valor_despacho:parseClpAmount($("#sDelivery").value),iva_porcentaje:$("#sIva").value,cotizacion_validez_dias:$("#sQuoteValidity").value,document_format:$("#sDocumentFormat")?.value||"A4",mostrar_stock_clientes:$("#sShowStockClients")?.checked?"SI":"NO",logo_drive_file_id:logoId,logo_url:logoUrl},token);toast("Configuración guardada");await reload()}catch(err){console.warn(err);toast("No fue posible guardar")}}));

async function upload(file,kind){if(file.size>6*1024*1024)throw new Error("IMAGEN_MUY_GRANDE");const dataUrl=await AleAPI.fileToDataUrl(file);return AleAPI.post("uploadImage",{kind,fileName:file.name,dataUrl},token)}
window.removeEntity=async(kind,id,btn)=>{const label=kind==="product"?"producto":"registro";const extra=kind==="product"?"\n\nEl producto se eliminará definitivamente. Si su imagen fue subida a Supabase Storage, también se limpiará. Las imágenes locales de GitHub no se modifican.":"";if(!confirm(`¿Eliminar definitivamente este ${label}?${extra}`))return;await busy(btn,async()=>{try{const out=await AleAPI.post("deleteEntity",{kind,id},token);if(!out?.deleted)throw new Error("REGISTRO_NO_ELIMINADO");selectedSet(kind==="product"?"products":kind+"s").delete(String(id));toast("Registro eliminado");await reload()}catch(e){console.warn(e);toast("No fue posible eliminar")}})};
$$('[data-cancel]').forEach(b=>b.addEventListener("click",()=>{if(b.dataset.cancel==="productEditor")closeProductEditor();else if(b.dataset.cancel==="quoteEditor")closeQuoteEditor();else $("#"+b.dataset.cancel)?.classList.add("hidden")}));
// ========================= COTIZACIONES R9.5 =========================
let quoteDraftItems=[];

function fillQuoteProductPicker(){
  const picker=$("#quoteProductPicker"); if(!picker)return;
  const current=picker.value;
  picker.innerHTML='<option value="">Seleccionar producto del catálogo...</option>'+data.products
    .slice().sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||""),"es"))
    .map(p=>`<option value="${esc(p.id)}">${esc(p.nombre)} · ${money(p.precio)}</option>`).join("");
  if([...picker.options].some(o=>o.value===current))picker.value=current;
}
function newQuoteItem(item={}){
  return {
    key:(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())),
    descripcion:String(item.descripcion||item.nombre||""),
    cantidad:Math.max(0,Number(item.cantidad||1)||1),
    precio_unitario:parseClpAmount(item.precio_unitario??item.precio??0)
  };
}
function quoteAmounts(){
  const subtotal=quoteDraftItems.reduce((sum,x)=>sum+(Number(x.cantidad||0)*Number(x.precio_unitario||0)),0);
  const pct=Math.max(0,Math.min(100,toNumber($("#qIva")?.value||19)));
  const iva=Math.round(subtotal*pct/100);
  const total=subtotal+iva;
  return {subtotal,iva,pct,total};
}
function updateQuoteTotals(){
  const a=quoteAmounts();
  if($("#qSubtotal"))$("#qSubtotal").textContent=money(a.subtotal);
  if($("#qIvaLabel"))$("#qIvaLabel").textContent=`IVA ${a.pct}%`;
  if($("#qIvaAmount"))$("#qIvaAmount").textContent=money(a.iva);
  if($("#qTotal"))$("#qTotal").textContent=money(a.total);
}
function renderQuoteItems(){
  const host=$("#quoteItems"); if(!host)return;
  if(!quoteDraftItems.length)quoteDraftItems=[newQuoteItem()];
  host.innerHTML=quoteDraftItems.map((x,i)=>`<div class="quote-item-row" data-quote-key="${esc(x.key)}">
    <input class="quote-desc" data-q-index="${i}" data-q-field="descripcion" value="${esc(x.descripcion)}" placeholder="Descripción">
    <input class="quote-qty" data-q-index="${i}" data-q-field="cantidad" type="number" min="0.01" step="0.01" value="${Number(x.cantidad||1)}">
    <div class="quote-price-shell"><span>CLP $</span><input class="quote-price" data-q-index="${i}" data-q-field="precio_unitario" type="text" inputmode="numeric" autocomplete="off" value="${new Intl.NumberFormat("es-CL",{maximumFractionDigits:0}).format(Number(x.precio_unitario||0))}"><button type="button" class="clp-voice-btn quote-voice-btn" data-q-voice="${i}" title="Dictar precio" aria-label="Dictar precio"><i class="bi bi-mic-fill"></i></button></div>
    <strong class="quote-line-total">${money(Number(x.cantidad||0)*Number(x.precio_unitario||0))}</strong>
    <button type="button" class="quote-remove" data-q-remove="${i}" aria-label="Quitar línea"><i class="bi bi-trash3"></i></button>
  </div>`).join("");
  updateQuoteTotals();
}
$("#quoteItems")?.addEventListener("input",e=>{
  const el=e.target.closest("[data-q-index]"); if(!el)return;
  const i=Number(el.dataset.qIndex), field=el.dataset.qField; if(!quoteDraftItems[i])return;
  quoteDraftItems[i][field]=field==="descripcion"?el.value:field==="precio_unitario"?parseClpAmount(el.value):toNumber(el.value);
  const row=el.closest(".quote-item-row");
  const item=quoteDraftItems[i];
  row?.querySelector(".quote-line-total")?.replaceChildren(document.createTextNode(money(Number(item.cantidad||0)*Number(item.precio_unitario||0))));
  updateQuoteTotals();
});
$("#quoteItems")?.addEventListener("click",e=>{
  const voice=e.target.closest("[data-q-voice]");if(voice){const input=voice.closest(".quote-price-shell")?.querySelector(".quote-price");if(input)listenClpAmount(input,voice);return}
  const b=e.target.closest("[data-q-remove]"); if(!b)return;
  quoteDraftItems.splice(Number(b.dataset.qRemove),1);renderQuoteItems();
});
$("#quoteItems")?.addEventListener("focusout",e=>{const input=e.target.closest(".quote-price");if(input)normalizeClpInput(input)});
$("#qIva")?.addEventListener("input",updateQuoteTotals);

// R9.8 · Combo filtrable para asociar una solicitud a la cotización.
let quoteRequestHighlight=-1;
function requestLabel(r){return `${r.numero_solicitud||r.id||"Solicitud"} · ${r.nombre||"Cliente"}${r.rut?` · ${formatRutChile(r.rut)}`:""}${r.telefono?` · ${r.telefono}`:""}`}
function requestConsumedQuoteId(r){return String(r?.cotizacion_id||"").trim()}
function requestConsumedForOtherQuote(r){
  const used=requestConsumedQuoteId(r),current=String($("#qId")?.value||"").trim();
  return !!used&&used!==current;
}
function setQuoteRequestLocked(locked=false){
  const search=$("#qRequestSearch"),toggle=$("#toggleQuoteRequest"),clear=$("#clearQuoteRequest");
  if(search){search.readOnly=!!locked;search.setAttribute("aria-disabled",String(!!locked))}
  if(toggle)toggle.disabled=!!locked;
  if(clear)clear.disabled=!!locked;
}
function quoteRequestCandidates(term=""){
  const raw=String(term??"").trim();
  return (data.requests||[]).slice().sort((a,b)=>new Date(b.fecha||0)-new Date(a.fecha||0)).filter(r=>{
    if(requestConsumedForOtherQuote(r))return false;
    return flexibleSearchMatch([r.numero_solicitud,r.id,r.nombre,r.rut,r.telefono,r.email,r.tipo,r.detalle],raw);
  }).slice(0,18);
}
function setQuoteRequestResultsOpen(open){
  const results=$("#qRequestResults"), input=$("#qRequestSearch");if(!results||!input)return;
  results.classList.toggle("hidden",!open);input.setAttribute("aria-expanded",String(open));
  $("#toggleQuoteRequest")?.querySelector("i")?.classList.toggle("bi-chevron-up",open);
  $("#toggleQuoteRequest")?.querySelector("i")?.classList.toggle("bi-chevron-down",!open);
  if(!open)quoteRequestHighlight=-1;
}
function renderQuoteRequestResults(term=""){
  const host=$("#qRequestResults");if(!host)return;
  const rows=quoteRequestCandidates(term);
  if(!rows.length){host.innerHTML='<div class="request-option-empty">No se encontraron solicitudes con ese criterio.</div>';setQuoteRequestResultsOpen(true);return}
  if(quoteRequestHighlight>=rows.length)quoteRequestHighlight=rows.length-1;
  host.innerHTML=rows.map((r,i)=>`<button type="button" class="request-option ${i===quoteRequestHighlight?"is-active":""}" role="option" aria-selected="${i===quoteRequestHighlight}" data-request-id="${esc(r.id)}"><strong>${esc(r.numero_solicitud||r.id||"")}</strong><span class="request-option-main"><b>${esc(r.nombre||"Cliente")}</b><small>${esc([r.rut?formatRutChile(r.rut):"",r.telefono,r.email].filter(Boolean).join(" · ")||r.tipo||"")}</small></span><span class="request-option-state">${esc(r.estado||"NUEVA")}</span></button>`).join("");
  setQuoteRequestResultsOpen(true);
  host.querySelector('.request-option.is-active')?.scrollIntoView({block:'nearest'});
}
function linkRequestToQuote(r,{replaceLine=true}={}){
  if(!r)return;
  if(requestConsumedForOtherQuote(r)){toast(`✕ La solicitud ${r.numero_solicitud||r.id} ya fue utilizada en ${r.cotizacion_numero||"otra cotización"}.`);return}
  $("#qRequestId").value=r.id||"";
  $("#qRequestNumber").textContent=r.numero_solicitud||r.id||"";
  $("#qRequestSearch").value=requestLabel(r);
  $("#qRequestSearch").dataset.selectedRequestId=String(r.id||"");
  $("#qClient").value=r.nombre||"";
  if($("#qRut"))$("#qRut").value=r.rut?formatRutChile(r.rut):"";
  $("#qPhone").value=r.telefono||"";
  $("#qPhone").readOnly=!!r.telefono;
  $("#qPhone").classList.toggle("linked-phone",!!r.telefono);
  $("#qPhone").title=r.telefono?"WhatsApp ligado automáticamente a la solicitud":"";
  $("#qEmail").value=r.email||"";
  const help=$("#qRequestHelp");if(help){help.textContent=`Asociada a ${r.numero_solicitud||r.id}. El WhatsApp se toma de esta solicitud.`;help.classList.add("is-linked")}
  if(replaceLine){
    const qtyRaw=String(r.cantidad||"").replace(",",".").match(/[0-9]+(?:\.[0-9]+)?/),qty=qtyRaw?Number(qtyRaw[0]):1;
    const desc=[r.tipo,r.detalle].filter(Boolean).join(" · ");
    quoteDraftItems=[newQuoteItem({descripcion:desc||"Servicio / producto solicitado",cantidad:qty||1,precio_unitario:0})];renderQuoteItems();
  }
  setQuoteRequestResultsOpen(false);
}
function unlinkRequestFromQuote(){
  $("#qRequestId").value="";$("#qRequestNumber").textContent="Sin solicitud asociada";$("#qRequestSearch").value="";delete $("#qRequestSearch").dataset.selectedRequestId;
  if($("#qRut")){$("#qRut").readOnly=false;$("#qRut").classList.remove("linked-phone")}
  $("#qPhone").readOnly=false;$("#qPhone").classList.remove("linked-phone");$("#qPhone").title="";
  const help=$("#qRequestHelp");if(help){help.textContent="Busca por número, cliente, RUT, teléfono o correo. Puedes dejar la cotización sin solicitud asociada.";help.classList.remove("is-linked")}
  setQuoteRequestResultsOpen(false);
}
$("#qRequestSearch")?.addEventListener("focus",e=>{quoteRequestHighlight=-1;renderQuoteRequestResults(e.currentTarget.value.includes(" · ")?"":e.currentTarget.value)});
$("#qRequestSearch")?.addEventListener("input",e=>{
  const selectedId=e.currentTarget.dataset.selectedRequestId||"";
  if(selectedId){
    const selected=(data.requests||[]).find(r=>String(r.id)===String(selectedId));
    if(!selected||e.currentTarget.value!==requestLabel(selected)){
      delete e.currentTarget.dataset.selectedRequestId;$("#qRequestId").value="";$("#qRequestNumber").textContent="Sin solicitud asociada";
      $("#qPhone").readOnly=false;$("#qPhone").classList.remove("linked-phone");$("#qPhone").title="";
      const help=$("#qRequestHelp");if(help){help.textContent="Selecciona una solicitud de la lista para asociarla.";help.classList.remove("is-linked")}
    }
  }
  quoteRequestHighlight=-1;renderQuoteRequestResults(e.currentTarget.value)
});
$("#qRequestSearch")?.addEventListener("keydown",e=>{
  const host=$("#qRequestResults"),rows=quoteRequestCandidates(e.currentTarget.value.includes(" · ")?"":e.currentTarget.value);
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){
    e.preventDefault();if(host?.classList.contains("hidden"))renderQuoteRequestResults(e.currentTarget.value);
    quoteRequestHighlight=e.key==="ArrowDown"?Math.min(rows.length-1,quoteRequestHighlight+1):Math.max(0,quoteRequestHighlight<0?rows.length-1:quoteRequestHighlight-1);renderQuoteRequestResults(e.currentTarget.value);
  }else if(e.key==="Enter"&&quoteRequestHighlight>=0&&rows[quoteRequestHighlight]){e.preventDefault();linkRequestToQuote(rows[quoteRequestHighlight])}
  else if(e.key==="Escape"){setQuoteRequestResultsOpen(false)}
});
$("#qRequestResults")?.addEventListener("click",e=>{const b=e.target.closest("[data-request-id]");if(!b)return;const r=(data.requests||[]).find(x=>String(x.id)===String(b.dataset.requestId));if(r)linkRequestToQuote(r)});
$("#toggleQuoteRequest")?.addEventListener("click",()=>{const host=$("#qRequestResults");if(host?.classList.contains("hidden"))renderQuoteRequestResults("");else setQuoteRequestResultsOpen(false)});
$("#clearQuoteRequest")?.addEventListener("click",unlinkRequestFromQuote);
document.addEventListener("click",e=>{if(!e.target.closest("#requestCombobox"))setQuoteRequestResultsOpen(false)});

function resetQuoteEditor(){
  ["qId","qRequestId","qPdfUrl","qClient","qRut","qPhone","qEmail","qObservations"].forEach(id=>{const el=$("#"+id);if(el)el.value=""});
  setQuoteRequestLocked(false);
  if($("#qPhone")){ $("#qPhone").readOnly=false; $("#qPhone").classList.remove("linked-phone"); $("#qPhone").title=""; }
  $("#qNumber").textContent="Se asignará al guardar";
  $("#qRequestNumber").textContent="Sin solicitud asociada";
  if($("#qRequestSearch")){ $("#qRequestSearch").value=""; delete $("#qRequestSearch").dataset.selectedRequestId; }
  if($("#qRequestHelp")){$("#qRequestHelp").textContent="Busca por número, cliente, RUT, teléfono o correo. Puedes dejar la cotización sin solicitud asociada.";$("#qRequestHelp").classList.remove("is-linked")}
  setQuoteRequestResultsOpen(false);
  $("#qValidity").value=Number(data.config?.cotizacion_validez_dias||15)||15;
  $("#qIva").value=Number(data.config?.iva_porcentaje||19);
  $("#qStatus").value="BORRADOR";
  if($("#saveQuote")){ $("#saveQuote").disabled=false; $("#saveQuote").title="Guardar cotización"; }
  setClientLookupState("#qClientLookupState","Ingresa un RUT válido para buscar en Clientes.");
  quoteDraftItems=[newQuoteItem()];
  renderQuoteItems();
}
function openQuoteEditor(quote=null,request=null){
  resetQuoteEditor();
  if(quote){
    $("#qId").value=quote.id||"";
    $("#qRequestId").value=quote.solicitud_id||"";
    $("#qPdfUrl").value=quote.pdf_url||"";
    $("#qNumber").textContent=quote.numero_cotizacion||quote.id||"";
    $("#qRequestNumber").textContent=quote.numero_solicitud||"Sin solicitud asociada";
    const linkedRequest=(data.requests||[]).find(r=>String(r.id)===String(quote.solicitud_id||""));
    if($("#qRequestSearch")){ $("#qRequestSearch").value=linkedRequest?requestLabel(linkedRequest):(quote.numero_solicitud||""); if(linkedRequest)$("#qRequestSearch").dataset.selectedRequestId=String(linkedRequest.id||""); }
    if(linkedRequest&&$("#qRequestHelp")){ $("#qRequestHelp").textContent=`Asociada a ${linkedRequest.numero_solicitud||linkedRequest.id}. Esta solicitud ya está consumida por esta cotización y no puede reasignarse.`; $("#qRequestHelp").classList.add("is-linked") }
    if(quote.solicitud_id)setQuoteRequestLocked(true);
    $("#qClient").value=quote.cliente_nombre||"";
    if($("#qRut"))$("#qRut").value=quote.rut?formatRutChile(quote.rut):"";
    $("#qPhone").value=quote.telefono||"";
    $("#qPhone").readOnly=!!linkedRequest?.telefono;$("#qPhone").classList.toggle("linked-phone",!!linkedRequest?.telefono);$("#qPhone").title=linkedRequest?.telefono?"WhatsApp ligado automáticamente a la solicitud":"";
    $("#qEmail").value=quote.email||"";
    $("#qValidity").value=quote.validez_dias||15;
    $("#qIva").value=quote.iva_porcentaje??19;
    $("#qStatus").value=quoteIsConsumed(quote)?"UTILIZADA":(quote.estado||"BORRADOR");
    if($("#saveQuote")&&quoteIsConsumed(quote)){ $("#saveQuote").disabled=true; $("#saveQuote").title="Cotización utilizada: los datos comerciales están bloqueados. Corrige los datos personales desde Clientes."; }
    $("#qObservations").value=quote.observaciones||"";
    quoteDraftItems=(Array.isArray(quote.items)?quote.items:[]).map(newQuoteItem);
  }else if(request){
    linkRequestToQuote(request,{replaceLine:true});
  }
  renderQuoteItems();
  $("#quoteEditor").classList.remove("hidden");
  document.body.classList.add("quote-editor-open");
  requestAnimationFrame(()=>{const target=(!quote&&!request)?$("#qRequestSearch"):$("#qClient");target?.focus({preventScroll:true})});
}
function closeQuoteEditor(){$("#quoteEditor")?.classList.add("hidden");document.body.classList.remove("quote-editor-open")}
window.quoteFromRequest=id=>{const r=data.requests.find(x=>String(x.id)===String(id));if(!r)return toast("Solicitud no encontrada");if(requestConsumedQuoteId(r))return toast(`✕ Esta solicitud ya fue utilizada en ${r.cotizacion_numero||"una cotización"}.`);openAdminView("quotes");openQuoteEditor(null,r)};
window.editQuote=id=>{const q=data.quotes.find(x=>String(x.id)===String(id));if(!q)return toast("Cotización no encontrada");openQuoteEditor(q,null)};

function quotePayload(){
  return {
    id:$("#qId").value,
    solicitud_id:$("#qRequestId").value,
    numero_solicitud:$("#qRequestNumber").textContent.includes("Sin solicitud")?"":$("#qRequestNumber").textContent.trim(),
    cliente_nombre:$("#qClient").value.trim(),
    rut:requireRutChile($("#qRut").value),
    telefono:$("#qPhone").value.trim(),
    email:$("#qEmail").value.trim(),
    validez_dias:toNumber($("#qValidity").value)||15,
    iva_porcentaje:toNumber($("#qIva").value),
    estado:$("#qStatus").value,
    observaciones:$("#qObservations").value.trim(),
    items:quoteDraftItems.map(x=>({descripcion:String(x.descripcion||"").trim(),cantidad:Number(x.cantidad||0),precio_unitario:Number(x.precio_unitario||0)}))
      .filter(x=>x.descripcion&&x.cantidad>0)
  };
}
async function persistQuote(){
  const payload=quotePayload();
  if(!payload.cliente_nombre)throw new Error("CLIENTE_REQUERIDO");
  if(!payload.items.length)throw new Error("COTIZACION_SIN_ITEMS");
  const out=await AleAPI.post("savequote",payload,token);
  const q=out.quote;
  if(!q)throw new Error("COTIZACION_NO_CONFIRMADA");
  const ix=data.quotes.findIndex(x=>String(x.id)===String(q.id));
  if(ix>=0)data.quotes[ix]=q;else data.quotes.unshift(q);
  $("#qId").value=q.id||"";$("#qPdfUrl").value=q.pdf_url||"";
  $("#qNumber").textContent=q.numero_cotizacion||q.id||"";
  if(q.numero_solicitud)$("#qRequestNumber").textContent=q.numero_solicitud;
  if(q.solicitud_id){
    const r=(data.requests||[]).find(x=>String(x.id)===String(q.solicitud_id));
    if(r){r.cotizacion_id=q.id;r.cotizacion_numero=q.numero_cotizacion||q.id;r._consumida=true;r.estado="COTIZADA";}
    setQuoteRequestLocked(true);renderRequests();
  }
  renderQuotes();
  return q;
}

function renderQuotes(){
  const host=$("#quotesTable");if(!host)return;
  pruneSelection("quotes",data.quotes);
  const canDelete=!!data.permissions?.quotes?.delete;if(!canDelete)selectedSet("quotes").clear();
  const visibleQuotes=filteredCommercialRows("quotes",data.quotes);updateCommercialFilterUi("quotes",visibleQuotes.length,data.quotes.length);
  const visibleIds=visibleQuotes.map(q=>String(q.id));
  const headers=canDelete?[`<span class="bulk-select-col">${bulkHeaderCheckbox("quotes",visibleIds)}</span>`,"N.º cotización","Solicitud","Fecha","Cliente","Neto","IVA","Total","Estado","PDF","Acciones"]:["N.º cotización","Solicitud","Fecha","Cliente","Neto","IVA","Total","Estado","PDF","Acciones"];
  const rows=visibleQuotes.map(q=>{const selected=selectedSet("quotes").has(String(q.id));return `<tr class="${selected?"is-selected":""}">
    ${canDelete?`<td class="bulk-select-col">${quoteIsConsumed(q)?`<span class="bulk-locked" title="Cotización UTILIZADA: no se puede eliminar"><i class="bi bi-lock-fill"></i></span>`:bulkCheckbox("quotes",q.id)}</td>`:""}
    <td><strong>${esc(q.numero_cotizacion||q.id)}</strong></td>
    <td>${esc(q.numero_solicitud||"-")}</td>
    <td>${esc(formatDate(q.fecha||q.creado_en))}</td>
    <td><strong>${esc(q.cliente_nombre||"")}</strong><br><small>${esc(q.rut?formatRutChile(q.rut):"RUT sin registrar")} · ${esc(q.telefono||"")}</small></td>
    <td>${money(q.subtotal)}</td>
    <td>${money(q.iva)}<br><small>${esc(q.iva_porcentaje||19)}%</small></td>
    <td><strong>${money(q.total)}</strong></td>
    <td>${quoteIsConsumed(q)?`<span class="quote-used-badge" title="${esc(q.pedido_numero?`Utilizada en ${q.pedido_numero}`:"Cotización utilizada en un pedido")}">UTILIZADA${q.pedido_numero?` · ${esc(q.pedido_numero)}`:""}</span>`:`<select class="status-select" onchange="changeQuoteStatus('${q.id}',this.value)">${["BORRADOR","ENVIADA","ACEPTADA","RECHAZADA","VENCIDA","ANULADA"].map(st=>`<option ${String(q.estado).toUpperCase()===st?"selected":""}>${st}</option>`).join("")}</select>`}</td>
    <td>${q.pdf_url?`<a class="pdf-link" href="${esc(q.pdf_url)}" target="_blank" rel="noopener"><i class="bi bi-file-earmark-pdf"></i> PDF</a>`:"Pendiente"}</td>
    <td><div class="row-actions"><button type="button" onclick="editQuote('${q.id}')">Editar</button><button type="button" onclick="generateQuoteFromList('${q.id}',this)"><i class="bi bi-file-earmark-pdf"></i></button><button type="button" onclick="sendQuoteFromList('${q.id}',this)"><i class="bi bi-whatsapp"></i></button>${canDelete&&!quoteIsConsumed(q)?`<button type="button" class="danger" onclick="deleteQuote('${q.id}',this)" title="Eliminar cotización"><i class="bi bi-trash3"></i></button>`:canDelete&&quoteIsConsumed(q)?`<span class="request-closed-lock" title="Cotización utilizada: protegida por trazabilidad"><i class="bi bi-shield-lock"></i> Protegida</span>`:""}</div></td>
  </tr>`}).join("");
  host.innerHTML=table(headers,rows);updateBulkBar("quotes");syncSelectedRows(host);
}
$("#quotesTable")?.addEventListener("change",e=>{
  if(handleBulkCheckboxChange(e))return;
  const all=e.target.closest('input[data-bulk-select-all="quotes"]');if(all){handleBulkSelectAllChange(e,filteredCommercialRows("quotes",data.quotes).map(q=>String(q.id)));renderQuotes()}
});
$("#deleteSelectedQuotes")?.addEventListener("click",e=>deleteSelected("quotes",e.currentTarget));
window.deleteQuote=async(id,btn)=>{
  const q=data.quotes.find(x=>String(x.id)===String(id));
  const label=q?.numero_cotizacion||id;
  if(!confirm(`¿Eliminar definitivamente la cotización ${label}?\n\nSi tiene PDF almacenado en Supabase, también será eliminado.`))return;
  await busy(btn,async()=>{try{const out=await AleAPI.post("deleteEntity",{kind:"quote",id},token);if(!out?.deleted)throw new Error("COTIZACION_NO_ELIMINADA");selectedSet("quotes").delete(String(id));toast("✓ Cotización eliminada");await reload()}catch(e){console.warn(e);toast("✕ No fue posible eliminar la cotización")}});
};
window.changeQuoteStatus=async(id,status)=>{try{const out=await AleAPI.post("updatequotestatus",{id,status},token);const ix=data.quotes.findIndex(x=>String(x.id)===String(id));if(ix>=0&&out.quote)data.quotes[ix]=out.quote;toast("Estado de cotización actualizado");renderQuotes()}catch(e){console.warn(e);const code=String(e?.message||e||"").toUpperCase();toast(code.includes("COTIZACION_UTILIZADA_BLOQUEADA")?"Esta cotización ya fue utilizada en un pedido y su estado queda en UTILIZADA":"No fue posible actualizar el estado");await loadAdminModules({modules:["quotes"],retry:true})}};

function addCatalogProductToQuote(){
  const id=$("#quoteProductPicker").value;if(!id)return toast("Selecciona un producto");
  const p=data.products.find(x=>String(x.id)===String(id));if(!p)return;
  quoteDraftItems.push(newQuoteItem({descripcion:p.nombre,cantidad:1,precio_unitario:p.precio}));renderQuoteItems();
}
$("#addQuoteProduct")?.addEventListener("click",addCatalogProductToQuote);
$("#addQuoteLine")?.addEventListener("click",()=>{quoteDraftItems.push(newQuoteItem());renderQuoteItems()});
$("#newQuote")?.addEventListener("click",()=>openQuoteEditor());
$("#closeQuoteEditorX")?.addEventListener("click",closeQuoteEditor);
wireClientRutLookup({rutSelector:"#qRut",statusSelector:"#qClientLookupState",fields:{name:"#qClient",phone:"#qPhone",email:"#qEmail"},guard:()=>!String($("#qRequestId")?.value||"").trim()});
$("#saveQuote")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const q=await persistQuote();toast(`Cotización ${q.numero_cotizacion||""} guardada`)}catch(err){console.warn(err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("COTIZACION_UTILIZADA_BLOQUEADA")?"✕ Esta cotización ya fue utilizada en un pedido. Sus datos comerciales quedan bloqueados; los datos del cliente se sincronizan desde Clientes.":code.includes("SOLICITUD_YA_CONVERTIDA_EN_COTIZACION")?"✕ Esa solicitud ya fue utilizada en otra cotización.":code.includes("SOLICITUD_COTIZACION_NO_REASIGNABLE")?"✕ Una solicitud ya vinculada no puede reasignarse a otra cotización.":code.includes("TELEFONO_YA_ASOCIADO")?"✕ Ese teléfono ya está asociado a otro RUT en Clientes.":code.includes("EMAIL_YA_ASOCIADO")?"✕ Ese correo ya está asociado a otro RUT en Clientes.":"No fue posible guardar la cotización")}}));

function phoneForWhatsapp(raw){
  let d=String(raw||"").replace(/\D/g,"");
  if(d.length===9&&d.startsWith("9"))d="56"+d;
  if(d.length===8)d="56"+d;
  return d;
}
async function imageUrlToDataUrl(url){
  const candidates=[url,"logo-ale-atencio.png"].filter(Boolean);
  for(const src of candidates){
    try{
      const r=await fetch(src,{cache:"no-store"});if(!r.ok)continue;
      const b=await r.blob();
      const data=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(b)});
      if(data)return String(data);
    }catch(_){ }
  }
  return "";
}
function pdfImageType(dataUrl){return /^data:image\/jpe?g/i.test(dataUrl)?"JPEG":"PNG"}
const ALE_TICKET_LOGO_FALLBACK="data:image/jpeg;base64,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wXyCMZ8BwlvPyOVYKLlU1e506rskQSEsul401DaNPVtqNslL6gzUhgZSwiJ7DA1xAD+JxZyYS3DeLPILza5or4NYW/UVlttRWVFno5J444h/2jiljbLACeWXR8RHq1p8FYmAmAjhdWCqWdyFbf2SusH13R18bjNNWsq5anhwKmaSCN0sgPiOPib6BoHgsbttBPRNkpKyatjlE1WRRzWp0LYwal7g4Tlg4sggj2jnKsfCYRQtYOpe9+JWOorNfotaX3Vljo55KumpYITTNGBcqfgk7yFueRe0uDmHwcOHo8qXaYo5Y9srLR1tORLHbIGSRTR4LXCJoILT0IPgpAiKFnchzbViJ6ZtlbR7QW23U0QobgLTHF7TOAxzdyAC4Y6g4/BRWibDNZdKWC1aerqO9UFTTSVTn0j4hRtZj6Q58xAa/jAe3k53GX558yLWwmAjgSqlrshmtqWJ9VR1rKmalrIoZo4pJLa6vpntfw8UcjGjOTwtwQWkgOGTnCkOnnVL9KW11Zb2W6oNLF3lHH7sDuEZYPQdPkslgIpUdbnLldWCIi6OQiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAiIgCIiAIiIAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREB//9k=";
async function siiDteLogoDataUrl(preferredUrl=""){
  const candidates=[
    preferredUrl,
    data.config?.logo_url||"",
    "logo-ale-atencio-ticket.jpg",
    "logo-ale-atencio.png"
  ].filter(Boolean);
  const seen=new Set();
  for(const src of candidates){
    const key=String(src);if(seen.has(key))continue;seen.add(key);
    try{
      const got=await imageUrlToDataUrl(key);
      if(got&&/^data:image\/(png|jpe?g)/i.test(got))return got;
    }catch(e){console.warn("SII_LOGO_CANDIDATE",key,e)}
  }
  return ALE_TICKET_LOGO_FALLBACK;
}
function siiTicketLogoSize(doc,dataUrl,maxW,maxH){
  const props=doc.getImageProperties(dataUrl);
  const w0=Number(props?.width||0),h0=Number(props?.height||0);
  if(!(w0>0&&h0>0))throw new Error("LOGO_DIMENSIONES_INVALIDAS");
  const ratio=Math.min(Number(maxW)/w0,Number(maxH)/h0);
  return{w:w0*ratio,h:h0*ratio};
}
function siiTicketFitPageHeight(doc,finalY,minHeight=120,pad=6){
  const target=Math.min(1000,Math.max(Number(minHeight)||120,Math.ceil(Number(finalY)||0)+Number(pad||0)));
  try{
    const ps=doc?.internal?.pageSize;
    if(ps&&typeof ps.setHeight==="function")ps.setHeight(target);
    else if(ps&&typeof ps.height!=="undefined")ps.height=target;
    const ctx=doc?.internal?.pagesContext?.[1];
    if(ctx?.mediaBox){
      ctx.mediaBox.topRightY=target;
      if(typeof ctx.mediaBox.bottomLeftY==="number"&&ctx.mediaBox.bottomLeftY!==0)ctx.mediaBox.bottomLeftY=0;
    }
  }catch(err){console.warn("SII_TICKET_PAGE_HEIGHT",err)}
  return target;
}
function configuredDocumentFormat(){const f=String(data.config?.document_format||"A4").toUpperCase();return ["A4","TICKET_80","TICKET_100"].includes(f)?f:"A4"}
function documentFormatLabel(f=configuredDocumentFormat()){return f==="TICKET_80"?"Ticket 80 mm":f==="TICKET_100"?"Ticket 100 mm":"A4"}
async function qrDataUrl(url){
  if(!url)return "";
  try{
    if(!window.QRCode?.toDataURL){console.warn("PDF_QR_LIBRERIA_NO_DISPONIBLE");return ""}
    return await window.QRCode.toDataURL(String(url),{width:720,margin:1,errorCorrectionLevel:"M"})
  }catch(err){
    console.warn("PDF_QR_NO_DISPONIBLE",err);
    return "";
  }
}
function clpPdf(v){return money(v).replace("CLP","$").trim()}
function centeredText(doc,text,w,y,size=8,bold=false){doc.setFont("helvetica",bold?"bold":"normal");doc.setFontSize(size);doc.text(String(text||""),w/2,y,{align:"center"})}
function drawA4PdfHeader(doc,{company,logo,qr,left=18,right=192,top=12,companyLines=[]}={}){
  const qrSize=30;
  const logoBox={x:left,y:top,w:36,h:22};
  let textX=left;
  if(logo){
    try{
      const props=doc.getImageProperties(logo),ratio=Math.min(logoBox.w/props.width,logoBox.h/props.height);
      const w=props.width*ratio,h=props.height*ratio;
      const y=top+((logoBox.h-h)/2);
      doc.addImage(logo,pdfImageType(logo),logoBox.x,y,w,h,undefined,"FAST");
      textX=logoBox.x+logoBox.w+6;
    }catch(_){textX=left;}
  }
  if(qr){
    try{
      doc.addImage(qr,"PNG",right-qrSize,10,qrSize,qrSize,undefined,"FAST");
      doc.setFont("helvetica","normal");
      doc.setFontSize(7);
      doc.text("Seguimiento / trazabilidad",right-qrSize/2,43,{align:"center"});
    }catch(_){ }
  }
  doc.setTextColor(68,47,39);
  doc.setFont("helvetica","bold");
  doc.setFontSize(18);
  doc.text(String(company||"Ale Atencio"),textX,18,{align:"left"});
  doc.setFont("helvetica","normal");
  doc.setFontSize(9);
  companyLines.filter(Boolean).forEach((line,i)=>doc.text(String(line),textX,24+i*4.5,{align:"left",maxWidth:120}));
  doc.setDrawColor(220,204,197);
  doc.line(left,48,right,48);
}
async function buildQuotePdfData(quote,traceUrl=""){
  const JsPDF=window.jspdf?.jsPDF;if(!JsPDF)throw new Error("LIBRERIA_PDF_NO_DISPONIBLE");
  const format=configuredDocumentFormat(),company=data.config?.empresa||"Ale Atencio",logo=await imageUrlToDataUrl(data.config?.logo_url||"logo-ale-atencio.png"),qr=await qrDataUrl(traceUrl);
  if(format!=="A4"){
    const width=format==="TICKET_100"?100:80,margin=5,content=width-margin*2,temp=new JsPDF({unit:"mm",format:"a4"});
    temp.setFont("helvetica","normal");temp.setFontSize(8);
    const split=(t,w=content)=>temp.splitTextToSize(String(t||""),w),items=Array.isArray(quote.items)?quote.items:[];
    let height=58+items.reduce((sum,it)=>sum+Math.max(13,split(it.descripcion||it.nombre||"Producto").length*4+10),0)+45;
    height+=quote.observaciones?split(quote.observaciones).length*4+14:0;height+=58; height=Math.max(170,Math.min(1200,height));
    const doc=new JsPDF({unit:"mm",format:[width,height],orientation:"portrait"});let y=7;
    if(logo){try{const props=doc.getImageProperties(logo),maxW=width===100?38:34,maxH=18,ratio=Math.min(maxW/props.width,maxH/props.height);const w=props.width*ratio,h=props.height*ratio;doc.addImage(logo,pdfImageType(logo),(width-w)/2,y,w,h,undefined,"FAST");y+=h+3}catch(_){}}
    doc.setTextColor(50,40,36);centeredText(doc,company,width,y+3,12,true);y+=7;doc.setFontSize(7.5);doc.setFont("helvetica","normal");
    for(const line of [data.config?.empresa_rut?`RUT: ${formatRutChile(data.config.empresa_rut)}`:"",data.config?.direccion,data.config?.email,data.config?.whatsapp?`WhatsApp: ${data.config.whatsapp}`:""].filter(Boolean)){for(const l of split(line)){doc.text(l,width/2,y,{align:"center"});y+=3.6}}
    y+=2;doc.setDrawColor(210,195,188);doc.line(margin,y,width-margin,y);y+=6;centeredText(doc,"COTIZACIÓN",width,y,11,true);y+=5;centeredText(doc,quote.numero_cotizacion||quote.id||"",width,y,8.5,true);y+=5;
    doc.setFont("helvetica","normal");doc.setFontSize(7.5);centeredText(doc,`Fecha: ${new Date(quote.fecha||quote.creado_en||Date.now()).toLocaleDateString("es-CL")}`,width,y,7.5);y+=4;centeredText(doc,`Validez: ${quote.validez_dias||15} días`,width,y,7.5);y+=6;
    doc.setFont("helvetica","bold");doc.text("CLIENTE",margin,y);y+=4;doc.setFont("helvetica","normal");for(const line of [quote.cliente_nombre,quote.rut?`RUT: ${formatRutChile(quote.rut)}`:"",quote.telefono?`Tel: ${quote.telefono}`:"",quote.email?`Correo: ${quote.email}`:"",quote.numero_solicitud?`Solicitud: ${quote.numero_solicitud}`:""].filter(Boolean)){for(const l of split(line)){doc.text(l,margin,y);y+=3.8}}y+=2;
    doc.setDrawColor(225,214,209);doc.line(margin,y,width-margin,y);y+=5;doc.setFont("helvetica","bold");doc.text("DETALLE",margin,y);y+=4;
    for(const item of items){doc.setFont("helvetica","bold");for(const l of split(item.descripcion||item.nombre||"Producto")){doc.text(l,margin,y);y+=3.8}doc.setFont("helvetica","normal");doc.setFontSize(7.2);const qty=Number(item.cantidad||0),unit=clpPdf(item.precio_unitario),total=clpPdf(item.total??qty*Number(item.precio_unitario||0));doc.text(`${qty} x ${unit}`,margin,y);doc.text(total,width-margin,y,{align:"right"});y+=5;doc.setDrawColor(238,231,227);doc.line(margin,y-2,width-margin,y-2)}
    y+=2;const totals=[["Subtotal neto",quote.subtotal],[`IVA ${quote.iva_porcentaje??19}%`,quote.iva],["TOTAL",quote.total]];for(const [label,val] of totals){const total=label==="TOTAL";doc.setFont("helvetica",total?"bold":"normal");doc.setFontSize(total?10:8);doc.text(String(label),margin,y);doc.text(clpPdf(val),width-margin,y,{align:"right"});y+=total?6:4.5}
    if(quote.observaciones){y+=2;doc.setFont("helvetica","bold");doc.setFontSize(8);doc.text("OBSERVACIONES",margin,y);y+=4;doc.setFont("helvetica","normal");doc.setFontSize(7.2);for(const l of split(quote.observaciones)){doc.text(l,margin,y);y+=3.6}}
    y+=3;doc.setDrawColor(210,195,188);doc.line(margin,y,width-margin,y);y+=5;doc.setFontSize(7);doc.setFont("helvetica","normal");for(const l of split("Escanea el QR para consultar la trazabilidad actualizada del documento y del pedido cuando corresponda.")){doc.text(l,width/2,y,{align:"center"});y+=3.3}y+=2;
    if(qr){doc.addImage(qr,"PNG",(width-40)/2,y,40,40,undefined,"FAST");y+=43}centeredText(doc,"TRAZABILIDAD",width,y,7.5,true);y+=5;doc.setFontSize(6.5);centeredText(doc,`${company} · ${quote.numero_cotizacion||"Cotización"}`,width,y,6.5);
    return {doc,dataUrl:doc.output("datauristring"),format};
  }
  const doc=new JsPDF({unit:"mm",format:"a4",orientation:"portrait"}),pageW=210,pageH=297,left=18,right=192;
  const companyLines=[data.config?.empresa_rut?`RUT: ${formatRutChile(data.config.empresa_rut)}`:"",data.config?.direccion,data.config?.email,data.config?.whatsapp?`WhatsApp: ${data.config.whatsapp}`:""].filter(Boolean);
  drawA4PdfHeader(doc,{company,logo,qr,left,right,top:12,companyLines});
  doc.setFont("helvetica","bold");doc.setFontSize(20);doc.text("COTIZACIÓN",left,59);doc.setFontSize(11);doc.text(String(quote.numero_cotizacion||quote.id||""),right,57,{align:"right"});doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text(`Fecha: ${new Date(quote.fecha||quote.creado_en||Date.now()).toLocaleDateString("es-CL")}`,right,63,{align:"right"});doc.text(`Validez: ${quote.validez_dias||15} días`,right,68,{align:"right"});let y=75;
  doc.setFont("helvetica","bold");doc.text("Cliente",left,y);doc.setFont("helvetica","normal");doc.text(String(quote.cliente_nombre||""),left,y+5);let clientY=y+10;if(quote.rut){doc.text(`RUT: ${formatRutChile(quote.rut)}`,left,clientY);clientY+=5}if(quote.telefono){doc.text(`Teléfono: ${quote.telefono}`,left,clientY);clientY+=5}if(quote.email)doc.text(`Correo: ${quote.email}`,left,clientY);if(quote.numero_solicitud){doc.setFont("helvetica","bold");doc.text(`Solicitud: ${quote.numero_solicitud}`,right,y,{align:"right"});doc.setFont("helvetica","normal")}y+=25;
  const col={desc:left,qty:125,price:145,total:right},drawHeader=()=>{doc.setFillColor(248,241,238);doc.rect(left,y,right-left,9,"F");doc.setFont("helvetica","bold");doc.text("Descripción",col.desc+2,y+6);doc.text("Cant.",col.qty,y+6,{align:"right"});doc.text("P. unitario",col.price+20,y+6,{align:"right"});doc.text("Total",col.total,y+6,{align:"right"});doc.setFont("helvetica","normal");y+=12};drawHeader();
  for(const item of quote.items||[]){const lines=doc.splitTextToSize(String(item.descripcion||""),78),h=Math.max(7,lines.length*4.5+2);if(y+h>245){doc.addPage();y=18;drawHeader()}doc.text(lines,col.desc+2,y+4);doc.text(String(item.cantidad??""),col.qty,y+4,{align:"right"});doc.text(clpPdf(item.precio_unitario),col.price+20,y+4,{align:"right"});doc.text(clpPdf(item.total??(Number(item.cantidad||0)*Number(item.precio_unitario||0))),col.total,y+4,{align:"right"});doc.setDrawColor(235,225,220);doc.line(left,y+h,right,y+h);y+=h+2}
  if(y>230){doc.addPage();y=22}y+=5;doc.setFont("helvetica","normal");doc.text("Subtotal neto",160,y,{align:"right"});doc.setFont("helvetica","bold");doc.text(clpPdf(quote.subtotal),right,y,{align:"right"});y+=7;doc.setFont("helvetica","normal");doc.text(`IVA ${quote.iva_porcentaje??19}%`,160,y,{align:"right"});doc.setFont("helvetica","bold");doc.text(clpPdf(quote.iva),right,y,{align:"right"});y+=8;doc.setFontSize(12);doc.text("TOTAL",160,y,{align:"right"});doc.text(clpPdf(quote.total),right,y,{align:"right"});doc.setFontSize(9);if(quote.observaciones){y+=14;doc.setFont("helvetica","bold");doc.text("Observaciones",left,y);doc.setFont("helvetica","normal");doc.text(doc.splitTextToSize(String(quote.observaciones),174),left,y+5)}
  const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(125,108,100);doc.text(`${company} · ${quote.numero_cotizacion||"Cotización"}`,left,pageH-10);doc.text(`Página ${i} de ${pages}`,right,pageH-10,{align:"right"})}return {doc,dataUrl:doc.output("datauristring"),format};
}
async function buildRequestPdfData(request,traceUrl=""){
  const JsPDF=window.jspdf?.jsPDF;if(!JsPDF)throw new Error("LIBRERIA_PDF_NO_DISPONIBLE");const format=configuredDocumentFormat(),company=data.config?.empresa||"Ale Atencio",logo=await imageUrlToDataUrl(data.config?.logo_url||"logo-ale-atencio.png"),qr=await qrDataUrl(traceUrl),ticket=format!=="A4",width=format==="TICKET_100"?100:format==="TICKET_80"?80:210,margin=ticket?5:18,content=width-margin*2;
  let height=297;if(ticket){const temp=new JsPDF({unit:"mm",format:"a4"});temp.setFontSize(8);const split=t=>temp.splitTextToSize(String(t||""),content);height=145+(request.detalle?split(request.detalle).length*4:0)+(request.nombre?8:0);height=Math.max(170,Math.min(800,height));}
  const doc=new JsPDF({unit:"mm",format:ticket?[width,height]:"a4",orientation:"portrait"});let y=ticket?7:12;
  if(logo){try{if(ticket){const props=doc.getImageProperties(logo),maxW=width===100?38:34,maxH=18,ratio=Math.min(maxW/props.width,maxH/props.height);const w=props.width*ratio,h=props.height*ratio;doc.addImage(logo,pdfImageType(logo),(width-w)/2,y,w,h,undefined,"FAST");y+=h+4}else doc.addImage(logo,pdfImageType(logo),margin,y,48,24,undefined,"FAST")}catch(_){}}
  if(ticket){centeredText(doc,company,width,y+2,12,true);y+=7;doc.setFontSize(7.5);for(const line of [data.config?.empresa_rut?`RUT: ${formatRutChile(data.config.empresa_rut)}`:"",data.config?.direccion,data.config?.email,data.config?.whatsapp?`WhatsApp: ${data.config.whatsapp}`:""].filter(Boolean)){doc.text(String(line),width/2,y,{align:"center",maxWidth:content});y+=4}doc.setDrawColor(215,200,192);doc.line(margin,y,width-margin,y);y+=7;centeredText(doc,"SOLICITUD",width,y,11,true);y+=5;centeredText(doc,request.numero_solicitud||request.id||"",width,y,8.5,true);y+=7;doc.setFont("helvetica","normal");doc.setFontSize(8);for(const [label,val] of [["Fecha",new Date(request.fecha||Date.now()).toLocaleString("es-CL")],["Cliente",request.nombre],["RUT",request.rut?formatRutChile(request.rut):""],["Teléfono",request.telefono],["Correo",request.email],["Tipo",request.tipo],["Evento",request.fecha_evento],["Cantidad",request.cantidad],["Pago preferido",request.medio_pago_preferido],["Estado",request.estado]].filter(x=>x[1])){doc.setFont("helvetica","bold");doc.text(`${label}:`,margin,y);doc.setFont("helvetica","normal");const lines=doc.splitTextToSize(String(val),content-24);doc.text(lines,margin+24,y);y+=Math.max(4,lines.length*3.8)}if(request.detalle){y+=3;doc.setFont("helvetica","bold");doc.text("DETALLE",margin,y);y+=4;doc.setFont("helvetica","normal");for(const l of doc.splitTextToSize(String(request.detalle),content)){doc.text(l,margin,y);y+=3.8}}y+=5;doc.line(margin,y,width-margin,y);y+=5;doc.setFontSize(7);for(const l of doc.splitTextToSize("Escanea el QR para consultar la trazabilidad actualizada de esta solicitud y del pedido cuando corresponda.",content)){doc.text(l,width/2,y,{align:"center"});y+=3.3}y+=2;if(qr){doc.addImage(qr,"PNG",(width-40)/2,y,40,40,undefined,"FAST");y+=43}centeredText(doc,"TRAZABILIDAD",width,y,7.5,true);return {doc,dataUrl:doc.output("datauristring"),format}}
  const right=192;drawA4PdfHeader(doc,{company,logo,qr,left:margin,right,top:12,companyLines:[data.config?.empresa_rut?`RUT: ${formatRutChile(data.config.empresa_rut)}`:"",data.config?.direccion,data.config?.email,data.config?.whatsapp?`WhatsApp: ${data.config.whatsapp}`:""].filter(Boolean)});doc.setFont("helvetica","bold");doc.setFontSize(20);doc.text("SOLICITUD",margin,60);doc.setFontSize(11);doc.text(String(request.numero_solicitud||request.id||""),right,58,{align:"right"});y=73;doc.setFontSize(9);for(const [label,val] of [["Fecha",new Date(request.fecha||Date.now()).toLocaleString("es-CL")],["Cliente",request.nombre],["RUT",request.rut?formatRutChile(request.rut):""],["Teléfono",request.telefono],["Correo",request.email],["Tipo",request.tipo],["Evento",request.fecha_evento],["Cantidad",request.cantidad],["Pago preferido",request.medio_pago_preferido],["Estado",request.estado]].filter(x=>x[1])){doc.setFont("helvetica","bold");doc.text(`${label}:`,margin,y);doc.setFont("helvetica","normal");const lines=doc.splitTextToSize(String(val),120);doc.text(lines,58,y);y+=Math.max(6,lines.length*4.5)}if(request.detalle){y+=4;doc.setFont("helvetica","bold");doc.text("Detalle",margin,y);doc.setFont("helvetica","normal");doc.text(doc.splitTextToSize(String(request.detalle),174),margin,y+6)}doc.setFontSize(8);doc.setTextColor(125,108,100);doc.text(`${company} · ${request.numero_solicitud||"Solicitud"}`,margin,287);return {doc,dataUrl:doc.output("datauristring"),format};
}
async function generateRequestPdf(request,download=true){
  if(!request?.id)throw new Error("SOLICITUD_NO_ENCONTRADA");
  let traceUrl="";
  try{
    const shared=await AleAPI.post("requestsharelink",{id:request.id},token);
    traceUrl=shared?.trace_url||shared?.public_url||"";
  }catch(err){
    // El enlace/QR es complementario. Nunca debe impedir generar o reimprimir el PDF.
    console.warn("PDF_SOLICITUD_SIN_TRAZABILIDAD",err);
  }
  const built=await buildRequestPdfData(request,traceUrl);
  if(download)built.doc.save(`${request.numero_solicitud||"solicitud"}.pdf`);
  return built;
}
window.generateRequestPdfFromList=async(id,btn)=>busy(btn,async()=>{try{const r=data.requests.find(x=>String(x.id)===String(id));if(!r)throw new Error("SOLICITUD_NO_ENCONTRADA");await generateRequestPdf(r,true);toast(`PDF ${documentFormatLabel()} generado`)}catch(err){console.warn(err);toast("No fue posible generar el PDF de la solicitud")}});

async function generateAndUploadQuotePdf(quote,download=true){
  const saved=quote?.id?quote:await persistQuote();
  const fresh=data.quotes.find(x=>String(x.id)===String(saved.id))||saved;
  let traceUrl="";
  try{
    const shared=await AleAPI.post("quotesharelink",{id:fresh.id},token);
    traceUrl=shared?.trace_url||shared?.public_url||"";
  }catch(err){
    // El QR es complementario. La cotización debe poder emitirse aunque falle el enlace público.
    console.warn("PDF_COTIZACION_SIN_TRAZABILIDAD",err);
  }
  const built=await buildQuotePdfData(fresh,traceUrl);
  // Primero materializa el PDF para el usuario. Un fallo de Storage no debe bloquear su emisión.
  if(download)built.doc.save(`${fresh.numero_cotizacion||"cotizacion"}.pdf`);
  try{
    const out=await AleAPI.uploadQuotePdf({id:fresh.id,dataUrl:built.dataUrl},token);
    const updated=out.quote||{...fresh,pdf_url:out.pdfUrl};
    const ix=data.quotes.findIndex(x=>String(x.id)===String(updated.id));if(ix>=0)data.quotes[ix]=updated;else data.quotes.unshift(updated);
    $("#qPdfUrl").value=updated.pdf_url||out.pdfUrl||"";renderQuotes();
    return updated;
  }catch(err){
    console.warn("PDF_COTIZACION_STORAGE_PENDIENTE",err);
    return {...fresh,_pdfUploadPending:true,_pdfUploadError:String(err?.message||err||"ERROR")};
  }
}
async function sendQuoteWhatsapp(quote,popup=null){
  let q=quote;
  if(!q?.id)q=await persistQuote();
  // R9.18.17: WhatsApp comparte la vista pública firmada, nunca el PDF/Storage del servidor.
  const phone=phoneForWhatsapp(q.telefono);if(!phone)throw new Error("TELEFONO_WHATSAPP_REQUERIDO");
  const shared=await AleAPI.post("quotesharelink",{id:q.id},token),publicUrl=clientPublicUrl(shared?.public_url||"");
  const text=`Hola ${q.cliente_nombre||""}, puedes revisar la cotización ${q.numero_cotizacion||""}${q.numero_solicitud?` asociada a la solicitud ${q.numero_solicitud}`:""}. Total: ${money(q.total)}. Enlace seguro: ${publicUrl}`;
  const waUrl=`https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  if(popup && !popup.closed) popup.location.href=waUrl;
  else window.open(waUrl,"_blank","noopener");
  if(String(q.estado||"").toUpperCase()==="BORRADOR"){
    try{const out=await AleAPI.post("updatequotestatus",{id:q.id,status:"ENVIADA"},token);if(out.quote){const ix=data.quotes.findIndex(x=>String(x.id)===String(q.id));if(ix>=0)data.quotes[ix]=out.quote;renderQuotes()}}catch(_){ }
  }
  return q;
}
$("#generateQuotePdf")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const q=$("#qId").value?data.quotes.find(x=>String(x.id)===String($("#qId").value)):null;const out=await generateAndUploadQuotePdf(q||null,true);toast(out?._pdfUploadPending?`PDF ${out.numero_cotizacion||""} descargado. El respaldo en servidor quedó pendiente.`:`PDF ${out.numero_cotizacion||""} generado`)}catch(err){console.warn(err);toast("No fue posible generar el PDF")}}));
$("#sendQuoteWhatsapp")?.addEventListener("click",e=>{const popup=window.open("about:blank","_blank");busy(e.currentTarget,async()=>{try{const q=$("#qId").value?data.quotes.find(x=>String(x.id)===String($("#qId").value)):null;await sendQuoteWhatsapp(q||null,popup);toast("Cotización preparada para WhatsApp")}catch(err){try{popup?.close()}catch(_){}console.warn(err);toast("No fue posible enviar por WhatsApp")}})});
window.generateQuoteFromList=async(id,btn)=>busy(btn,async()=>{try{const q=data.quotes.find(x=>String(x.id)===String(id));if(!q)throw new Error("COTIZACION_NO_ENCONTRADA");const out=await generateAndUploadQuotePdf(q,true);toast(out?._pdfUploadPending?"PDF descargado. El respaldo en servidor quedó pendiente.":"PDF generado")}catch(e){console.warn(e);toast("No fue posible generar PDF")}});
window.sendQuoteFromList=async(id,btn)=>{const popup=window.open("about:blank","_blank");return busy(btn,async()=>{try{const q=data.quotes.find(x=>String(x.id)===String(id));if(!q)throw new Error("COTIZACION_NO_ENCONTRADA");await sendQuoteWhatsapp(q,popup);toast("Cotización preparada para WhatsApp")}catch(e){try{popup?.close()}catch(_){}console.warn(e);toast("No fue posible abrir WhatsApp")}})};



// ========================= R9.6 IMPORTACION XLSX =========================
let productImportRows=[];
function normalizeImportHeader(v){return normalizeText(v).replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")}
function importRowFromXlsx(raw){
  const m={};Object.entries(raw||{}).forEach(([k,v])=>m[normalizeImportHeader(k)]=v);
  return {id:String(m.id||m.codigo||"").trim(),nombre:String(m.nombre||m.producto||"").trim(),descripcion:String(m.descripcion||"").trim(),precio:toNumber(m.precio),categoria_nombre:String(m.categoria||m.categoria_nombre||"").trim(),destacado:String(m.destacado||"NO").trim(),activo:String(m.activo||"SI").trim(),ocasion:String(m.ocasion||"").trim(),orden:toNumber(m.orden),image_url:String(m.imagen_url||m.image_url||m.imagen||"").trim()};
}
function showProductImport(open){$("#productImportEditor")?.classList.toggle("hidden",!open);document.body.classList.toggle("product-import-open",!!open);if(!open){productImportRows=[];resetFilePicker("#productImportFile");$("#confirmProductImport").disabled=true;$("#productImportPreview").innerHTML="";$("#productImportSummary").textContent="Aún no se ha seleccionado un archivo."}}
$("#importProductsXlsx")?.addEventListener("click",()=>showProductImport(true));
$("#closeProductImportX")?.addEventListener("click",()=>showProductImport(false));$("#cancelProductImport")?.addEventListener("click",()=>showProductImport(false));
$("#productImportFile")?.addEventListener("change",async e=>{
  const f=e.target.files?.[0];if(!f)return;if(!window.XLSX)return toast("No se cargó el lector XLSX");
  try{const buf=await f.arrayBuffer(),book=XLSX.read(buf,{type:"array"}),sheet=book.Sheets[book.SheetNames[0]],rows=XLSX.utils.sheet_to_json(sheet,{defval:""});productImportRows=rows.map(importRowFromXlsx).filter(r=>r.nombre);const invalid=productImportRows.filter(r=>!r.nombre||r.precio<0);$("#productImportSummary").textContent=`${productImportRows.length} filas válidas para revisar${invalid.length?` · ${invalid.length} con observaciones`:""}.`;$("#confirmProductImport").disabled=!productImportRows.length;const preview=productImportRows.slice(0,25);$("#productImportPreview").innerHTML=table(["ID","Nombre","Categoría","Precio","Activo"],preview.map(r=>`<tr><td>${esc(r.id||"NUEVO")}</td><td>${esc(r.nombre)}</td><td>${esc(r.categoria_nombre)}</td><td>${money(r.precio)}</td><td>${esc(r.activo)}</td></tr>`).join(""));}catch(err){console.warn(err);toast("No fue posible leer el XLSX")}
});
$("#confirmProductImport")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const out=await AleAPI.post("bulkimportproducts",{rows:productImportRows},token);toast(`Importación lista: ${out.imported||0} productos · ${out.errors?.length||0} errores`);showProductImport(false);await reload()}catch(err){console.warn(err);toast("No fue posible importar los productos")}}));

// ========================= R9.6 CLIENTES =========================
function clientTransportLabel(v){const x=String(v||"POR DEFINIR").toUpperCase();return x==="RETIRO"?"Retiro":x==="DESPACHO"?"Despacho":x==="OTRO"?"Otro":"Por definir"}
function ensureClientEditorPortal(){
  const modal=$("#clientEditor");
  if(!modal)return null;
  // R9.18.97: el editor estaba dentro de #view-clients. Cuando se invocaba desde
  // Mayoristas, el ancestro oculto (display:none) impedía mostrar el modal aunque
  // se retirara la clase .hidden. Lo movemos al body para que sea un modal global.
  if(modal.closest(".admin-view"))document.body.appendChild(modal);
  return modal;
}

// ========================= R9.18.106 · TERRITORIO CHILE =========================
const CHILE_COMMUNES_BY_REGION=Object.freeze({"Arica y Parinacota":["Arica","Camarones","Putre","General Lagos"],"Tarapacá":["Iquique","Alto Hospicio","Pozo Almonte","Camiña","Colchane","Huara","Pica"],"Antofagasta":["Antofagasta","Mejillones","Sierra Gorda","Taltal","Calama","Ollagüe","San Pedro de Atacama","Tocopilla","María Elena"],"Atacama":["Copiapó","Caldera","Tierra Amarilla","Chañaral","Diego de Almagro","Vallenar","Alto del Carmen","Freirina","Huasco"],"Coquimbo":["La Serena","Coquimbo","Andacollo","La Higuera","Paihuano","Vicuña","Illapel","Canela","Los Vilos","Salamanca","Ovalle","Combarbalá","Monte Patria","Punitaqui","Río Hurtado"],"Valparaíso":["Valparaíso","Casablanca","Concón","Juan Fernández","Puchuncaví","Quintero","Viña del Mar","Isla de Pascua","Los Andes","Calle Larga","Rinconada","San Esteban","La Ligua","Cabildo","Papudo","Petorca","Zapallar","Quillota","Calera","Hijuelas","La Cruz","Nogales","San Antonio","Algarrobo","Cartagena","El Quisco","El Tabo","Santo Domingo","San Felipe","Catemu","Llay-Llay","Panquehue","Putaendo","Santa María","Quilpué","Limache","Olmué","Villa Alemana"],"Metropolitana de Santiago":["Santiago","Cerrillos","Cerro Navia","Conchalí","El Bosque","Estación Central","Huechuraba","Independencia","La Cisterna","La Florida","La Granja","La Pintana","La Reina","Las Condes","Lo Barnechea","Lo Espejo","Lo Prado","Macul","Maipú","Ñuñoa","Pedro Aguirre Cerda","Peñalolén","Providencia","Pudahuel","Quilicura","Quinta Normal","Recoleta","Renca","San Joaquín","San Miguel","San Ramón","Vitacura","Puente Alto","Pirque","San José de Maipo","Colina","Lampa","Tiltil","San Bernardo","Buin","Calera de Tango","Paine","Melipilla","Alhué","Curacaví","María Pinto","San Pedro","Talagante","El Monte","Isla de Maipo","Padre Hurtado","Peñaflor"],"O’Higgins":["Rancagua","Codegua","Coinco","Coltauco","Doñihue","Graneros","Las Cabras","Machalí","Malloa","Mostazal","Olivar","Peumo","Pichidegua","Quinta de Tilcoco","Rengo","Requínoa","San Vicente","Pichilemu","La Estrella","Litueche","Marchigüe","Navidad","Paredones","San Fernando","Chépica","Chimbarongo","Lolol","Nancagua","Palmilla","Peralillo","Placilla","Pumanque","Santa Cruz"],"Maule":["Talca","Constitución","Curepto","Empedrado","Maule","Pelarco","Pencahue","Río Claro","San Clemente","San Rafael","Cauquenes","Chanco","Pelluhue","Curicó","Hualañé","Licantén","Molina","Rauco","Romeral","Sagrada Familia","Teno","Vichuquén","Linares","Colbún","Longaví","Parral","Retiro","San Javier","Villa Alegre","Yerbas Buenas"],"Ñuble":["Chillán","Bulnes","Chillán Viejo","El Carmen","Pemuco","Pinto","Quillón","San Ignacio","Yungay","Quirihue","Cobquecura","Coelemu","Ninhue","Portezuelo","Ránquil","Treguaco","San Carlos","Coihueco","Ñiquén","San Fabián","San Nicolás"],"Biobío":["Concepción","Coronel","Chiguayante","Florida","Hualqui","Lota","Penco","San Pedro de la Paz","Santa Juana","Talcahuano","Tomé","Hualpén","Lebu","Arauco","Cañete","Contulmo","Curanilahue","Los Álamos","Tirúa","Los Ángeles","Antuco","Cabrero","Laja","Mulchén","Nacimiento","Negrete","Quilaco","Quilleco","San Rosendo","Santa Bárbara","Tucapel","Yumbel","Alto Biobío"],"La Araucanía":["Temuco","Carahue","Cunco","Curarrehue","Freire","Galvarino","Gorbea","Lautaro","Loncoche","Melipeuco","Nueva Imperial","Padre Las Casas","Perquenco","Pitrufquén","Pucón","Saavedra","Teodoro Schmidt","Toltén","Vilcún","Villarrica","Cholchol","Angol","Collipulli","Curacautín","Ercilla","Lonquimay","Los Sauces","Lumaco","Purén","Renaico","Traiguén","Victoria"],"Los Ríos":["Valdivia","Corral","Lanco","Los Lagos","Máfil","Mariquina","Paillaco","Panguipulli","La Unión","Futrono","Lago Ranco","Río Bueno"],"Los Lagos":["Puerto Montt","Calbuco","Cochamó","Fresia","Frutillar","Los Muermos","Llanquihue","Maullín","Puerto Varas","Castro","Ancud","Chonchi","Curaco de Vélez","Dalcahue","Puqueldón","Queilén","Quellón","Quemchi","Quinchao","Osorno","Puerto Octay","Purranque","Puyehue","Río Negro","San Juan de la Costa","San Pablo","Chaitén","Futaleufú","Hualaihué","Palena"],"Aysén":["Coyhaique","Lago Verde","Aysén","Cisnes","Guaitecas","Cochrane","O'Higgins","Tortel","Chile Chico","Río Ibáñez"],"Magallanes y de la Antártica Chilena":["Punta Arenas","Laguna Blanca","Río Verde","San Gregorio","Cabo de Hornos","Antártica","Porvenir","Primavera","Timaukel","Natales","Torres del Paine"]});
const CHILE_METRO_AREAS=Object.freeze({"Santiago · Área Metropolitana":["Santiago","Cerrillos","Cerro Navia","Conchalí","El Bosque","Estación Central","Huechuraba","Independencia","La Cisterna","La Florida","La Granja","La Pintana","La Reina","Las Condes","Lo Barnechea","Lo Espejo","Lo Prado","Macul","Maipú","Ñuñoa","Pedro Aguirre Cerda","Peñalolén","Providencia","Pudahuel","Quilicura","Quinta Normal","Recoleta","Renca","San Joaquín","San Miguel","San Ramón","Vitacura","Puente Alto","Pirque","San José de Maipo","Colina","Lampa","Tiltil","San Bernardo","Buin","Calera de Tango","Paine","María Pinto","Talagante","El Monte","Isla de Maipo","Padre Hurtado","Peñaflor"],"Gran Concepción · Área Metropolitana":["Concepción","Coronel","Chiguayante","Hualpén","Lota","Penco","San Pedro de la Paz","Talcahuano","Santa Juana","Hualqui","Tomé"],"Iquique–Alto Hospicio · Área Metropolitana":["Iquique","Alto Hospicio"],"Coquimbo–La Serena · Área Metropolitana":["Coquimbo","La Serena"],"Gran Valparaíso · Área Metropolitana":["Valparaíso","Viña del Mar","Concón","Villa Alemana","Quilpué"],"Rancagua · Área Metropolitana":["Rancagua","Machalí","Graneros","Olivar"],"Puerto Montt–Puerto Varas · Área Metropolitana":["Puerto Montt","Puerto Varas"]});

const CHILE_COMMUNES=Object.freeze(Object.entries(CHILE_COMMUNES_BY_REGION).flatMap(([region,comunas])=>comunas.map(comuna=>({region,comuna}))));
function geoKey(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
const CHILE_COMMUNE_LOOKUP=new Map(CHILE_COMMUNES.map(x=>[geoKey(x.comuna),x]));
const CHILE_METRO_LOOKUP=new Map(Object.entries(CHILE_METRO_AREAS).map(([name,comunas])=>[geoKey(name),{name,comunas}]));
function clientGeoCommuneOptions(cityValue=""){
  const key=geoKey(cityValue);if(!key)return CHILE_COMMUNES.map(x=>x.comuna);
  const area=CHILE_METRO_LOOKUP.get(key);if(area)return area.comunas.slice();
  const one=CHILE_COMMUNE_LOOKUP.get(key);if(one)return [one.comuna];
  return CHILE_COMMUNES.map(x=>x.comuna);
}
function fillClientCityCatalog(){
  const list=$("#clientCityList");if(!list)return;
  const metroOptions=Object.keys(CHILE_METRO_AREAS).map(name=>`<option value="${esc(name)}">Área oficial / agrupación urbana</option>`);
  const communeOptions=CHILE_COMMUNES.map(x=>`<option value="${esc(x.comuna)}">${esc(x.region)}</option>`);
  list.innerHTML=[...metroOptions,...communeOptions].join("");
}
function refreshClientCommuneCatalog({autofill=false}={}){
  const list=$("#clientCommuneList"),city=$("#clientCity"),commune=$("#clientCommune");if(!list||!commune)return;
  const options=clientGeoCommuneOptions(city?.value||"");
  list.innerHTML=options.map(name=>{const meta=CHILE_COMMUNE_LOOKUP.get(geoKey(name));return `<option value="${esc(name)}">${esc(meta?.region||"")}</option>`}).join("");
  const exactCity=CHILE_COMMUNE_LOOKUP.get(geoKey(city?.value||""));
  if(autofill&&exactCity&&!commune.value.trim())commune.value=exactCity.comuna;
  const help=$("#clientCommuneHelp");if(help){const area=CHILE_METRO_LOOKUP.get(geoKey(city?.value||""));help.textContent=area?`${area.comunas.length} comunas asociadas a ${area.name}. Escribe para filtrar.`:exactCity?`Comuna asociada: ${exactCity.comuna}.`:`Catálogo oficial de ${CHILE_COMMUNES.length} comunas de Chile. Escribe para filtrar.`}
}
function wireClientGeoFields(){
  fillClientCityCatalog();refreshClientCommuneCatalog();
  $("#clientCity")?.addEventListener("input",()=>refreshClientCommuneCatalog({autofill:true}));
  $("#clientCity")?.addEventListener("change",()=>refreshClientCommuneCatalog({autofill:true}));
  $("#clientCommune")?.addEventListener("change",e=>{const hit=CHILE_COMMUNE_LOOKUP.get(geoKey(e.currentTarget.value));if(hit){e.currentTarget.value=hit.comuna;const city=$("#clientCity");if(city&&!city.value.trim())city.value=hit.comuna;refreshClientCommuneCatalog()}});
}

function setClientEditorValue(selector,value){const el=$(selector);if(el)el.value=value??""}
function setClientEditorText(selector,value){const el=$(selector);if(el)el.textContent=String(value??"")}
function openClientEditor(id=""){
  try{
    const modal=ensureClientEditorPortal();if(!modal)throw new Error("CLIENT_EDITOR_NO_ENCONTRADO");
    try{fillWholesaleSelectors()}catch(selectorErr){console.warn("fillWholesaleSelectors",selectorErr)}
    const sid=String(id||"");
    const c=sid?((data.clients||[]).find(x=>String(x.id)===sid)||(data.wholesalers||[]).find(x=>String(x.id)===sid)||null):null;
    if(sid&&!c){toast("No se encontró la ficha del Mayorista. Actualizando datos…");loadAdminModules({modules:["clients","wholesale"],retry:true}).then(()=>openClientEditor(sid)).catch(err=>{console.warn("openClientEditor reload",err);toast("No fue posible cargar la ficha del cliente")});return}
    setClientEditorValue("#clientId",c?.id||"");setClientEditorValue("#clientRut",c?.rut?formatRutChile(c.rut):"");setClientEditorValue("#clientName",c?.nombre||c?.razon_social||"");setClientEditorValue("#clientPhone",c?.telefono||"");setClientEditorValue("#clientEmail",c?.email||"");setClientEditorValue("#clientAddress",c?.direccion||"");setClientEditorValue("#clientCity",c?.ciudad||c?.comuna||"");setClientEditorValue("#clientCommune",c?.comuna||"");refreshClientCommuneCatalog();setClientEditorValue("#clientTransport",String(c?.tipo_transporte||"POR DEFINIR").toUpperCase());
    if($("#clientType"))$("#clientType").value=String(c?.tipo_cliente||((c?.mayorista_estado||c?.lista_precio_id)?"MAYORISTA":"MINORISTA")).toUpperCase()==="MAYORISTA"?"MAYORISTA":"MINORISTA";
    if($("#clientWholesaleStatus"))$("#clientWholesaleStatus").value=String(c?.mayorista_estado||($("#clientType")?.value==="MAYORISTA"?"PENDIENTE":"NO_APLICA")).toUpperCase();
    setClientEditorValue("#clientPriceList",c?.lista_precio_id||"");setClientEditorValue("#clientBusinessName",c?.razon_social||c?.nombre||"");setClientEditorValue("#clientBusinessActivity",c?.giro||"");
    setClientEditorText("#clientEditorTitle",c?"Editar cliente":"Crear cliente");setClientEditorText("#clientEditorNumber",c?(c.numero_cliente||c.id||"Cliente"):"Cliente nuevo");
    setClientEditorText("#clientStatRequests",c?.total_solicitudes||0);setClientEditorText("#clientStatOrders",c?.total_pedidos||0);setClientEditorText("#clientStatQuotes",c?.total_cotizaciones||0);setClientEditorText("#clientStatTotal",money(c?.total_comprado||0));
    modal.classList.remove("hidden");modal.scrollTop=0;document.body.classList.add("client-editor-open");requestAnimationFrame(()=>$(c?"#clientName":"#clientRut")?.focus());
  }catch(err){console.warn("openClientEditor",err);toast("No fue posible abrir la ficha del cliente");}
}
window.openClientEditor=openClientEditor;
window.editWholesaleClient=clientId=>openClientEditor(clientId);
function closeClientEditor(){$("#clientEditor")?.classList.add("hidden");document.body.classList.remove("client-editor-open")}
function renderClients(){
  const host=$("#clientsTable");if(!host)return;const q=String($("#clientSearch")?.value||"").trim();const list=(data.clients||[]).filter(c=>flexibleSearchMatch([c.nombre,c.rut,c.telefono,c.email,c.numero_cliente,c.direccion,c.ciudad,c.comuna,c.tipo_transporte],q));
  $("#clientResultsMeta").textContent=`Mostrando ${list.length} de ${(data.clients||[]).length} clientes`;
  host.innerHTML=table(["N.º cliente","Cliente","RUT","Contacto","Dirección","Transporte","Solicitudes","Pedidos","Cotizaciones","Total comprado","Última interacción"],list.map(c=>`<tr class="client-row" data-client-id="${esc(c.id)}" tabindex="0" title="Abrir ficha de ${esc(c.nombre||"cliente")}"><td><strong>${esc(c.numero_cliente||c.id)}</strong></td><td><strong>${esc(c.nombre||"")}</strong></td><td>${esc(c.rut?formatRutChile(c.rut):"-")}</td><td>${esc(c.telefono||"")}<br><small>${esc(c.email||"")}</small></td><td><span class="client-address" title="${esc([c.direccion,c.ciudad,c.comuna].filter(Boolean).join(", "))}">${esc(c.direccion||"-")}${(c.ciudad||c.comuna)?`<br><small>${esc([c.ciudad,c.comuna].filter(Boolean).join(" · "))}</small>`:""}</span></td><td><span class="transport-badge">${esc(clientTransportLabel(c.tipo_transporte))}</span></td><td>${Number(c.total_solicitudes||0)}</td><td>${Number(c.total_pedidos||0)}</td><td>${Number(c.total_cotizaciones||0)}</td><td>${money(c.total_comprado||0)}</td><td>${esc(formatDate(c.ultima_interaccion))}</td></tr>`).join(""));
  const canWrite=data.permissions?.clients?.write!==false;$("#createClient")?.classList.toggle("hidden",!canWrite);
}
$("#clientSearch")?.addEventListener("input",renderClients);$("#clearClientSearch")?.addEventListener("click",()=>{$("#clientSearch").value="";renderClients();$("#clientSearch").focus()});
$("#createClient")?.addEventListener("click",()=>openClientEditor());$("#closeClientEditorX")?.addEventListener("click",closeClientEditor);$("#cancelClientEditor")?.addEventListener("click",closeClientEditor);wireRutInput("#clientRut");wireClientGeoFields();
$("#clientsTable")?.addEventListener("click",e=>{const row=e.target.closest?.("tr[data-client-id]");if(row)openClientEditor(row.dataset.clientId)});$("#clientsTable")?.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches?.("tr[data-client-id]")){e.preventDefault();openClientEditor(e.target.dataset.clientId)}});
$("#saveClient")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const name=$("#clientName").value.trim();if(!name)throw new Error("NOMBRE_REQUERIDO");const rut=requireRutChile($("#clientRut").value);const payload={id:$("#clientId").value||undefined,nombre:name,rut,telefono:$("#clientPhone").value.trim(),email:$("#clientEmail").value.trim(),direccion:$("#clientAddress").value.trim(),ciudad:$("#clientCity")?.value.trim()||"",comuna:$("#clientCommune").value.trim(),tipo_transporte:$("#clientTransport").value,tipo_cliente:$("#clientType")?.value||"MINORISTA",mayorista_estado:$("#clientWholesaleStatus")?.value||"NO_APLICA",lista_precio_id:$("#clientPriceList")?.value||"",razon_social:$("#clientBusinessName")?.value.trim()||"",giro:$("#clientBusinessActivity")?.value.trim()||""};if(payload.tipo_cliente==='MAYORISTA'&&!payload.lista_precio_id&&payload.mayorista_estado==='APROBADO')payload.mayorista_estado='PENDIENTE';const out=await AleAPI.post("saveclient",payload,token);const c=out.client;if(!c)throw new Error("CLIENTE_NO_GUARDADO");const i=(data.clients||[]).findIndex(x=>String(x.id)===String(c.id));if(i>=0)data.clients[i]=c;else data.clients.unshift(c);closeClientEditor();if(i>=0){await loadAdminModules({modules:["clients","requests","quotes","orders"],retry:true});const synced=out.synced||{};const total=Number(synced.requests||0)+Number(synced.quotes||0)+Number(synced.orders||0);toast(total?`Cliente actualizado · ${total} documento${total===1?"":"s"} sincronizado${total===1?"":"s"}`:"Cliente actualizado")}else{renderClients();toast("Cliente creado")}}catch(err){console.warn(err);const code=String(err?.message||err||"");toast(code.includes("RUT_YA_ASOCIADO")?"Ese RUT ya pertenece a otro cliente":code.includes("TELEFONO_YA_ASOCIADO")?"Ese teléfono ya pertenece a otro cliente":code.includes("RUT")?"Revisa el RUT del cliente":"No fue posible guardar el cliente")}}));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#clientEditor")?.classList.contains("hidden"))closeClientEditor()});
function exportRowsXlsx(rows,name){if(!window.XLSX)return toast("No se cargó la librería XLSX");const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Datos");XLSX.writeFile(wb,name)}
function simplePdf(title,headers,rows,name){const JsPDF=window.jspdf?.jsPDF;if(!JsPDF)return toast("No se cargó la librería PDF");const doc=new JsPDF({orientation:"landscape",unit:"mm",format:"a4"});doc.setFontSize(16);doc.text(title,14,14);doc.setFontSize(8);let y=22;const widths=[28,48,42,28,28,30,35,42];headers.forEach((h,i)=>doc.text(String(h),14+widths.slice(0,i).reduce((a,b)=>a+b,0),y));y+=6;for(const row of rows){if(y>190){doc.addPage();y=16}row.forEach((v,i)=>doc.text(String(v??"").slice(0,32),14+widths.slice(0,i).reduce((a,b)=>a+b,0),y));y+=5}doc.save(name)}
$("#exportClientsXlsx")?.addEventListener("click",()=>exportRowsXlsx((data.clients||[]).map(c=>({numero_cliente:c.numero_cliente,nombre:c.nombre,rut:c.rut?formatRutChile(c.rut):"",telefono:c.telefono,email:c.email,solicitudes:c.total_solicitudes,pedidos:c.total_pedidos,cotizaciones:c.total_cotizaciones,total_comprado:c.total_comprado,ultima_interaccion:c.ultima_interaccion})),"ALE_ATENCIO_CLIENTES.xlsx"));
$("#exportClientsPdf")?.addEventListener("click",()=>simplePdf("ALE ATENCIO · Clientes",["N.º","Cliente","RUT","Teléfono","Email","Sol.","Pedidos","Total"],(data.clients||[]).map(c=>[c.numero_cliente,c.nombre,c.rut?formatRutChile(c.rut):"",c.telefono,c.email,c.total_solicitudes,c.total_pedidos,money(c.total_comprado)]),"ALE_ATENCIO_CLIENTES.pdf"));


// ========================= R9.18.63 MAYORISTAS / REGISTRO / LISTAS DE PRECIOS =========================
const WHOLESALE_CATEGORIES=[
  {code:"MAYORISTA_GENERAL",label:"Mayorista General"},
  {code:"MAYORISTA_PREMIUM",label:"Mayorista Premium"},
  {code:"MAYORISTA_SUPERPREMIUM",label:"Mayorista Superpremium"}
];
function wholesaleCategoryCode(v){const code=String(v||"MAYORISTA_GENERAL").trim().toUpperCase();return WHOLESALE_CATEGORIES.some(x=>x.code===code)?code:"MAYORISTA_GENERAL"}
function wholesaleCategoryLabel(v){return WHOLESALE_CATEGORIES.find(x=>x.code===wholesaleCategoryCode(v))?.label||"Mayorista General"}
function wholesaleCategoryTier(v){const code=wholesaleCategoryCode(v);return code==="MAYORISTA_SUPERPREMIUM"?"superpremium":code==="MAYORISTA_PREMIUM"?"premium":"general"}
function wholesaleCrownSvg(v){const tier=wholesaleCategoryTier(v);if(tier==="superpremium")return `<svg class="wholesale-crown-icon" viewBox="0 0 64 48" aria-hidden="true"><path class="crown-main" d="M6 36 10 13l12 10L32 5l10 18 12-10 4 23H6Z"/><path class="crown-base" d="M9 36h46v7H9z"/><path class="crown-rim" d="M12 32h40"/><path class="crown-gem crown-gem-center" d="m32 14 5 6-5 6-5-6 5-6Z"/><circle class="crown-gem" cx="18" cy="26" r="3"/><circle class="crown-gem" cx="46" cy="26" r="3"/><circle class="crown-tip" cx="10" cy="11" r="3"/><circle class="crown-tip" cx="32" cy="4" r="3"/><circle class="crown-tip" cx="54" cy="11" r="3"/></svg>`;if(tier==="premium")return `<svg class="wholesale-crown-icon" viewBox="0 0 64 48" aria-hidden="true"><path class="crown-main" d="M7 36 12 14l12 12 8-19 8 19 12-12 5 22H7Z"/><path class="crown-base" d="M10 36h44v7H10z"/><circle class="crown-gem" cx="23" cy="29" r="3"/><circle class="crown-gem crown-gem-center" cx="32" cy="26" r="3.5"/><circle class="crown-gem" cx="41" cy="29" r="3"/><circle class="crown-tip" cx="12" cy="13" r="2.7"/><circle class="crown-tip" cx="32" cy="6" r="2.7"/><circle class="crown-tip" cx="52" cy="13" r="2.7"/></svg>`;return `<svg class="wholesale-crown-icon" viewBox="0 0 64 48" aria-hidden="true"><path class="crown-main" d="M9 36 14 17l13 11 5-16 5 16 13-11 5 19H9Z"/><path class="crown-base" d="M12 36h40v7H12z"/><circle class="crown-tip" cx="14" cy="16" r="2.5"/><circle class="crown-tip" cx="32" cy="11" r="2.5"/><circle class="crown-tip" cx="50" cy="16" r="2.5"/></svg>`}
function wholesaleCategoryBadge(v){const tier=wholesaleCategoryTier(v);return `<span class="wholesale-tier-badge tier-${tier}" title="${esc(wholesaleCategoryLabel(v))}">${wholesaleCrownSvg(v)}<span>${esc(wholesaleCategoryLabel(v))}</span></span>`}
function wholesaleCreditBenefit(c){return c?.credito_beneficio_activo===true||["SI","SÍ","TRUE","1","ACTIVO","ON"].includes(String(c?.credito_beneficio_activo??"").trim().toUpperCase())}
function wholesaleCategoryControl(c){const current=wholesaleCategoryCode(c.categoria_mayorista);return `<div class="wholesale-category-cell">${wholesaleCategoryBadge(current)}<select class="wholesale-category-select" data-wh-category="${esc(c.id)}" data-client-id="${esc(c.id)}" onchange="saveWholesaleBenefits(this.dataset.clientId,this)">${WHOLESALE_CATEGORIES.map(x=>`<option value="${x.code}" ${x.code===current?"selected":""}>${x.label}</option>`).join("")}</select></div>`}
function wholesaleCreditBenefitControl(c){const on=wholesaleCreditBenefit(c);return `<label class="wholesale-credit-benefit-switch" title="${on?'Desactivar':'Activar'} beneficios de crédito"><input type="checkbox" data-wh-credit="${esc(c.id)}" data-client-id="${esc(c.id)}" ${on?'checked':''} onchange="saveWholesaleBenefits(this.dataset.clientId,this)"><span class="stock-policy-slider" aria-hidden="true"></span><span class="wholesale-credit-benefit-text">${on?'Crédito activo':'Crédito oculto'}</span></label>`}
window.saveWholesaleBenefits=async(clientId,source)=>{const cat=$$('[data-wh-category]').find(x=>String(x.dataset.whCategory)===String(clientId)),sw=$$('[data-wh-credit]').find(x=>String(x.dataset.whCredit)===String(clientId));if(!cat||!sw)return;try{source&&(source.disabled=true);await AleAPI.post("adminwholesalebenefitssave",{cliente_id:clientId,categoria_mayorista:cat.value,credito_beneficio_activo:!!sw.checked},token);toast(`✓ ${wholesaleCategoryLabel(cat.value)} · crédito ${sw.checked?'habilitado':'deshabilitado'}`);await loadAdminModules({modules:["wholesale"],retry:true});renderWholesale();renderWholesaleCredits()}catch(err){console.warn(err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("CATEGORIA_MAYORISTA_INVALIDA")?"Categoría Mayorista no válida":code.includes("ACCION_NO_VALIDA")?"Debes desplegar el backend R9.18.87":"No fue posible actualizar los beneficios Mayorista");await loadAdminModules({modules:["wholesale"],retry:true}).catch(()=>{});renderWholesale()}finally{if(source)source.disabled=false}};
function renderWholesale(){
  const lists=data.priceLists||[],clients=data.wholesalers||[],users=data.wholesaleUsers||[],docs=data.wholesaleDocuments||[],requests=data.wholesaleRequests||[];fillWholesaleSelectors();
  if($("#whKpiLists"))$("#whKpiLists").textContent=lists.filter(x=>wholesaleActive(x.activo)).length;
  if($("#whKpiClients"))$("#whKpiClients").textContent=clients.length;
  if($("#whKpiRequests"))$("#whKpiRequests").textContent=requests.filter(x=>String(x.estado||'').toUpperCase()==='PENDIENTE').length;
  if($("#whKpiProfiles"))$("#whKpiProfiles").textContent=users.filter(x=>wholesaleActive(x.activo)).length;
  if($("#whKpiCreditEnabled"))$("#whKpiCreditEnabled").textContent=clients.filter(wholesaleCreditBenefit).length;
  if($("#whKpiDocs"))$("#whKpiDocs").textContent=docs.length;
  if($("#priceListsTable"))$("#priceListsTable").innerHTML=table(["Lista","Código","Estado","Productos / tamaños","Acciones"],lists.map(l=>{const count=(data.priceListItems||[]).filter(x=>String(x.lista_id)===String(l.id)&&wholesaleActive(x.activo)).length,total=(data.products||[]).reduce((n,p)=>n+(p.tamanos||[]).filter(x=>wholesaleActive(x.activo)).length,0);return `<tr><td><strong>${esc(l.nombre||"")}</strong><br><small>${esc(l.descripcion||"")}</small></td><td>${esc(l.codigo||"")}</td><td><span class="role-badge ${wholesaleActive(l.activo)?"":"inactive-badge"}">${wholesaleActive(l.activo)?"Activa":"Inactiva"}</span></td><td><strong>${count}/${total}</strong><br><small>${count>=total?'Completa':'Se completará al editar/guardar'}</small></td><td><button class="btn btn-light btn-compact" onclick="editPriceList('${esc(l.id)}')">Editar precios</button></td></tr>`}).join(""));
  if($("#wholesaleRequestsTable"))$("#wholesaleRequestsTable").innerHTML=table(["Fecha","Empresa / contacto","RUT","Usuario","Estado","Lista","Acciones"],requests.map(r=>{const l=lists.find(x=>String(x.id)===String(r.lista_precio_id));const pending=String(r.estado||'').toUpperCase()==='PENDIENTE';return `<tr><td>${esc(formatDate(r.creado_en))}</td><td><strong>${esc(r.razon_social||'')}</strong><br><small>${esc(r.contacto||'')} · ${esc(r.email||'')}</small></td><td>${esc(r.rut?formatRutChile(r.rut):'')}</td><td>@${esc(r.usuario_solicitado||'')}</td><td><span class="role-badge ${pending?'inactive-badge':''}">${esc(r.estado||'PENDIENTE')}</span></td><td>${esc(l?.nombre||'—')}</td><td>${pending?`<button class="btn btn-primary btn-compact" onclick="openWholesaleRequest('${esc(r.id)}')">Revisar</button>`:`<button class="btn btn-light btn-compact" onclick="openWholesaleRequest('${esc(r.id)}')">Ver</button>`}</td></tr>`}).join(""));
  if($("#wholesalersTable")){const host=$("#wholesalersTable");host.innerHTML=table(["Mayorista","Categoría","Nivel de compra","Estado / lista","Acceso","Beneficio crédito","Pedidos","Acciones"],clients.map(c=>{const l=lists.find(x=>String(x.id)===String(c.lista_precio_id)),u=users.find(x=>String(x.cliente_id||"")===String(c.id));const access=u?`<span class="role-badge ${wholesaleActive(u.activo)?"":"inactive-badge"}">${wholesaleActive(u.activo)?"Activo":"Inactivo"}</span><small>@${esc(u.usuario||"")}</small>`:'<span class="role-badge inactive-badge">Sin acceso</span>';const accessBtn=u?`<button type="button" class="btn btn-light btn-compact" onclick="event.stopPropagation();editWholesaleAccess('${esc(u.id)}')">Editar acceso</button>`:`<button type="button" class="btn btn-primary btn-compact" onclick="event.stopPropagation();openWholesaleProfileEditor('${esc(c.id)}')">Crear acceso</button>`;return `<tr><td class="wh-client-cell"><strong>${esc(c.razon_social||c.nombre||"")}</strong><small>${esc(c.rut?formatRutChile(c.rut):"")}${c.giro?` · ${esc(c.giro)}`:''}</small></td><td>${wholesaleCategoryControl(c)}</td><td><strong>${money(c.total_comprado||0)}</strong><small>Compra acumulada</small></td><td><strong>${esc(c.mayorista_estado||"APROBADO")}</strong><small>${esc(l?.nombre||"Sin lista")}</small></td><td>${access}</td><td>${wholesaleCreditBenefitControl(c)}</td><td class="wh-orders-cell">${Number(c.total_pedidos||0)}</td><td><div class="row-actions wh-actions"><button type="button" class="btn btn-light btn-compact" data-edit-wholesale-client="${esc(c.id)}">Editar cliente</button>${accessBtn}</div></td></tr>`}).join(""));requestAnimationFrame(()=>{host.scrollLeft=0})}
  if($("#wholesaleDocumentsTable"))$("#wholesaleDocumentsTable").innerHTML=table(["Fecha","Mayorista","Tipo","Documento","Origen","Acción"],docs.map(d=>{const c=clients.find(x=>String(x.id)===String(d.cliente_id));return `<tr><td>${esc(formatDate(d.creado_en))}</td><td>${esc(c?.razon_social||c?.nombre||d.cliente_id||"")}</td><td>${esc(d.tipo||"")}</td><td><strong>${esc(d.nombre||"")}</strong><br><small>${d.bytes?`${Math.max(1,Math.round(Number(d.bytes)/1024))} KB`:''}</small></td><td>${esc(d.origen||"")}</td><td>${d.url?`<a class="btn btn-light btn-compact" href="${esc(d.url)}" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i> Abrir</a>`:'<span class="role-badge inactive-badge">Protegido</span>'}</td></tr>`}).join(""));
}
function creditDateLabel(v){if(!v)return"—";const d=new Date(`${String(v).slice(0,10)}T12:00:00`);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString("es-CL")}
function creditTermDays(c){return Math.max(1,Math.min(365,Number(c?.plazo_pago_dias||30)||30))}
function creditSurchargePct(c){return Math.max(0,Math.min(100,Number(c?.recargo_credito_pct||0)||0))}
function creditNextDue(c){if(c&&Object.prototype.hasOwnProperty.call(c,"proximo_vencimiento"))return c.proximo_vencimiento||"";return c?.fecha_vencimiento||""}
function creditIsOverdue(c){if(c?.en_mora===true||Number(c?.pedidos_en_mora||0)>0)return true;const raw=creditNextDue(c);if(!raw||Number(c?.saldo_utilizado||0)<=0)return false;const due=new Date(`${String(raw).slice(0,10)}T23:59:59`);return !Number.isNaN(due.getTime())&&due.getTime()<Date.now()}
function wholesaleClientById(id){return (data.wholesalers||data.clients||[]).find(x=>String(x.id)===String(id))}
function wholesaleCreditByClient(id){return (data.wholesaleCredits||[]).find(x=>String(x.cliente_id)===String(id))}
function creditStarsValue(c){return Math.max(0,Math.min(5,Math.floor(Number(c?.estrellas_credito||0)||0)))}
function creditScoreValue(c){return Math.max(0,Math.min(100,Number(c?.score_crediticio||0)||0))}
function creditLevelLabel(c){const v=String(c?.nivel_crediticio||'SIN_HISTORIAL').toUpperCase();return ({EXCELENTE:'Excelente',MUY_BUENO:'Muy bueno',BUENO:'Bueno',BASICO:'Básico',EN_OBSERVACION:'En observación',SIN_HISTORIAL:'Sin historial'})[v]||v.replaceAll('_',' ')}
function creditStarsMarkup(c,{compact=false}={}){const stars=creditStarsValue(c),score=creditScoreValue(c);if(!stars)return `<span class="credit-stars credit-stars-empty" title="Aún no existen pagos suficientes para evaluar"><span class="credit-stars-icons">☆☆☆☆☆</span>${compact?'':`<small>Sin historial</small>`}</span>`;let icons='';for(let i=1;i<=5;i++)icons+=`<span class="${i<=stars?'is-on':'is-off'}">★</span>`;return `<span class="credit-stars" title="${stars} de 5 estrellas · ${score.toLocaleString('es-CL',{maximumFractionDigits:2})}/100"><span class="credit-stars-icons">${icons}</span>${compact?'':`<small>${stars}/5 · ${score.toLocaleString('es-CL',{maximumFractionDigits:2})} pts</small>`}</span>`}
function creditRecommendedLimit(c){return Math.max(Number(c?.limite_credito||0)||0,Number(c?.limite_recomendado||0)||0)}
function creditEvaluationHistory(clientId){return (data.wholesaleCreditEvaluations||[]).filter(x=>String(x.cliente_id)===String(clientId))}
function setWholesaleCreditTermFields(days){const n=Math.max(1,Math.min(365,Number(days||30)||30));if($("#whCreditTermDays"))$("#whCreditTermDays").value=String(n);if($("#whCreditTermPreset"))$("#whCreditTermPreset").value=[15,30,45].includes(n)?String(n):"CUSTOM"}
// R9.18.97 · acciones delegadas de la tabla Mayoristas. Evita depender de onclick inline.
$("#wholesalersTable")?.addEventListener("click",e=>{const btn=e.target.closest?.("[data-edit-wholesale-client]");if(!btn)return;e.preventDefault();e.stopPropagation();openClientEditor(btn.dataset.editWholesaleClient||"")});

function renderWholesaleCreditClientSummary(clientId,targetId){const host=$(targetId);if(!host)return;const c=wholesaleCreditByClient(clientId),client=wholesaleClientById(clientId);if(!clientId||!client){host.innerHTML='Selecciona un Mayorista para ver su situación actual.';return}const category=wholesaleCategoryLabel(client.categoria_mayorista),benefit=wholesaleCreditBenefit(client)?'Beneficio de crédito habilitado':'Beneficio de crédito desactivado';if(!c){host.innerHTML=`<strong>${esc(client.razon_social||client.nombre||'Mayorista')}</strong><span>${esc(category)} · ${esc(benefit)} · Sin línea de crédito asignada.</span>`;return}const due=creditNextDue(c),mora=creditIsOverdue(c),pct=creditSurchargePct(c),recommended=creditRecommendedLimit(c),delta=Math.max(0,recommended-Number(c.limite_credito||0));host.innerHTML=`<strong>${esc(client.razon_social||client.nombre||'Mayorista')}</strong><span>${esc(category)} · ${esc(benefit)}</span><span>Límite: ${money(c.limite_credito)} · Disponible: ${money(c.saldo_disponible)} · Utilizado: ${money(c.saldo_utilizado)}</span><span>Plazo por compra: ${creditTermDays(c)} días · Recargo: ${pct.toLocaleString('es-CL',{maximumFractionDigits:2})}%${due?` · Próximo vencimiento: ${esc(creditDateLabel(due))}`:''}${mora?` · <b>EN MORA${Number(c.saldo_vencido||0)>0?` ${money(c.saldo_vencido)}`:''}</b>`:''}</span><span class="credit-summary-rating">${creditStarsMarkup(c,{compact:true})}<b>${esc(creditLevelLabel(c))}</b>${creditStarsValue(c)?` · Puntualidad ${Number(c.porcentaje_puntualidad||0).toLocaleString('es-CL',{maximumFractionDigits:1})}%`:''}</span>`}
function renderWholesaleCredits(){
  renderWholesaleCreditPaymentsAdmin().catch(err=>console.warn("wholesale credit payments",err));
  fillWholesaleSelectors();
  const credits=data.wholesaleCredits||[],moves=data.wholesaleCreditMovements||[],clients=data.wholesalers||[],evaluations=data.wholesaleCreditEvaluations||[];
  const limit=credits.reduce((a,x)=>a+Number(x.limite_credito||0),0),available=credits.reduce((a,x)=>a+Number(x.saldo_disponible||0),0),used=credits.reduce((a,x)=>a+Number(x.saldo_utilizado||0),0),overdue=credits.filter(creditIsOverdue).length;
  if($("#whCreditKpiLimit"))$("#whCreditKpiLimit").textContent=money(limit);if($("#whCreditKpiAvailable"))$("#whCreditKpiAvailable").textContent=money(available);if($("#whCreditKpiUsed"))$("#whCreditKpiUsed").textContent=money(used);if($("#whCreditKpiOverdue"))$("#whCreditKpiOverdue").textContent=String(overdue);
  if($("#wholesaleCreditsTable")){const host=$("#wholesaleCreditsTable");host.innerHTML=table(["Mayorista","Límite","Disponible","Utilizado","Condiciones","Vencimiento / estado","Acciones"],credits.map(c=>{const client=clients.find(x=>String(x.id)===String(c.cliente_id)),benefit=wholesaleCreditBenefit(client),mora=creditIsOverdue(c),status=!benefit?'Beneficio OFF':!wholesaleActive(c.activo)?'Suspendido':mora?'EN MORA':'Al día',due=creditNextDue(c),pct=creditSurchargePct(c),recommended=creditRecommendedLimit(c),delta=Math.max(0,recommended-Number(c.limite_credito||0));return `<tr class="${mora?'credit-row-overdue':''}"><td class="credit-client-cell"><strong>${esc(client?.razon_social||client?.nombre||c.cliente_id||'')}</strong><small>${esc(client?.rut?formatRutChile(client.rut):'')}</small>${wholesaleCategoryBadge(client?.categoria_mayorista)}<div class="credit-table-rating">${creditStarsMarkup(c,{compact:true})}<small>${esc(creditLevelLabel(c))}</small></div></td><td class="credit-money">${money(c.limite_credito)}</td><td class="credit-money"><strong>${money(c.saldo_disponible)}</strong></td><td class="credit-money">${money(c.saldo_utilizado)}${Number(c.saldo_vencido||0)>0?`<small>Vencido: ${money(c.saldo_vencido)}</small>`:''}</td><td class="credit-conditions"><strong>${creditTermDays(c)} días</strong><small>${[15,30,45].includes(creditTermDays(c))?'Plazo estándar':'Plazo personalizado'}</small><span>${pct.toLocaleString('es-CL',{maximumFractionDigits:2})}% recargo</span></td><td class="credit-status-cell">${due?`<strong>${esc(creditDateLabel(due))}</strong><small>${mora?'Vencido':'Próximo vencimiento'}</small>`:'<strong>Sin deuda</strong>'}<span class="role-badge ${status==='Al día'?'':'inactive-badge'}">${esc(status)}</span>${mora&&Number(c.pedidos_en_mora||0)>0?`<small>${Number(c.pedidos_en_mora)} pedido(s) en mora</small>`:''}</td><td><div class="row-actions credit-row-actions"><button type="button" class="btn btn-light btn-compact" onclick="editWholesaleCredit('${esc(c.cliente_id)}')">Configurar</button><button type="button" class="btn btn-light btn-compact" onclick="prepareWholesaleCreditIncrease('${esc(c.cliente_id)}')">Aumentar cupo</button><button type="button" class="btn btn-light btn-compact" onclick="prepareWholesaleCreditPayment('${esc(c.cliente_id)}')">Registrar abono</button></div></td></tr>`}).join(""));requestAnimationFrame(()=>{host.scrollLeft=0})}
  if($("#wholesaleCreditRatings")){const host=$("#wholesaleCreditRatings");if(!credits.length)host.innerHTML='<div class="empty-state">No existen líneas de crédito para evaluar.</div>';else host.innerHTML=credits.map(c=>{const client=clients.find(x=>String(x.id)===String(c.cliente_id)),stars=creditStarsValue(c),score=creditScoreValue(c),recommended=creditRecommendedLimit(c),current=Number(c.limite_credito||0),delta=Math.max(0,recommended-current),mora=creditIsOverdue(c),hist=evaluations.filter(x=>String(x.cliente_id)===String(c.cliente_id)),last=hist[0],punctual=Number(c.porcentaje_puntualidad||0),evaluated=Number(c.pagos_evaluados||0),completed=Number(c.pagos_completados_credito||0),onTime=Number(c.pagos_puntuales||0),late=Number(c.pagos_atrasados||0),avgLate=Number(c.dias_atraso_promedio||0),detail=c.evaluacion_credito_detalle&&typeof c.evaluacion_credito_detalle==='object'?c.evaluacion_credito_detalle:{},cycle=Math.max(0,Number(detail.pagos_nuevos_desde_ultimo_ajuste||0)||0);let reason='Aún no existen pagos de crédito evaluables.';if(mora)reason='Existe deuda vencida. El cupo recomendado se mantiene hasta regularizar la mora.';else if(completed>0&&completed<3)reason='Historial en formación. Se requieren al menos 3 pagos completados antes de recomendar un aumento.';else if(delta>0)reason='El historial crediticio base es favorable. Usa “Evaluar aumento de cupo” para incorporar frecuencia de compras y calcular el valor definitivo.';else if(completed>=3&&cycle<3)reason=`Ciclo de mejora en curso: ${Math.min(3,cycle)}/3 pagos nuevos completados desde el último ajuste. Atraso promedio: ${avgLate.toLocaleString('es-CL',{maximumFractionDigits:1})} días.`;else if(stars>0)reason='La evaluación actual mantiene el límite vigente sin aumento recomendado.';return `<article class="credit-rating-item ${mora?'is-overdue':''}"><div class="credit-rating-head"><div><span class="credit-rating-name">${esc(client?.razon_social||client?.nombre||c.cliente_id||'Mayorista')}</span><small>${esc(client?.rut?formatRutChile(client.rut):'')} · ${esc(wholesaleCategoryLabel(client?.categoria_mayorista))}</small></div><span class="credit-level-badge level-${stars}">${esc(creditLevelLabel(c))}</span></div><div class="credit-rating-score">${creditStarsMarkup(c)}<strong>${stars?`${score.toLocaleString('es-CL',{maximumFractionDigits:2})}/100`:'—'}</strong></div><div class="credit-rating-metrics"><div><span>Puntualidad</span><strong>${evaluated?`${punctual.toLocaleString('es-CL',{maximumFractionDigits:1})}%`:'—'}</strong></div><div><span>Pagos puntuales</span><strong>${onTime}/${evaluated}</strong></div><div><span>Atrasados / mora</span><strong>${late}</strong></div><div><span>Ciclo de aumento</span><strong>${completed>=3?`${Math.min(3,cycle)}/3`:`${completed}/3`}</strong></div></div><div class="credit-rating-limits"><div><span>Límite actual</span><strong>${money(current)}</strong></div><div><span>Aumento de cupo</span><strong>Evaluar</strong></div></div><p class="credit-rating-reason">${esc(reason)}</p><div class="credit-rating-foot"><small>${hist.length?`Historial: ${hist.length} evaluación(es) · última ${esc(formatDate(last?.generado_en))}`:`Evaluación actual · ${c.evaluacion_credito_en?esc(formatDate(c.evaluacion_credito_en)):'sin snapshot aún'}`}</small><div class="row-actions"><button class="btn btn-primary btn-compact" type="button" onclick="prepareWholesaleCreditIncrease('${esc(c.cliente_id)}')">Evaluar aumento de cupo</button></div></div></article>`}).join('')}
  if($("#wholesaleCreditMovementsTable")){const host=$("#wholesaleCreditMovementsTable");host.innerHTML=table(["Fecha","Mayorista","Movimiento","Monto","Disponible","Utilizado","Referencia"],moves.map(m=>{const client=clients.find(x=>String(x.id)===String(m.cliente_id)),raw=m.creado_en,d=new Date(raw),valid=!Number.isNaN(d.getTime()),day=valid?d.toLocaleDateString("es-CL"):String(raw||"—"),time=valid?d.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit",second:"2-digit"}):"";return `<tr><td class="credit-movement-date"><span class="credit-date-day">${esc(day)}</span>${time?`<small class="credit-date-time">${esc(time)}</small>`:""}</td><td class="credit-movement-client"><strong>${esc(client?.razon_social||client?.nombre||m.cliente_id||'')}</strong></td><td class="credit-movement-type"><span class="role-badge">${esc(m.tipo||'')}</span></td><td class="credit-money">${money(m.monto)}</td><td class="credit-money">${money(m.saldo_disponible_resultante)}</td><td class="credit-money">${money(m.saldo_utilizado_resultante)}</td><td class="credit-reference">${esc(m.referencia||m.detalle||'—')}</td></tr>`}).join(""));requestAnimationFrame(()=>{host.scrollLeft=0})}
}
window.applyWholesaleCreditRecommendation=(id,source)=>busy(source,async()=>{try{const c=wholesaleCreditByClient(id);if(!c)return toast('Línea de crédito no encontrada');const current=Number(c.limite_credito||0),recommended=creditRecommendedLimit(c),delta=Math.max(0,recommended-current),stars=creditStarsValue(c),score=creditScoreValue(c);if(creditIsOverdue(c))return toast('No se puede aplicar un aumento recomendado mientras exista mora');if(Number(c.pagos_completados_credito||0)<3)return toast('Se requieren al menos 3 pagos completados para recomendar un aumento');if(!(delta>0))return toast('El límite actual ya coincide con la recomendación');if(!confirm(`¿Aumentar el límite de ${money(current)} a ${money(recommended)} según evaluación de ${stars} estrella(s)?`))return;await AleAPI.post('adminwholesalecreditincrease',{cliente_id:id,aumento:delta,referencia:`Evaluación crediticia ${stars}/5 · ${score.toLocaleString('es-CL',{maximumFractionDigits:2})} puntos · límite recomendado`},token);toast(`✓ Límite recomendado aplicado · ${money(recommended)}`);await loadAdminModules({modules:['wholesale'],retry:true});renderWholesaleCredits();renderWholesale()}catch(err){console.warn(err);toast(`✕ No fue posible aplicar el límite recomendado · ${String(err?.message||err||'')}`)}});

function clearWholesaleCreditForm(){if($("#whCreditClient"))$("#whCreditClient").value="";if($("#whCreditLimit"))$("#whCreditLimit").value="";if($("#whCreditAssigned"))$("#whCreditAssigned").value=new Date().toISOString().slice(0,10);setWholesaleCreditTermFields(30);if($("#whCreditSurchargePct"))$("#whCreditSurchargePct").value="0";if($("#whCreditMoraNotice"))$("#whCreditMoraNotice").value="SI";if($("#whCreditMoraBlock"))$("#whCreditMoraBlock").value="SI";if($("#whCreditActive"))$("#whCreditActive").value="SI";if($("#whCreditNotes"))$("#whCreditNotes").value="";renderWholesaleCreditClientSummary("","#whCreditLiveSummary")}
const WHOLESALE_CREDIT_MODALS={line:"wholesaleCreditEditor",payment:"wholesaleCreditPaymentEditor",increase:"wholesaleCreditIncreaseEditor"};
function closeWholesaleCreditModal(type){const id=WHOLESALE_CREDIT_MODALS[type];if(id)$("#"+id)?.classList.add("hidden");if(!Object.values(WHOLESALE_CREDIT_MODALS).some(x=>!$("#"+x)?.classList.contains("hidden")))document.body.classList.remove("credit-modal-open")}
function closeAllWholesaleCreditModals(){Object.keys(WHOLESALE_CREDIT_MODALS).forEach(closeWholesaleCreditModal);document.body.classList.remove("credit-modal-open")}
function openWholesaleCreditModal(type){const id=WHOLESALE_CREDIT_MODALS[type];if(!id)return;Object.entries(WHOLESALE_CREDIT_MODALS).forEach(([key,modalId])=>{if(key!==type)$("#"+modalId)?.classList.add("hidden")});$("#"+id)?.classList.remove("hidden");document.body.classList.add("credit-modal-open");requestAnimationFrame(()=>{const focusId=type==="line"?"#whCreditClient":type==="payment"?"#whCreditPaymentClient":"#whCreditIncreaseClient";$(focusId)?.focus()})}
function populateWholesaleCreditForm(id){const c=wholesaleCreditByClient(id);$("#whCreditLimit").value=c?formatClpEditable(c.limite_credito):"0";$("#whCreditAssigned").value=c?.fecha_asignacion?String(c.fecha_asignacion).slice(0,10):new Date().toISOString().slice(0,10);setWholesaleCreditTermFields(c?.plazo_pago_dias||30);$("#whCreditSurchargePct").value=String(creditSurchargePct(c));$("#whCreditMoraNotice").value=(c?.avisar_mora===false||String(c?.avisar_mora).toUpperCase()==='NO')?"NO":"SI";$("#whCreditMoraBlock").value=(c?.bloquear_en_mora===false||String(c?.bloquear_en_mora).toUpperCase()==='NO')?"NO":"SI";$("#whCreditActive").value=wholesaleActive(c?.activo??true)?"SI":"NO";$("#whCreditNotes").value=c?.observaciones||""}
window.editWholesaleCredit=id=>{openAdminView("wholesale-credits");$("#whCreditClient").value=id;populateWholesaleCreditForm(id);renderWholesaleCreditClientSummary(id,"#whCreditLiveSummary");openWholesaleCreditModal("line")}
window.prepareWholesaleCreditPayment=id=>{openAdminView("wholesale-credits");$("#whCreditPaymentClient").value=id;renderWholesaleCreditClientSummary(id,"#whCreditPaymentSummary");openWholesaleCreditModal("payment");requestAnimationFrame(()=>$("#whCreditPaymentAmount")?.focus())}
function clearWholesaleCreditIncreaseEvaluation({clearAmount=false}={}){const host=$("#whCreditIncreaseEvaluation");if(host){host.classList.add("is-empty");host.classList.remove("is-approved","is-denied");host.innerHTML='<span class="credit-evaluation-placeholder">Pulsa “Evaluar aumento de cupo” para obtener una recomendación.</span>'}if(clearAmount){if($("#whCreditIncreaseAmount"))$("#whCreditIncreaseAmount").value="";if($("#whCreditIncreaseRef"))$("#whCreditIncreaseRef").value=""}}
function renderWholesaleCreditIncreaseEvaluation(out){const host=$("#whCreditIncreaseEvaluation");if(!host)return;const eligible=!!out?.elegible,score=Math.max(0,Math.min(100,Number(out?.score_aumento||0)||0)),punctual=Number(out?.puntualidad_pct||0)||0,purchases90=Number(out?.compras_90_dias||0)||0,purchases180=Number(out?.compras_180_dias||0)||0,paid=Number(out?.pagos_completados||0)||0,newPayments=Number(out?.pagos_nuevos_desde_ultimo_ajuste||0)||0,current=Number(out?.limite_actual||0)||0,increase=Math.max(0,Number(out?.aumento_sugerido||0)||0),suggested=Math.max(current,Number(out?.limite_sugerido||current)||current),monthly=Number(out?.promedio_mensual_90_dias||0)||0,reason=String(out?.motivo||'Evaluación completada');host.classList.remove("is-empty","is-approved","is-denied");host.classList.add(eligible&&increase>0?"is-approved":"is-denied");host.innerHTML=`<div class="credit-increase-eval-head"><div><span>Resultado de evaluación</span><strong>${eligible&&increase>0?'Aumento recomendado':'Mantener cupo actual'}</strong></div><div class="credit-increase-score"><b>${score.toLocaleString('es-CL',{maximumFractionDigits:1})}</b><small>/100</small></div></div><div class="credit-increase-eval-metrics"><div><span>Puntualidad</span><strong>${punctual.toLocaleString('es-CL',{maximumFractionDigits:1})}%</strong></div><div><span>Compras 90 días</span><strong>${purchases90}</strong></div><div><span>Pagos completados</span><strong>${paid}</strong></div><div><span>Ciclo nuevo</span><strong>${Math.min(3,newPayments)}/3</strong></div></div><div class="credit-increase-eval-commercial"><span>Actividad comercial</span><strong>${money(monthly)} promedio mensual · ${purchases180} compra(s) en 180 días</strong></div><div class="credit-increase-eval-limits"><div><span>Cupo actual</span><strong>${money(current)}</strong></div><div class="${increase>0?'recommended':''}"><span>Aumento sugerido</span><strong>${increase>0?`+${money(increase)}`:'$0'}</strong></div><div class="${increase>0?'recommended':''}"><span>Nuevo cupo sugerido</span><strong>${money(suggested)}</strong></div></div><p>${esc(reason)}</p>`;if(increase>0){$("#whCreditIncreaseAmount").value=formatClpEditable(increase);$("#whCreditIncreaseRef").value=`Evaluación automática de aumento de cupo · score ${score.toLocaleString('es-CL',{maximumFractionDigits:1})}/100 · ${purchases90} compras/90d · puntualidad ${punctual.toLocaleString('es-CL',{maximumFractionDigits:1})}%`}}
window.prepareWholesaleCreditIncrease=id=>{openAdminView("wholesale-credits");$("#whCreditIncreaseClient").value=id;clearWholesaleCreditIncreaseEvaluation({clearAmount:true});renderWholesaleCreditClientSummary(id,"#whCreditIncreaseSummary");openWholesaleCreditModal("increase");requestAnimationFrame(()=>$("#evaluateWholesaleCreditIncrease")?.focus())}
$("#whCreditClient")?.addEventListener("change",e=>{const id=e.currentTarget.value;if(id)populateWholesaleCreditForm(id);else clearWholesaleCreditForm();renderWholesaleCreditClientSummary(id,"#whCreditLiveSummary")});
$("#whCreditTermPreset")?.addEventListener("change",e=>{const v=e.currentTarget.value;if(v!=="CUSTOM")setWholesaleCreditTermFields(Number(v));else $("#whCreditTermDays")?.focus()});
$("#whCreditTermDays")?.addEventListener("input",e=>{const n=Math.max(1,Math.min(365,Number(e.currentTarget.value||30)||30));if($("#whCreditTermPreset"))$("#whCreditTermPreset").value=[15,30,45].includes(n)?String(n):"CUSTOM"});
$("#whCreditPaymentClient")?.addEventListener("change",e=>renderWholesaleCreditClientSummary(e.currentTarget.value,"#whCreditPaymentSummary"));
$("#whCreditIncreaseClient")?.addEventListener("change",e=>{clearWholesaleCreditIncreaseEvaluation({clearAmount:true});renderWholesaleCreditClientSummary(e.currentTarget.value,"#whCreditIncreaseSummary")});
$("#openWholesaleCreditEditor")?.addEventListener("click",()=>{clearWholesaleCreditForm();openWholesaleCreditModal("line")});
$("#openWholesaleCreditPaymentEditor")?.addEventListener("click",()=>{$("#whCreditPaymentClient").value="";$("#whCreditPaymentAmount").value="";$("#whCreditPaymentRef").value="";renderWholesaleCreditClientSummary("","#whCreditPaymentSummary");openWholesaleCreditModal("payment")});
$("#openWholesaleCreditIncreaseEditor")?.addEventListener("click",()=>{$("#whCreditIncreaseClient").value="";clearWholesaleCreditIncreaseEvaluation({clearAmount:true});renderWholesaleCreditClientSummary("","#whCreditIncreaseSummary");openWholesaleCreditModal("increase")});
$("#closeWholesaleCreditEditor")?.addEventListener("click",()=>closeWholesaleCreditModal("line"));
$("#cancelWholesaleCreditEditor")?.addEventListener("click",()=>closeWholesaleCreditModal("line"));
$("#closeWholesaleCreditPaymentEditor")?.addEventListener("click",()=>closeWholesaleCreditModal("payment"));
$("#cancelWholesaleCreditPaymentEditor")?.addEventListener("click",()=>closeWholesaleCreditModal("payment"));
$("#closeWholesaleCreditIncreaseEditor")?.addEventListener("click",()=>closeWholesaleCreditModal("increase"));
$("#cancelWholesaleCreditIncreaseEditor")?.addEventListener("click",()=>closeWholesaleCreditModal("increase"));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&Object.values(WHOLESALE_CREDIT_MODALS).some(id=>!$("#"+id)?.classList.contains("hidden")))closeAllWholesaleCreditModals()});
$("#clearWholesaleCredit")?.addEventListener("click",clearWholesaleCreditForm);
$("#saveWholesaleCredit")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const cliente_id=$("#whCreditClient").value;if(!cliente_id)return toast("Selecciona un Mayorista");const limite_credito=parseClpAmount($("#whCreditLimit").value);if(limite_credito<0)return toast("El límite no puede ser negativo");const fecha_asignacion=$("#whCreditAssigned").value||new Date().toISOString().slice(0,10),plazo_pago_dias=Math.max(1,Math.min(365,Number($("#whCreditTermDays").value||30)||30)),recargo_credito_pct=Math.max(0,Math.min(100,Number(String($("#whCreditSurchargePct").value||"0").replace(",","."))||0));await AleAPI.post("adminwholesalecreditsave",{cliente_id,limite_credito,fecha_asignacion,plazo_pago_dias,recargo_credito_pct,avisar_mora:$("#whCreditMoraNotice").value,bloquear_en_mora:$("#whCreditMoraBlock").value,activo:$("#whCreditActive").value,observaciones:$("#whCreditNotes").value.trim()},token);toast(`✓ Línea actualizada · ${plazo_pago_dias} días · recargo ${recargo_credito_pct.toLocaleString('es-CL',{maximumFractionDigits:2})}%`);closeWholesaleCreditModal("line");await loadAdminModules({modules:["wholesale"],retry:true});renderWholesaleCredits()}catch(err){console.warn(err);const c=String(err?.message||err||"").toUpperCase();toast(c.includes("PLAZO_CREDITO_INVALIDO")?"El plazo debe estar entre 1 y 365 días":c.includes("RECARGO_CREDITO_INVALIDO")?"El recargo debe estar entre 0% y 100%":`✕ No fue posible guardar la línea · ${c}`)}}));
$("#registerWholesaleCreditPayment")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const cliente_id=$("#whCreditPaymentClient").value,monto=parseClpAmount($("#whCreditPaymentAmount").value);if(!cliente_id)return toast("Selecciona un Mayorista");if(!(monto>0))return toast("Ingresa un monto válido");await AleAPI.post("adminwholesalecreditpayment",{cliente_id,monto,referencia:$("#whCreditPaymentRef").value.trim()},token);toast("✓ Abono registrado · saldo de crédito liberado");$("#whCreditPaymentAmount").value="";$("#whCreditPaymentRef").value="";closeWholesaleCreditModal("payment");await loadAdminModules({modules:["wholesale"],retry:true});renderWholesaleCredits();renderWholesaleCreditClientSummary(cliente_id,"#whCreditPaymentSummary")}catch(err){console.warn(err);const c=String(err?.message||err||"").toUpperCase();toast(c.includes("CREDITO_SIN_DEUDA")?"Ese Mayorista no tiene deuda pendiente":c.includes("CREDITO_NO_ASIGNADO")?"Ese Mayorista no tiene línea de crédito":`✕ No fue posible registrar el abono · ${c}`)}}));
$("#evaluateWholesaleCreditIncrease")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const cliente_id=$("#whCreditIncreaseClient").value;if(!cliente_id)return toast("Selecciona un Mayorista antes de evaluar");const out=await AleAPI.post("adminwholesalecreditevaluateincrease",{cliente_id},token);renderWholesaleCreditIncreaseEvaluation(out);const suggested=Math.max(0,Number(out?.aumento_sugerido||0)||0);toast(suggested>0?`✓ Evaluación lista · aumento sugerido ${money(suggested)}`:"Evaluación lista · por ahora se recomienda mantener el cupo actual");await loadAdminModules({modules:["wholesale"],retry:true});renderWholesaleCredits()}catch(err){console.warn(err);const c=String(err?.message||err||"").toUpperCase();clearWholesaleCreditIncreaseEvaluation();toast(c.includes("CREDITO_NO_ASIGNADO")?"Primero debes asignar una línea de crédito a este Mayorista":c.includes("FUNCTION")||c.includes("PGRST202")?"Debes ejecutar el SQL R9.18.96 y desplegar la Edge Function R9.18.96":`✕ No fue posible evaluar el aumento de cupo · ${c}`)}}),"Evaluando…");
$("#increaseWholesaleCreditLimit")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const cliente_id=$("#whCreditIncreaseClient").value,aumento=parseClpAmount($("#whCreditIncreaseAmount").value),referencia=$("#whCreditIncreaseRef").value.trim();if(!cliente_id)return toast("Selecciona un Mayorista");if(!(aumento>0))return toast("Ingresa un aumento de límite válido");const out=await AleAPI.post("adminwholesalecreditincrease",{cliente_id,aumento,referencia},token);toast(`✓ Cupo aumentado en ${money(aumento)} · nuevo cupo ${money(out?.limite_credito||0)}`);$("#whCreditIncreaseAmount").value="";$("#whCreditIncreaseRef").value="";closeWholesaleCreditModal("increase");await loadAdminModules({modules:["wholesale"],retry:true});renderWholesaleCredits();renderWholesaleCreditClientSummary(cliente_id,"#whCreditIncreaseSummary")}catch(err){console.warn(err);const c=String(err?.message||err||"").toUpperCase();toast(c.includes("CREDITO_NO_ASIGNADO")?"Primero debes asignar una línea de crédito a este Mayorista":c.includes("AUMENTO_LIMITE_INVALIDO")?"El aumento debe ser mayor que cero":`✕ No fue posible aumentar el límite · ${c}`)}}));
$("#refreshWholesaleCredits")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{await loadAdminModules({modules:["wholesale"],retry:true});renderWholesaleCredits();renderWholesale()},"Actualizando…"));

function fillWholesaleRequestPriceLists(selected=""){const sel=$("#wrPriceList");if(!sel)return;const lists=(data.priceLists||[]).filter(x=>wholesaleActive(x.activo));sel.innerHTML='<option value="">Seleccionar lista activa</option>'+lists.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(selected)?"selected":""}>${esc(x.nombre||x.codigo||x.id)}</option>`).join("")}
window.openWholesaleRequest=id=>{const r=(data.wholesaleRequests||[]).find(x=>String(x.id)===String(id));if(!r)return;$("#wrId").value=r.id;$("#wrTitle").textContent=`${r.estado||'PENDIENTE'} · ${r.razon_social||r.contacto||'Solicitud Mayorista'}`;$("#wrDetail").innerHTML=`<div class="wholesale-request-grid"><div><span>Empresa</span><strong>${esc(r.razon_social||'')}</strong></div><div><span>RUT</span><strong>${esc(r.rut?formatRutChile(r.rut):'')}</strong></div><div><span>Contacto</span><strong>${esc(r.contacto||'')}</strong></div><div><span>Correo</span><strong>${esc(r.email||'')}</strong></div><div><span>Teléfono</span><strong>${esc(r.telefono||'')}</strong></div><div><span>Usuario solicitado</span><strong>@${esc(r.usuario_solicitado||'')}</strong></div><div><span>Giro</span><strong>${esc(r.giro||'—')}</strong></div><div><span>Comuna</span><strong>${esc(r.comuna||'—')}</strong></div><div class="span-2"><span>Observaciones</span><strong>${esc(r.observaciones||'—')}</strong></div>${r.motivo_rechazo?`<div class="span-2"><span>Motivo rechazo</span><strong>${esc(r.motivo_rechazo)}</strong></div>`:''}</div>`;fillWholesaleRequestPriceLists(r.lista_precio_id||'');$("#wrRejectReason").value=r.motivo_rechazo||'';const pending=String(r.estado||'').toUpperCase()==='PENDIENTE';$("#approveWholesaleRequest").classList.toggle('hidden',!pending);$("#rejectWholesaleRequest").classList.toggle('hidden',!pending);$("#wrPriceList").disabled=!pending;$("#wrRejectReason").disabled=!pending;$("#wholesaleRequestEditor").classList.remove('hidden')};
function closeWholesaleRequestEditor(){$("#wholesaleRequestEditor")?.classList.add('hidden')}
$("#closeWholesaleRequestEditor")?.addEventListener('click',closeWholesaleRequestEditor);$("#cancelWholesaleRequest")?.addEventListener('click',closeWholesaleRequestEditor);
$("#approveWholesaleRequest")?.addEventListener('click',e=>busy(e.currentTarget,async()=>{try{const id=$("#wrId").value,lista=$("#wrPriceList").value;if(!lista){toast('Selecciona una lista de precios activa');return}await AleAPI.post('adminwholesalerequestdecision',{id,accion:'APROBAR',lista_precio_id:lista},token);toast('✓ Solicitud aprobada · usuario Mayorista activado');closeWholesaleRequestEditor();await loadAdminModules({modules:['clients','users','wholesale'],retry:true});openAdminView('wholesale')}catch(err){console.warn(err);const c=String(err?.message||err||'');toast(c.includes('ACCION_NO_VALIDA')?'El backend R9.18.63 aún no está desplegado':`No fue posible aprobar · ${c}`)}}));
$("#rejectWholesaleRequest")?.addEventListener('click',e=>busy(e.currentTarget,async()=>{try{const id=$("#wrId").value,motivo=$("#wrRejectReason").value.trim();if(!confirm('¿Rechazar esta solicitud Mayorista?'))return;await AleAPI.post('adminwholesalerequestdecision',{id,accion:'RECHAZAR',motivo},token);toast('Solicitud Mayorista rechazada');closeWholesaleRequestEditor();await loadAdminModules({modules:['wholesale'],retry:true})}catch(err){console.warn(err);toast('No fue posible rechazar la solicitud')}}));
function currentPriceListItems(listId){const map=new Map();for(const x of data.priceListItems||[])if(String(x.lista_id)===String(listId))map.set(`${x.producto_id}|${x.tamano_id}`,x);return map}
function priceListCatalogRows(listId=""){
  const map=currentPriceListItems(listId),rows=[];
  for(const p of data.products||[]){
    const category=String(p.categoria_nombre||p.categoria||"Sin categoría");
    const sizes=(p.tamanos||[]).filter(x=>wholesaleActive(x.activo));
    for(const z of sizes){
      const it=map.get(`${p.id}|${z.id}`),normal=Number(z.precio||0),value=it!==undefined?Number(it.precio||0):normal;
      rows.push(`<tr data-product-id="${esc(p.id)}" data-size-id="${esc(z.id)}" data-name="${esc(String(p.nombre||'').toLowerCase())}" data-size="${esc(String(z.nombre||'').toLowerCase())}" data-category="${esc(category.toLowerCase())}"><td><strong>${esc(p.nombre)}</strong><br><small>${esc(category)}</small></td><td>${esc(z.nombre)}</td><td>${money(normal)}</td><td><input class="plItemPrice" type="text" inputmode="numeric" value="${esc(new Intl.NumberFormat('es-CL',{maximumFractionDigits:0}).format(value))}" data-default-price="${normal}"></td></tr>`);
    }
  }
  return rows;
}
function applyPriceListFilters(){
  const q=String($("#plSearch")?.value||"").trim().toLowerCase(),cat=String($("#plCategory")?.value||"").toLowerCase();let shown=0,total=0;
  $$("#priceListItemsEditor tr[data-product-id]").forEach(tr=>{total++;const hit=(!q||`${tr.dataset.name||''} ${tr.dataset.size||''}`.includes(q))&&(!cat||String(tr.dataset.category||'')===cat);tr.classList.toggle('pl-hidden',!hit);if(hit)shown++});
  if($("#plSummary"))$("#plSummary").innerHTML=`<strong>${shown}</strong> de <strong>${total}</strong> producto/tamaño visibles · todos forman parte de la lista · <span class="price-list-scroll-hint">Desplázate dentro de la tabla para verlos todos</span>`;
}
function fillPriceListCategories(){const sel=$("#plCategory");if(!sel)return;const cats=[...new Set((data.products||[]).map(p=>String(p.categoria_nombre||p.categoria||"Sin categoría")).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));sel.innerHTML='<option value="">Todas las categorías</option>'+cats.map(c=>`<option value="${esc(c.toLowerCase())}">${esc(c)}</option>`).join('')}
function openPriceListEditor(id=""){
  const l=id?(data.priceLists||[]).find(x=>String(x.id)===String(id)):null;$("#plId").value=l?.id||"";$("#plName").value=l?.nombre||"";$("#plCode").value=l?.codigo||"";$("#plDescription").value=l?.descripcion||"";$("#plActive").value=wholesaleActive(l?.activo??true)?"SI":"NO";$("#priceListEditorTitle").textContent=l?`Editar ${l.nombre}`:"Nueva lista";fillPriceListCategories();if($("#plSearch"))$("#plSearch").value='';if($("#plCategory"))$("#plCategory").value='';const rows=priceListCatalogRows(l?.id||"");$("#priceListItemsEditor").innerHTML=table(["Producto","Tamaño","Precio normal","Precio lista"],rows.join(""));applyPriceListFilters();$("#priceListEditor").classList.remove("hidden");
}
window.editPriceList=id=>openPriceListEditor(id);$("#newPriceList")?.addEventListener("click",()=>openPriceListEditor());function closePriceListEditor(){$("#priceListEditor")?.classList.add("hidden")}$("#closePriceListEditor")?.addEventListener("click",closePriceListEditor);$("#cancelPriceList")?.addEventListener("click",closePriceListEditor);$("#plSearch")?.addEventListener('input',applyPriceListFilters);$("#plCategory")?.addEventListener('change',applyPriceListFilters);$("#plResetFilters")?.addEventListener('click',()=>{if($("#plSearch"))$("#plSearch").value='';if($("#plCategory"))$("#plCategory").value='';applyPriceListFilters()});
$("#savePriceList")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const name=$("#plName").value.trim();if(!name)throw new Error("LISTA_NOMBRE_REQUERIDO");const items=$$("#priceListItemsEditor tr[data-product-id]").map(tr=>{const input=tr.querySelector('.plItemPrice'),raw=input?.value.trim()||"",fallback=Number(input?.dataset.defaultPrice||0),price=raw?parseClpAmount(raw):fallback;return{producto_id:tr.dataset.productId,tamano_id:tr.dataset.sizeId,precio:price,activo:true}});await AleAPI.post("savepricelist",{id:$("#plId").value||undefined,nombre:name,codigo:$("#plCode").value.trim(),descripcion:$("#plDescription").value.trim(),activo:$("#plActive").value,items},token);toast(`✓ Lista guardada · ${items.length} producto/tamaño incluidos`);closePriceListEditor();await loadAdminModules({modules:["wholesale"],retry:true})}catch(err){console.warn(err);toast("✕ No fue posible guardar la lista")}}));
function fillWholesaleProfilePriceLists(selected=""){const sel=$("#wmPriceList");if(!sel)return;const lists=(data.priceLists||[]).filter(x=>wholesaleActive(x.activo));sel.innerHTML='<option value="">Sin lista por ahora · acceso pendiente</option>'+lists.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(selected)?"selected":""}>${esc(x.nombre||x.codigo||x.id)}</option>`).join("")}
window.openWholesaleProfileEditor=(clientId="")=>{const client=clientId?(data.wholesalers||data.clients||[]).find(x=>String(x.id)===String(clientId)):null;const already=(data.wholesaleUsers||[]).find(x=>String(x.cliente_id||"")===String(clientId));if(already){openAdminView("users");window.editUser?.(already.id);return}$("#wmClientId").value=client?.id||"";$("#wmRut").value=client?.rut?formatRutChile(client.rut):"";$("#wmBusinessName").value=client?.razon_social||client?.nombre||"";$("#wmContact").value=client?.nombre||"";$("#wmBusinessActivity").value=client?.giro||"";$("#wmPhone").value=client?.telefono||"";$("#wmEmail").value=client?.email||"";$("#wmAddress").value=client?.direccion||"";$("#wmCommune").value=client?.comuna||"";$("#wmUsername").value="";$("#wmPassword").value="";$("#wmActive").value="SI";fillWholesaleProfilePriceLists(client?.lista_precio_id||"");$("#wholesaleProfileEditor")?.classList.remove("hidden");requestAnimationFrame(()=>$(client?"#wmUsername":"#wmRut")?.focus())};
window.editWholesaleAccess=id=>{openAdminView("users");window.editUser?.(id)};
function closeWholesaleProfileEditor(){$("#wholesaleProfileEditor")?.classList.add("hidden")}
$("#newWholesaleProfile")?.addEventListener("click",()=>window.openWholesaleProfileEditor());$("#closeWholesaleProfileEditor")?.addEventListener("click",closeWholesaleProfileEditor);$("#cancelWholesaleProfile")?.addEventListener("click",closeWholesaleProfileEditor);
function wholesaleProfileErrorMessage(err){const code=String(err?.message||err||"").toUpperCase();if(code.includes("USUARIO_YA_EXISTE"))return "Ese usuario ya existe";if(code.includes("EMAIL_YA_EXISTE"))return "Ese correo ya está asociado a otro usuario";if(code.includes("MAYORISTA_PERFIL_YA_EXISTE"))return "Ese cliente ya tiene un perfil Mayorista";if(code.includes("LISTA_PRECIO_NO_DISPONIBLE"))return "La lista de precios seleccionada no está activa";if(code.includes("TELEFONO_YA_ASOCIADO"))return "Ese teléfono ya está asociado a otro cliente";if(code.includes("RUT"))return "Revisa el RUT del Mayorista";if(code.includes("PERMISO_DENEGADO"))return "Solo un administrador autorizado puede crear perfiles Mayoristas";if(code.includes("ACCION_NO_VALIDA"))return "El backend está desactualizado. Debes desplegar el index.ts incluido en esta versión";return `No fue posible crear el perfil Mayorista${code?` · ${code}`:""}`}
$("#saveWholesaleProfile")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const rut=requireRutChile($("#wmRut").value),payload={cliente_id:$("#wmClientId").value||"",rut,razon_social:$("#wmBusinessName").value.trim(),nombre:$("#wmContact").value.trim(),giro:$("#wmBusinessActivity").value.trim(),telefono:$("#wmPhone").value.trim(),email:$("#wmEmail").value.trim(),direccion:$("#wmAddress").value.trim(),comuna:$("#wmCommune").value.trim(),lista_precio_id:$("#wmPriceList").value,usuario:$("#wmUsername").value.trim(),password:$("#wmPassword").value,activo:$("#wmActive").value};if(!payload.razon_social||!payload.nombre||!payload.usuario){toast("Completa razón social, contacto y usuario");return}if(String(payload.password||"").length<8){toast("La contraseña inicial debe tener al menos 8 caracteres");return}if(!payload.lista_precio_id)payload.activo='NO';const out=await AleAPI.post("createwholesaleprofile",payload,token);toast(out?.pending_price_list?"✓ Perfil y usuario Mayorista creados · acceso pendiente hasta asignar lista de precios":"✓ Perfil Mayorista y usuario creados desde cPanel");closeWholesaleProfileEditor();await loadAdminModules({modules:["clients","users","wholesale"],retry:true});openAdminView("wholesale")}catch(err){console.warn(err);toast(wholesaleProfileErrorMessage(err))}}));
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
$("#uploadWhDocument")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const f=$("#whDocFile")?.files?.[0];if(!f)throw new Error("ARCHIVO_REQUERIDO");const clientId=$("#whDocClient").value;if(!clientId)throw new Error("CLIENTE_REQUERIDO");const dataUrl=await fileToDataUrl(f);await AleAPI.post("adminwholesaledocumentupload",{cliente_id:clientId,tipo:$("#whDocType").value,nombre:$("#whDocName").value.trim()||f.name,data_url:dataUrl,visible_mayorista:true},token);toast("✓ Documento privado cargado y mayorista notificado");$("#whDocFile").value="";resetFilePicker("#whDocFile");$("#whDocName").value="";await loadAdminModules({modules:["wholesale"],retry:true})}catch(err){console.warn(err);toast("✕ No fue posible subir el documento")}}));

// ========================= R9.18.7 REPORTES CONECTADOS A VENTAS PAGADAS =========================
let reportAnalytics=null,reportLoading=false;
function reportDefaultDates(){const n=new Date(),y=n.getFullYear();return{from:`${y}-01-01`,to:`${y}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`}}
function reportFilters(){const def=reportDefaultDates();return{from:$("#reportFrom")?.value||def.from,to:$("#reportTo")?.value||def.to,order_status:$("#reportOrderStatus")?.value||""}}
function setReportCircle(id,pct){const el=$(id);if(!el)return;const n=Number(pct||0);el.style.setProperty("--pct",String(Math.min(100,Math.abs(n))));el.classList.toggle("negative",n<0);el.classList.toggle("positive",n>=0)}
async function loadReports(silent=false){
  if(reportLoading)return;reportLoading=true;const btn=$("#refreshReports");if(btn&&!silent)beginBusy(btn);
  try{
    const filters=reportFilters();
    const out=AleAPI.salesReport?await AleAPI.salesReport(filters,token):await AleAPI.post("salesreport",filters,token);
    if(!out?.ok)throw new Error(out?.error||"REPORTE_RESPUESTA_INVALIDA");
    reportAnalytics=out;renderReports();
  }catch(err){
    console.warn("salesreport",err);reportAnalytics=null;
    const code=String(err?.message||err||"ERROR_DESCONOCIDO").replace(/^Error:\s*/i,"");
    if(!silent){const shortCode=code.slice(0,140);toast(code==="API_TIMEOUT"?"El reporte tardó demasiado. Reintentando conexión…":`No fue posible actualizar los reportes · ${shortCode}`);}
    if($("#reportFilterSummary"))$("#reportFilterSummary").innerHTML=`<i class="bi bi-exclamation-triangle"></i><span>No se pudo consultar la analítica de ventas. <small>${esc(code)}</small></span>`;
  }finally{reportLoading=false;if(btn&&!silent)endBusy(btn)}
}
function renderReports(){
  if(!reportAnalytics){const def=reportDefaultDates();if($("#reportFrom")&&!$("#reportFrom").value)$("#reportFrom").value=def.from;if($("#reportTo")&&!$("#reportTo").value)$("#reportTo").value=def.to;return}
  const r=reportAnalytics,k=r.kpis||{},products=r.products||[],customers=r.customers||[],orders=r.orders||[],demand=r.high_demand||[],limit=Math.max(1,Math.min(50,Number($("#reportTopLimit")?.value||10))),top=products.slice(0,limit);
  const set=(id,v)=>{if($(id))$(id).textContent=v};
  set("#reportSalesTotal",money(k.sales_total));set("#reportOrdersCount",String(k.orders_count||0));set("#reportClientsCount",String(k.unique_clients||0));set("#reportRepeatClients",String(k.repeat_clients||0));set("#reportAvgTicket",money(k.average_ticket));set("#reportTodaySales",money(k.sales_today));set("#reportMonthSales",money(k.sales_month));
  set("#reportTopProduct",r.top_product?.producto_nombre||"—");set("#reportTopProductMeta",r.top_product?`${Number(r.top_product.cantidad||0)} unidades · ${money(r.top_product.ventas)}`:"Sin ventas");
  set("#reportYearPct",`${Number(k.year_change_pct||0)>=0?"+":""}${Number(k.year_change_pct||0)}%`);set("#reportYearSales",money(k.sales_year));set("#reportPrevYearSales",`Anterior: ${money(k.sales_previous_year)}`);setReportCircle("#reportYearCircle",k.year_change_pct);
  set("#reportMonthPct",`${Number(k.month_change_pct||0)>=0?"+":""}${Number(k.month_change_pct||0)}%`);set("#reportMonthCompareSales",money(k.sales_month));set("#reportPrevMonthSales",`Anterior: ${money(k.sales_same_month_previous_year)}`);setReportCircle("#reportMonthCircle",k.month_change_pct);
  set("#reportTopCustomer",r.top_customer?.nombre||"—");set("#reportTopCustomerTotal",money(r.top_customer?.total||0));set("#reportTopCustomerMeta",r.top_customer?`${r.top_customer.compras} compra${r.top_customer.compras===1?"":"s"}`:"Sin compras");
  set("#topProductsTitle",`Top ${limit} productos`);set("#topProductsBadge",String(top.length));set("#salesRowsBadge",`${orders.length} registro${orders.length===1?"":"s"}`);set("#clientRowsBadge",`${customers.length} cliente${customers.length===1?"":"s"}`);
  if($("#reportFilterSummary")){const bv=esc(r.diagnostics?.backend_version||"");$("#reportFilterSummary").innerHTML=`<i class="bi bi-check-circle"></i><span>${orders.length} venta${orders.length===1?"":"s"} pagada${orders.length===1?"":"s"} · ${esc(r.filters?.from||"")} a ${esc(r.filters?.to||"")} · Actualizado ${esc(new Date(r.generated_at).toLocaleTimeString("es-CL"))}${bv?` · ${bv}`:""}</span>`;}
  if($("#topProductsTable"))$("#topProductsTable").innerHTML=table(["#","Producto","Unidades","Pedidos","Ventas"],top.map((p,i)=>`<tr><td><strong>${i+1}</strong></td><td><strong>${esc(p.producto_nombre)}</strong></td><td>${Number(p.cantidad||0)}</td><td>${Number(p.pedidos||0)}</td><td><strong>${money(p.ventas)}</strong></td></tr>`).join(""));
  if($("#highDemandTable"))$("#highDemandTable").innerHTML=table(["Producto","30 días","30 días prev.","Variación"],demand.slice(0,10).map(p=>`<tr><td><strong>${esc(p.producto_nombre)}</strong></td><td>${Number(p.actual||0)}</td><td>${Number(p.anterior||0)}</td><td><span class="demand-change ${Number(p.crecimiento_pct||0)>=0?"up":"down"}">${Number(p.crecimiento_pct||0)>=0?"+":""}${Number(p.crecimiento_pct||0)}%</span></td></tr>`).join(""));
  if($("#clientReportTable"))$("#clientReportTable").innerHTML=table(["#","Cliente","RUT","Compras","Total comprado"],customers.slice(0,50).map((c,i)=>`<tr><td>${i+1}</td><td><strong>${esc(c.nombre||"")}</strong></td><td>${esc(c.rut?formatRutChile(c.rut):"-")}</td><td>${Number(c.compras||0)}</td><td><strong>${money(c.total||0)}</strong></td></tr>`).join(""));
  if($("#salesReportTable"))$("#salesReportTable").innerHTML=table(["Fecha pago","N.º pedido","Cliente","RUT","Estado pedido","Pago","Total"],orders.map(o=>`<tr><td>${esc(formatDate(o.fecha_pago||o.fecha))}</td><td><strong>${esc(o.numero_pedido||o.id)}</strong></td><td>${esc(o.nombre||"")}</td><td>${esc(o.rut?formatRutChile(o.rut):"-")}</td><td>${esc(o.estado||"")}</td><td><span class="payment-status-badge payment-pagado">PAGADO</span></td><td><strong>${money(o.total)}</strong></td></tr>`).join(""));
  scheduleMoneyColumns();
}
$("#applyReports")?.addEventListener("click",()=>loadReports());$("#refreshReports")?.addEventListener("click",()=>loadReports());$("#reportTopLimit")?.addEventListener("change",renderReports);
$("#resetReports")?.addEventListener("click",()=>{const def=reportDefaultDates();$("#reportFrom").value=def.from;$("#reportTo").value=def.to;$("#reportOrderStatus").value="";$("#reportTopLimit").value="10";loadReports()});
$("#exportSalesXlsx")?.addEventListener("click",()=>{const rows=(reportAnalytics?.orders||[]).map(o=>({fecha_pago:o.fecha_pago||o.fecha,numero_pedido:o.numero_pedido||o.id,cliente:o.nombre,rut:o.rut?formatRutChile(o.rut):"",estado_pedido:o.estado,estado_pago:o.estado_pago,total:o.total,medio_pago:o.medio_pago,entrega:o.metodo_entrega}));exportRowsXlsx(rows,"ALE_ATENCIO_VENTAS_PAGADAS.xlsx")});
$("#exportSalesPdf")?.addEventListener("click",()=>simplePdf("ALE ATENCIO · Ventas pagadas",["Fecha","Pedido","Cliente","RUT","Estado","Pago","Total"],(reportAnalytics?.orders||[]).map(o=>[formatDate(o.fecha_pago||o.fecha),o.numero_pedido||o.id,o.nombre,o.rut?formatRutChile(o.rut):"",o.estado,o.estado_pago,money(o.total)]),"ALE_ATENCIO_VENTAS_PAGADAS.pdf"));

const OPERATIONAL_MODAL_IDS=new Set(["warehouseEditor","warehouseChannelEditor","inventoryImportEditor","inventoryPartEditor","ledgerHistoryEditor"]);
function syncOperationalModalBody(){
  const any=[...OPERATIONAL_MODAL_IDS].some(id=>{const el=$("#"+id);return el&&!el.classList.contains("hidden")});
  document.body.classList.toggle("operational-modal-open",any);
}
function showEditor(id,show=true){
  const el=$("#"+id);if(el)el.classList.toggle("hidden",!show);
  if(OPERATIONAL_MODAL_IDS.has(String(id)))syncOperationalModalBody();
}
function renderSuppliers(){
  const rows=(data.suppliers||[]).map(x=>`<tr><td><strong>${esc(x.nombre||"")}</strong></td><td>${esc(x.rut||"")}</td><td>${esc(x.contacto||"")}</td><td>${esc(x.telefono||"")}</td><td>${esc(x.email||"")}</td><td>${String(x.activo??true).toUpperCase()!=="FALSE"&&String(x.activo??"SI").toUpperCase()!=="NO"?"Activo":"Inactivo"}</td><td><div class="row-actions"><button data-edit-supplier="${esc(x.id)}">Editar</button></div></td></tr>`).join("");
  if($("#suppliersTable"))$("#suppliersTable").innerHTML=table(["Proveedor","RUT","Contacto","Teléfono","Correo","Estado","Acciones"],rows)
}
function clearSupplier(){["supplierId","supplierRut","supplierName","supplierContact","supplierPhone","supplierEmail","supplierAddress","supplierNotes"].forEach(id=>{if($("#"+id))$("#"+id).value=""});if($("#supplierActive"))$("#supplierActive").value="SI"}
function openSupplier(id=""){clearSupplier();const x=(data.suppliers||[]).find(v=>String(v.id)===String(id));if(x){$("#supplierId").value=x.id||"";$("#supplierRut").value=x.rut||"";$("#supplierName").value=x.nombre||"";$("#supplierContact").value=x.contacto||"";$("#supplierPhone").value=x.telefono||"";$("#supplierEmail").value=x.email||"";$("#supplierAddress").value=x.direccion||"";$("#supplierNotes").value=x.observaciones||"";$("#supplierActive").value=(String(x.activo??true).toUpperCase()==="FALSE"||String(x.activo).toUpperCase()==="NO")?"NO":"SI"}showEditor("supplierEditor",true)}
$("#newSupplier")?.addEventListener("click",()=>openSupplier());$("#closeSupplierEditor")?.addEventListener("click",()=>showEditor("supplierEditor",false));$("#cancelSupplier")?.addEventListener("click",()=>showEditor("supplierEditor",false));
$("#suppliersTable")?.addEventListener("click",e=>{const b=e.target.closest("[data-edit-supplier]");if(b)openSupplier(b.dataset.editSupplier)});
$("#saveSupplier")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const payload={id:$("#supplierId").value,rut:$("#supplierRut").value.trim(),nombre:$("#supplierName").value.trim(),contacto:$("#supplierContact").value.trim(),telefono:$("#supplierPhone").value.trim(),email:$("#supplierEmail").value.trim(),direccion:$("#supplierAddress").value.trim(),observaciones:$("#supplierNotes").value.trim(),activo:$("#supplierActive").value};if(!payload.nombre)return toast("Nombre de proveedor obligatorio");await AleAPI.post("saveSupplier",payload,token);data=normalizePanelData(await AleAPI.adminModuleReliable("suppliers",token,2));showEditor("supplierEditor",false);renderSuppliers();renderInventory();toast("✓ Proveedor guardado")}catch(err){console.warn(err);toast("✕ No fue posible guardar el proveedor")}}));


// R9.18.139 · detalle local de movimientos Inventario / Libro Mayor
const movementDetailRegistry=new Map();
let movementDetailOperationId="";
function movementDetailPut(scope,index,row){const key=`${scope}-${index}`;movementDetailRegistry.set(key,{scope,row});return key}
function movementDetailItem(label,value,cls=""){const shown=value===undefined||value===null||value===""?"—":String(value);return `<div class="movement-detail-item ${cls}"><span>${esc(label)}</span><strong>${esc(shown)}</strong></div>`}
function openMovementDetail(key){
  const item=movementDetailRegistry.get(String(key||""));if(!item)return toast("No fue posible cargar el movimiento");
  const x=item.row||{},scope=item.scope;
  movementDetailOperationId=String(x.operacion_id||"");
  const op=scope==="inventory"?inventoryOperationById(x.operacion_id):null;
  const opState=String(op?.estado||"APLICADA").toUpperCase(),isCancelled=opState==="ANULADA";
  const title=scope==="inventory"?(x.tipo||"Movimiento de inventario"):(x.tipo||"Movimiento Libro Mayor");
  $("#movementDetailEyebrow").textContent=scope==="inventory"?"Kardex de inventario":"Libro Mayor Auxiliar";
  $("#movementDetailTitle").textContent=title;
  $("#movementDetailSubtitle").textContent=scope==="inventory"?(isCancelled?"Este correlativo fue anulado. La reversa y el motivo quedan registrados en auditoría.":"Detalle completo del movimiento de stock seleccionado."):"Detalle contable y documental del movimiento seleccionado.";
  let parts=[];
  if(scope==="inventory"){
    const qty=Number(x.cantidad||0),before=Number(x.stock_anterior||0),after=Number(x.stock_nuevo||0);
    parts=[
      movementDetailItem("Fecha",formatDate(x.creado_en),"wide"),
      movementDetailItem("Movimiento",x.tipo||"—"),
      movementDetailItem("Estado correlativo",opState),
      movementDetailItem("Bodega",warehouseCode(x.bodega_id)||"—"),
      movementDetailItem("Producto",productNameById(x.producto_id)||"—","wide"),
      movementDetailItem("Tamaño",productSizeById(x.producto_id,x.tamano_id)||"General"),
      movementDetailItem("Cantidad",`${qty>0?"+":""}${qty.toLocaleString("es-CL",{maximumFractionDigits:3})}`,qty<0?"negative":"positive"),
      movementDetailItem("Stock anterior",before.toLocaleString("es-CL",{maximumFractionDigits:3})),
      movementDetailItem("Stock nuevo",after.toLocaleString("es-CL",{maximumFractionDigits:3})),
      movementDetailItem("Folio",x.folio_operacion||op?.numero||"—"),
      movementDetailItem("Documento",x.documento||"—","wide"),
      movementDetailItem("Referencia",x.referencia_id||"—","wide")
    ];
    if(isCancelled){parts.push(movementDetailItem("Anulado el",op?.anulado_en?formatDate(op.anulado_en):"—"));parts.push(movementDetailItem("Motivo anulación",op?.motivo_anulacion||"—","wide"));}
    const note=[x.motivo?`Motivo: ${x.motivo}`:"",isCancelled&&op?.motivo_anulacion?`Anulación: ${op.motivo_anulacion}`:"",x.operacion_id?`Operación: ${x.operacion_id}`:"",x.id?`Movimiento: ${x.id}`:""].filter(Boolean).join(" · ");
    $("#movementDetailNote").textContent=note;$("#movementDetailNote").classList.toggle("hidden",!note);
  }else{
    const qty=x.cantidad===undefined?"—":Number(x.cantidad||0).toLocaleString("es-CL",{maximumFractionDigits:3});
    parts=[
      movementDetailItem("Fecha",formatDate(x.fecha),"wide"),
      movementDetailItem("Movimiento",x.tipo||"—"),
      movementDetailItem("Estado",x.estado||"—"),
      movementDetailItem("Documento",x.documento||"—","wide"),
      movementDetailItem("Pedido",x.pedido_id||"—"),
      movementDetailItem("Bodega",x.bodega||"—"),
      movementDetailItem("Cliente",x.cliente||"—","wide"),
      movementDetailItem("RUT",x.rut?formatRutChile(x.rut):"—"),
      movementDetailItem("Cantidad",qty),
      movementDetailItem("Monto",Number(x.monto||0)?money(x.monto):"—"),
      movementDetailItem("Origen",x.origen||"—","wide")
    ];
    const note=[x.operacion_id?`Operación: ${x.operacion_id}`:"",x.movimiento_id?`Movimiento: ${x.movimiento_id}`:"",x.documento_id?`Documento ID: ${x.documento_id}`:""].filter(Boolean).join(" · ");
    $("#movementDetailNote").textContent=note;$("#movementDetailNote").classList.toggle("hidden",!note);
  }
  $("#movementDetailGrid").innerHTML=parts.join("");
  const pdfActions=$("#movementDetailActions");if(pdfActions)pdfActions.classList.toggle("hidden",!movementDetailOperationId);
  const cancelBtn=$("#movementDetailCancel"),manualTypes=new Set(["CARGA_INICIAL","AJUSTE","ENTRADA","SALIDA","TRANSFERENCIA","RECEPCION_IMPORTACION","RECEPCION_EXPORTACION"]),canCancel=scope==="inventory"&&op&&manualTypes.has(String(op.tipo||"").toUpperCase())&&!isCancelled;
  if(cancelBtn)cancelBtn.classList.toggle("hidden",!canCancel);
  showEditor("movementDetailEditor",true);
}


// R9.18.142 · PDF estructurado por correlativo de inventario
async function openInventoryOperationPdf(operationId,button=null){
  const id=String(operationId||"").trim();if(!id)return toast("No hay correlativo asociado a este movimiento");
  const popup=window.open("about:blank","_blank");if(popup){try{popup.document.title="Generando PDF...";popup.document.body.innerHTML='<p style="font-family:Arial;padding:24px">Generando documento de inventario...</p>'}catch(_){}}
  try{
    if(button)button.disabled=true;
    const out=await AleAPI.post("inventoryoperationpdf",{operacion_id:id},token);
    if(!out?.url)throw new Error("PDF_INVENTARIO_SIN_URL");
    if(popup)popup.location.href=out.url;else window.location.href=out.url;
  }catch(err){if(popup)try{popup.close()}catch(_){};console.warn(err);toast("✕ No fue posible generar el PDF del correlativo");}
  finally{if(button)button.disabled=false;}
}
$("#movementDetailPdf")?.addEventListener("click",e=>openInventoryOperationPdf(movementDetailOperationId,e.currentTarget));

// R9.18.143 · anulación reversible y auditable por correlativo
let inventoryCancelOperationId="";
function openInventoryCancel(operationId){
  const op=inventoryOperationById(operationId);if(!op)return toast("No fue posible encontrar el correlativo");
  if(String(op.estado||"").toUpperCase()==="ANULADA")return toast(`El correlativo ${op.numero||""} ya está anulado`);
  inventoryCancelOperationId=String(op.id||operationId);$("#inventoryCancelFolio").textContent=op.numero||"—";$("#inventoryCancelType").textContent=String(op.tipo||"").replaceAll("_"," ");$("#inventoryCancelReason").value="";
  showEditor("movementDetailEditor",false);showEditor("inventoryCancelEditor",true);setTimeout(()=>$("#inventoryCancelReason")?.focus(),60);
}
$("#movementDetailCancel")?.addEventListener("click",()=>openInventoryCancel(movementDetailOperationId));
$("#closeInventoryCancel")?.addEventListener("click",()=>showEditor("inventoryCancelEditor",false));
$("#cancelInventoryCancel")?.addEventListener("click",()=>showEditor("inventoryCancelEditor",false));
$("#confirmInventoryCancel")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{
  const motivo=$("#inventoryCancelReason")?.value.trim()||"";if(motivo.length<3)return toast("Indica el motivo de la anulación");
  try{
    const out=await AleAPI.post("inventoryoperationcancel",{operacion_id:inventoryCancelOperationId,motivo},token);
    showEditor("inventoryCancelEditor",false);ledgerTraceCache.clear();await loadAdminModules({modules:["stock","products","ledger"],retry:true});renderWarehouseStock();renderLedger();
    toast(`✓ ${out.numero||"Correlativo"} anulado · stock revertido`);
  }catch(err){console.warn(err);const code=String(err?.message||err||"").toUpperCase();if(code.includes("STOCK_INSUFICIENTE_ANULACION"))toast("✕ No se puede anular: una bodega ya no tiene stock suficiente para ejecutar la reversa.");else if(code.includes("GESTIONADA_POR_PEDIDO"))toast("✕ Este movimiento se revierte anulando el pedido asociado.");else toast(`✕ ${err?.message||"No fue posible anular el correlativo"}`)}
}));

// ========================= R9.18.119 · BODEGAS / INVENTARIO / LIBRO MAYOR =========================
function activeWarehouses(){return (data.warehouses||[]).filter(w=>String(w.activa??"SI").toUpperCase()!=="NO"&&String(w.activa??true).toUpperCase()!=="FALSE")}
function warehouseById(id){return (data.warehouses||[]).find(x=>String(x.id)===String(id))}
function warehouseCode(id){const w=warehouseById(id);return w?.codigo||""}
function inventoryOperationById(id){return (data.inventoryOperations||[]).find(x=>String(x.id)===String(id))||null}
function warehouseOptionHtml(includeInactive=false){return (includeInactive?data.warehouses||[]:activeWarehouses()).map(w=>`<option value="${esc(w.id)}">${esc(w.codigo)} · ${esc(w.nombre)}</option>`).join("")}
function channelWarehouseId(channel){return (data.warehouseChannels||[]).find(x=>String(x.canal).toUpperCase()===String(channel).toUpperCase())?.bodega_id||""}
function fillWarehouseSelect(selector,{includeInactive=false,blank=false,channel=""}={}){
  const el=$(selector);if(!el)return;const prev=el.value,preferred=channel?channelWarehouseId(channel):"";
  el.innerHTML=(blank?'<option value="">Seleccionar bodega</option>':'')+warehouseOptionHtml(includeInactive);
  const value=prev&&[...el.options].some(o=>o.value===prev)?prev:preferred&&[...el.options].some(o=>o.value===preferred)?preferred:el.options[blank?1:0]?.value||"";
  if(value)el.value=value;
}
function renderWarehouses(){
  const rows=data.warehouses||[],active=rows.filter(x=>String(x.activa??true).toUpperCase()!=="FALSE"&&String(x.activa??"SI").toUpperCase()!=="NO");
  if($("#warehouseKpiTotal"))$("#warehouseKpiTotal").textContent=String(rows.length);
  if($("#warehouseKpiActive"))$("#warehouseKpiActive").textContent=String(active.length);
  if($("#warehouseKpiInactive"))$("#warehouseKpiInactive").textContent=String(rows.length-active.length);
  if($("#warehousesTable"))$("#warehousesTable").innerHTML=table(["Código","Bodega","Ubicación","Responsable","Estado","Acciones"],rows.map(w=>`<tr><td><strong>${esc(w.codigo||"")}</strong></td><td><strong>${esc(w.nombre||"")}</strong></td><td>${esc(w.direccion||"—")}</td><td>${esc(w.responsable||"—")}</td><td><span class="role-badge ${String(w.activa).toUpperCase()==="FALSE"?"inactive-badge":""}">${String(w.activa).toUpperCase()==="FALSE"?"Inactiva":"Activa"}</span></td><td><div class="row-actions"><button data-edit-warehouse="${esc(w.id)}">Editar</button></div></td></tr>`).join(""));
  [["#warehouseChannelWeb","WEB"],["#warehouseChannelPresencial","PRESENCIAL"],["#warehouseChannelMayorista","MAYORISTA"],["#warehouseChannelCpanel","CPANEL"],["#ocWarehouse","CPANEL"]].forEach(([sel,ch])=>fillWarehouseSelect(sel,{channel:ch}));
  fillWarehouseSelect("#stockWarehouseFilter",{blank:true});fillWarehouseSelect("#inventoryImportWarehouse",{channel:"CPANEL"});fillWarehouseSelect("#inventoryPartWarehouse",{channel:"CPANEL"});fillWarehouseSelect("#inventoryPartDestination",{blank:true});
  const map={WEB:"#warehouseChannelWeb",PRESENCIAL:"#warehouseChannelPresencial",MAYORISTA:"#warehouseChannelMayorista",CPANEL:"#warehouseChannelCpanel"};for(const c of data.warehouseChannels||[]){const el=$(map[String(c.canal).toUpperCase()]);if(el&&[...el.options].some(o=>o.value===String(c.bodega_id)))el.value=String(c.bodega_id)}
  const summary=$("#warehouseChannelSummary");if(summary){
    const labels={WEB:"Web",PRESENCIAL:"Presencial",MAYORISTA:"Mayorista",CPANEL:"cPanel"};
    summary.innerHTML=["WEB","PRESENCIAL","MAYORISTA","CPANEL"].map(ch=>{const id=channelWarehouseId(ch),w=warehouseById(id);return `<span class="warehouse-channel-chip"><small>${labels[ch]}</small><strong>${esc(w?.codigo||"Sin asignar")}</strong></span>`}).join("");
  }
}
function clearWarehouseEditor(){["warehouseId","warehouseName","warehouseAddress","warehouseManager","warehouseNotes"].forEach(id=>{if($("#"+id))$("#"+id).value=""});if($("#warehouseCode"))$("#warehouseCode").value="Automático";if($("#warehouseActive"))$("#warehouseActive").value="SI"}
function openWarehouseEditor(id=""){clearWarehouseEditor();const w=warehouseById(id);if(w){$("#warehouseId").value=w.id||"";$("#warehouseCode").value=w.codigo||"";$("#warehouseName").value=w.nombre||"";$("#warehouseAddress").value=w.direccion||"";$("#warehouseManager").value=w.responsable||"";$("#warehouseNotes").value=w.observaciones||"";$("#warehouseActive").value=String(w.activa??true).toUpperCase()==="FALSE"?"NO":"SI";$("#warehouseEditorTitle").textContent=`${w.codigo||""} · ${w.nombre||""}`}else $("#warehouseEditorTitle").textContent="Nueva bodega";showEditor("warehouseEditor",true)}
$("#newWarehouse")?.addEventListener("click",()=>openWarehouseEditor());
$("#openWarehouseChannels")?.addEventListener("click",()=>{renderWarehouses();showEditor("warehouseChannelEditor",true)});
$("#closeWarehouseChannels")?.addEventListener("click",()=>showEditor("warehouseChannelEditor",false));
$("#cancelWarehouseChannels")?.addEventListener("click",()=>showEditor("warehouseChannelEditor",false));
$("#closeWarehouseEditor")?.addEventListener("click",()=>showEditor("warehouseEditor",false));
$("#cancelWarehouse")?.addEventListener("click",()=>showEditor("warehouseEditor",false));
$("#warehousesTable")?.addEventListener("click",e=>{const b=e.target.closest("[data-edit-warehouse]");if(b)openWarehouseEditor(b.dataset.editWarehouse)});
$("#saveWarehouse")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const payload={id:$("#warehouseId").value,nombre:$("#warehouseName").value.trim(),direccion:$("#warehouseAddress").value.trim(),responsable:$("#warehouseManager").value.trim(),observaciones:$("#warehouseNotes").value.trim(),activa:$("#warehouseActive").value};if(!payload.nombre)return toast("Nombre de bodega obligatorio");await AleAPI.post("savewarehouse",payload,token);await loadAdminModules({modules:["warehouses","stock"],retry:true});showEditor("warehouseEditor",false);renderWarehouses();renderWarehouseStock();toast("✓ Bodega guardada")}catch(err){console.warn(err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("BODEGA_ASIGNADA_CANAL")?"✕ Reasigna los canales antes de inactivar esta bodega.":"✕ No fue posible guardar la bodega")}}));
$("#saveWarehouseChannels")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const channels={WEB:$("#warehouseChannelWeb").value,PRESENCIAL:$("#warehouseChannelPresencial").value,MAYORISTA:$("#warehouseChannelMayorista").value,CPANEL:$("#warehouseChannelCpanel").value};await AleAPI.post("savewarehousechannels",{channels},token);await loadAdminModules({modules:["warehouses"],retry:true});renderWarehouses();showEditor("warehouseChannelEditor",false);toast("✓ Bodegas por canal actualizadas")}catch(err){console.warn(err);toast("✕ No fue posible guardar la configuración")}}));

function productNameById(id){return (data.products||[]).find(x=>String(x.id)===String(id))?.nombre||id||""}
function productSizeById(productId,sizeId){const p=(data.products||[]).find(x=>String(x.id)===String(productId));return (p?.tamanos||[]).find(x=>String(x.id)===String(sizeId))?.nombre||""}
function inventoryAvailable(x){return Math.max(0,Number(x.stock||0)-Number(x.reservado||0)-Number(x.stock_seguridad||0))}
function renderWarehouseStock(){
  const filter=$("#stockWarehouseFilter")?.value||"",q=normalizeText($("#stockSearch")?.value||"");
  const all=data.warehouseStock||[],rows=all.filter(x=>(!filter||String(x.bodega_id)===String(filter))&&(!q||normalizeText(`${productNameById(x.producto_id)} ${productSizeById(x.producto_id,x.tamano_id)} ${warehouseCode(x.bodega_id)}`).includes(q)));
  const phys=rows.reduce((a,x)=>a+Number(x.stock||0),0),res=rows.reduce((a,x)=>a+Number(x.reservado||0),0),avail=rows.reduce((a,x)=>a+inventoryAvailable(x),0);
  if($("#stockKpiPhysical"))$("#stockKpiPhysical").textContent=phys.toLocaleString("es-CL",{maximumFractionDigits:3});
  if($("#stockKpiReserved"))$("#stockKpiReserved").textContent=res.toLocaleString("es-CL",{maximumFractionDigits:3});
  if($("#stockKpiAvailable"))$("#stockKpiAvailable").textContent=avail.toLocaleString("es-CL",{maximumFractionDigits:3});
  if($("#stockKpiMovements"))$("#stockKpiMovements").textContent=String((data.warehouseMovements||[]).length);
  if($("#warehouseStockTable"))$("#warehouseStockTable").innerHTML=table(["Bodega","Producto","Tamaño","Físico","Reservado","Seguridad","Disponible","Costo prom."],rows.map(x=>`<tr><td><strong>${esc(warehouseCode(x.bodega_id))}</strong></td><td><strong>${esc(productNameById(x.producto_id))}</strong></td><td>${esc(productSizeById(x.producto_id,x.tamano_id)||"General")}</td><td>${Number(x.stock||0).toLocaleString("es-CL",{maximumFractionDigits:3})}</td><td>${Number(x.reservado||0).toLocaleString("es-CL",{maximumFractionDigits:3})}</td><td>${Number(x.stock_seguridad||0).toLocaleString("es-CL",{maximumFractionDigits:3})}</td><td><strong>${inventoryAvailable(x).toLocaleString("es-CL",{maximumFractionDigits:3})}</strong></td><td>${money(x.costo_promedio||0)}</td></tr>`).join(""));
  if($("#warehouseMovementsTable")){movementDetailRegistry.forEach((_,k)=>{if(k.startsWith("inventory-"))movementDetailRegistry.delete(k)});const invRows=(data.warehouseMovements||[]).slice(0,500);$("#warehouseMovementsTable").innerHTML=table(["Fecha","Bodega","Movimiento","Producto","Tamaño","Cantidad","Stock","Folio / referencia"],invRows.map((x,i)=>{const op=inventoryOperationById(x.operacion_id),folio=op?.numero||"",opState=String(op?.estado||"APLICADA").toUpperCase(),cancelled=opState==="ANULADA",reversal=String(x.tipo||"").toUpperCase().startsWith("ANULACION_"),detailRow={...x,folio_operacion:folio},dk=movementDetailPut("inventory",i,detailRow),ref=[folio,x.documento||x.referencia_id||x.motivo||""].filter(Boolean).join(" · ")||"—";return `<tr class="inventory-trace-row ${reversal?"inventory-reversal-row":""}" data-trace-movement="${esc(x.id||"")}" data-trace-operation="${esc(x.operacion_id||"")}" data-trace-order="${String(x.referencia_tipo||"").toUpperCase()==="PEDIDO"?esc(x.referencia_id||""):""}" data-trace-doc="${esc(folio||x.documento||x.referencia_id||x.motivo||"")}"><td class="trace-date-cell">${esc(formatDate(x.creado_en))}</td><td class="warehouse-code-cell"><span class="warehouse-code-chip">${esc(warehouseCode(x.bodega_id))}</span></td><td class="movement-action-cell"><button type="button" class="movement-detail-btn" data-movement-detail="${esc(dk)}"><i class="bi bi-search"></i><span>${esc(String(x.tipo||"Movimiento").replaceAll("_"," "))}</span></button></td><td class="trace-product-cell">${esc(productNameById(x.producto_id))}</td><td class="trace-size-cell">${esc(productSizeById(x.producto_id,x.tamano_id)||"General")}</td><td class="trace-number-cell ${Number(x.cantidad||0)<0?"inventory-negative":"inventory-positive"}">${Number(x.cantidad||0)>0?"+":""}${Number(x.cantidad||0).toLocaleString("es-CL",{maximumFractionDigits:3})}</td><td class="trace-stock-cell">${Number(x.stock_anterior||0).toLocaleString("es-CL",{maximumFractionDigits:3})} <span class="stock-arrow">→</span> <strong>${Number(x.stock_nuevo||0).toLocaleString("es-CL",{maximumFractionDigits:3})}</strong></td><td class="trace-reference-cell"><div class="inventory-folio-cell"><strong>${esc(folio||"")}</strong><span class="inventory-operation-status ${cancelled?"cancelled":"applied"}">${cancelled?"ANULADO":"APLICADO"}</span>${x.operacion_id?`<button type="button" class="inventory-pdf-btn" data-inventory-pdf="${esc(x.operacion_id)}" title="Ver PDF del correlativo"><i class="bi bi-file-earmark-pdf"></i> PDF</button>`:""}</div>${cancelled&&op?.motivo_anulacion?`<small>Anulación: ${esc(op.motivo_anulacion)}</small>`:folio&&ref!==folio?`<small>${esc(ref.replace(folio+" · ",""))}</small>`:!folio?esc(ref):""}</td></tr>`}).join(""));}
}
$("#stockWarehouseFilter")?.addEventListener("change",renderWarehouseStock);$("#stockSearch")?.addEventListener("input",renderWarehouseStock);
$("#refreshStock")?.addEventListener("click",async()=>{await loadAdminModules({modules:["stock"],retry:true});renderWarehouseStock()});
$("#exportInventoryMoves")?.addEventListener("click",()=>exportRowsXlsx((data.warehouseMovements||[]).map(x=>{const op=inventoryOperationById(x.operacion_id);return{fecha:x.creado_en,folio:op?.numero||"",estado_correlativo:op?.estado||"APLICADA",motivo_anulacion:op?.motivo_anulacion||"",bodega:warehouseCode(x.bodega_id),tipo:x.tipo,producto:productNameById(x.producto_id),tamano:productSizeById(x.producto_id,x.tamano_id),cantidad:x.cantidad,stock_anterior:x.stock_anterior,stock_nuevo:x.stock_nuevo,documento:x.documento,referencia:x.referencia_id,motivo:x.motivo}}),"ALE_ATENCIO_MOVIMIENTOS_INVENTARIO.xlsx"));

let inventoryImportRows=[];
function inventoryImportResolveRow(raw,index){
  const get=(...keys)=>{for(const k of keys){const v=raw[k]??raw[k.toUpperCase()]??raw[k.toLowerCase()];if(v!==undefined&&String(v).trim()!=="")return v}return""};
  const pid=String(get("producto_id","id_producto")).trim(),pname=String(get("producto","nombre_producto")).trim(),sid=String(get("tamano_id","tamaño_id","id_tamano")).trim(),sname=String(get("tamano","tamaño","variante")).trim();
  let product=(data.products||[]).find(p=>pid&&String(p.id)===pid)||(!pid?(data.products||[]).find(p=>normalizeText(p.nombre)===normalizeText(pname)):null);
  let size=product?.tamanos?.find(z=>sid&&String(z.id)===sid)||(!sid&&product?(product.tamanos||[]).find(z=>normalizeText(z.nombre)===normalizeText(sname)):null);
  const stock=Number(get("stock_contado","stock","cantidad")),cost=parseClpAmount(get("costo_unitario","costo")),safety=Number(get("stock_seguridad","seguridad")||0);
  const errors=[];if(!product)errors.push("Producto");if(product&&(product.tamanos||[]).length&&!size)errors.push("Tamaño");if(!Number.isFinite(stock)||stock<0)errors.push("Stock");
  return{fila:index+2,producto_id:product?.id||pid,producto:product?.nombre||pname,tamano_id:size?.id||sid,tamano:size?.nombre||sname,stock_objetivo:Number.isFinite(stock)?stock:0,costo_unitario:cost,stock_seguridad:Number.isFinite(safety)?Math.max(0,safety):0,observacion:String(get("observacion","observaciones")).trim(),errors};
}
function resetInventoryImport(){inventoryImportRows=[];if($("#inventoryImportType"))$("#inventoryImportType").value="";if($("#inventoryImportReason"))$("#inventoryImportReason").value="";if($("#inventoryImportFile"))$("#inventoryImportFile").value="";if($("#inventoryImportSummary"))$("#inventoryImportSummary").innerHTML="";if($("#inventoryImportPreview"))$("#inventoryImportPreview").innerHTML="";if($("#applyInventoryImport"))$("#applyInventoryImport").disabled=true;if($("#inventoryImportForce"))$("#inventoryImportForce").checked=false;$("#inventoryImportForceRow")?.classList.add("hidden");resetFilePicker("#inventoryImportFile")}
$("#openInventoryImport")?.addEventListener("click",()=>{resetInventoryImport();fillWarehouseSelect("#inventoryImportWarehouse",{channel:"CPANEL"});showEditor("inventoryImportEditor",true)});
$("#closeInventoryImport")?.addEventListener("click",()=>showEditor("inventoryImportEditor",false));$("#cancelInventoryImport")?.addEventListener("click",()=>showEditor("inventoryImportEditor",false));
$("#inventoryImportType")?.addEventListener("change",()=>{$("#inventoryImportForceRow")?.classList.toggle("hidden",$("#inventoryImportType").value!=="CARGA_INICIAL")});
$("#inventoryImportFile")?.addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;if(!window.XLSX)return toast("No se cargó el lector XLSX");try{const buf=await file.arrayBuffer(),book=XLSX.read(buf,{type:"array"}),sheet=book.Sheets[book.SheetNames[0]],raw=XLSX.utils.sheet_to_json(sheet,{defval:""});inventoryImportRows=raw.map(inventoryImportResolveRow);const errors=inventoryImportRows.filter(x=>x.errors.length);$("#inventoryImportSummary").innerHTML=`<strong>${inventoryImportRows.length}</strong> filas · <strong>${inventoryImportRows.length-errors.length}</strong> correctas · <strong>${errors.length}</strong> con error`;$("#applyInventoryImport").disabled=!inventoryImportRows.length||errors.length>0;$("#inventoryImportPreview").innerHTML=table(["Fila","Producto","Tamaño","Stock contado","Costo","Seguridad","Estado"],inventoryImportRows.slice(0,100).map(x=>`<tr class="${x.errors.length?"inventory-row-error":""}"><td>${x.fila}</td><td>${esc(x.producto||x.producto_id)}</td><td>${esc(x.tamano||"General")}</td><td>${Number(x.stock_objetivo).toLocaleString("es-CL",{maximumFractionDigits:3})}</td><td>${money(x.costo_unitario)}</td><td>${Number(x.stock_seguridad).toLocaleString("es-CL",{maximumFractionDigits:3})}</td><td>${x.errors.length?`<span class="inventory-error">${esc(x.errors.join(", "))}</span>`:'<span class="inventory-ok">OK</span>'}</td></tr>`).join(""))}catch(err){console.warn(err);toast("✕ No fue posible leer el XLSX")}});
$("#applyInventoryImport")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const tipo=$("#inventoryImportType").value,bodega=$("#inventoryImportWarehouse").value;if(!tipo)return toast("Selecciona Carga inicial o Ajuste");if(!bodega)return toast("Selecciona la bodega");if(!inventoryImportRows.length||inventoryImportRows.some(x=>x.errors.length))return toast("Revisa el archivo antes de aplicar");const items=inventoryImportRows.map(x=>({producto_id:x.producto_id,tamano_id:x.tamano_id,stock_objetivo:x.stock_objetivo,costo_unitario:x.costo_unitario,stock_seguridad:x.stock_seguridad}));const out=await AleAPI.post("importwarehouseinventory",{tipo,bodega_id:bodega,motivo:$("#inventoryImportReason").value.trim(),forzar:!!$("#inventoryImportForce")?.checked,items},token);showEditor("inventoryImportEditor",false);ledgerTraceCache.clear();await loadAdminModules({modules:["stock","products","ledger"],retry:true});renderWarehouseStock();renderLedger();toast(`✓ ${out.numero||"Inventario"} aplicado`)}catch(err){console.warn(err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("CARGA_INICIAL_YA_APLICADA")?"✕ Ya existe una carga inicial para uno o más productos. Usa Ajuste o activa la reaplicación controlada.":code.includes("STOCK_INSUFICIENTE")?"✕ Stock insuficiente.":"✕ No fue posible aplicar el inventario")}}));

const INVENTORY_FOLIO_PREFIX={ENTRADA:"PE",SALIDA:"PS",AJUSTE:"AJ",TRANSFERENCIA:"TB",RECEPCION_IMPORTACION:"RI",RECEPCION_EXPORTACION:"RE",CARGA_INICIAL:"CI"};
function inventoryPartActiveProducts(){return(data.products||[]).filter(p=>String(p.activo??"SI").toUpperCase()!=="NO")}
function inventoryPartProductLabel(p){return[p?.nombre,p?.categoria_nombre].filter(Boolean).join(" · ")}
function inventoryPartPopulateProductList(){const list=$("#inventoryPartProductList");if(!list)return;list.innerHTML=inventoryPartActiveProducts().map(p=>`<option value="${esc(inventoryPartProductLabel(p))}"></option>`).join("")}
function partSizeOptions(productId,selected=""){const p=(data.products||[]).find(x=>String(x.id)===String(productId)),sizes=(p?.tamanos||[]).filter(z=>String(z.activo??"SI").toUpperCase()!=="NO");return '<option value="">General</option>'+sizes.map(z=>`<option value="${esc(z.id)}" ${String(z.id)===String(selected)?"selected":""}>${esc(z.nombre)}</option>`).join("")}
function inventoryPartFindProduct(text){const q=normalizeText(text),products=inventoryPartActiveProducts();if(!q)return null;let found=products.find(p=>normalizeText(inventoryPartProductLabel(p))===q)||products.find(p=>normalizeText(p.nombre)===q);if(found)return found;let matches=products.filter(p=>normalizeText(p.nombre).startsWith(q));if(matches.length===1)return matches[0];matches=products.filter(p=>normalizeText(`${p.nombre} ${p.categoria_nombre||""}`).includes(q));return matches.length===1?matches[0]:null}
function inventoryPartResolveProduct(row,announce=false){if(!row)return null;const input=row.querySelector(".invPartProductSearch"),hidden=row.querySelector(".invPartProductId"),size=row.querySelector(".invPartSize"),p=inventoryPartFindProduct(input?.value||"");if(!p){if(hidden)hidden.value="";if(size)size.innerHTML='<option value="">General</option>';if(announce&&String(input?.value||"").trim())toast("Selecciona un producto válido de la lista");return null}if(hidden)hidden.value=String(p.id);if(input)input.value=inventoryPartProductLabel(p);if(size){const previous=size.value;size.innerHTML=partSizeOptions(p.id,previous)}return p}
function addInventoryPartRow(x={},focus=false){const host=$("#inventoryPartItems");if(!host)return null;host.insertAdjacentHTML("beforeend",`<div class="inventory-part-row"><div class="inventory-product-combo"><input class="invPartProductSearch" type="search" list="inventoryPartProductList" autocomplete="off" placeholder="Escribe o selecciona producto"><input class="invPartProductId" type="hidden"></div><select class="invPartSize"><option value="">General</option></select><input class="invPartQty" type="number" min="0" step="0.001" value="${Number(x.cantidad??1)}" placeholder="Cantidad"><input class="invPartCost" inputmode="numeric" value="${Number(x.costo_unitario||0)}" placeholder="Costo unitario"><button type="button" class="product-size-remove" data-remove-inventory-part aria-label="Eliminar línea">×</button></div>`);const row=host.lastElementChild;if(x.producto_id){const p=(data.products||[]).find(v=>String(v.id)===String(x.producto_id));row.querySelector(".invPartProductId").value=String(x.producto_id);row.querySelector(".invPartProductSearch").value=p?inventoryPartProductLabel(p):String(x.producto||"");row.querySelector(".invPartSize").innerHTML=partSizeOptions(x.producto_id,x.tamano_id)}syncInventoryPartRowLabels();if(focus)requestAnimationFrame(()=>{row.querySelector(".invPartProductSearch")?.focus();row.scrollIntoView({block:"nearest",behavior:"smooth"})});return row}
function inventoryPartItems(){const type=$("#inventoryPartType").value;return $$("#inventoryPartItems .inventory-part-row").map(row=>{const value=Math.max(0,Number(row.querySelector(".invPartQty")?.value||0));return{producto_id:row.querySelector(".invPartProductId")?.value||"",tamano_id:row.querySelector(".invPartSize")?.value||"",cantidad:type==="AJUSTE"?0:value,stock_objetivo:type==="AJUSTE"?value:0,costo_unitario:parseClpAmount(row.querySelector(".invPartCost")?.value)}}).filter(x=>x.producto_id)}
function inventoryPartMetaText(){const typeSel=$("#inventoryPartType"),whSel=$("#inventoryPartWarehouse"),destSel=$("#inventoryPartDestination"),typeLabel=typeSel?.selectedOptions?.[0]?.textContent||"Movimiento",whLabel=whSel?.selectedOptions?.[0]?.textContent||"Sin bodega",transfer=typeSel?.value==="TRANSFERENCIA",destLabel=destSel?.selectedOptions?.[0]?.textContent||"Sin destino";return transfer?`${typeLabel} · ${whLabel} → ${destLabel}`:`${typeLabel} · ${whLabel}`}
function syncInventoryPartRowLabels(){const adjust=$("#inventoryPartType")?.value==="AJUSTE";if($("#inventoryPartQtyHeading"))$("#inventoryPartQtyHeading").textContent=adjust?"Stock objetivo":"Cantidad";$$("#inventoryPartItems .invPartQty").forEach(el=>el.placeholder=adjust?"Stock objetivo":"Cantidad")}
function syncInventoryPartType(){const type=$("#inventoryPartType")?.value||"ENTRADA",transfer=type==="TRANSFERENCIA",prefix=INVENTORY_FOLIO_PREFIX[type]||"MOV";$("#inventoryPartDestination")?.closest(".inventory-destination-field")?.classList.toggle("hidden",!transfer);if($("#inventoryPartFolio"))$("#inventoryPartFolio").textContent=`${prefix}-#`;if($("#inventoryPartFolioField"))$("#inventoryPartFolioField").value=`${prefix}-# · se asigna al aplicar`;if($("#inventoryPartMetaSummary"))$("#inventoryPartMetaSummary").textContent=inventoryPartMetaText();syncInventoryPartRowLabels()}
function openInventoryPart(){fillWarehouseSelect("#inventoryPartWarehouse",{channel:"CPANEL"});fillWarehouseSelect("#inventoryPartDestination",{blank:true});inventoryPartPopulateProductList();$("#inventoryPartType").value="ENTRADA";$("#inventoryPartDocument").value="";$("#inventoryPartReason").value="";$("#inventoryPartItems").innerHTML="";if($("#inventoryPartMeta"))$("#inventoryPartMeta").open=true;addInventoryPartRow();syncInventoryPartType();showEditor("inventoryPartEditor",true);requestAnimationFrame(()=>$("#inventoryPartItems .invPartProductSearch")?.focus())}
$("#openInventoryPart")?.addEventListener("click",openInventoryPart);$("#closeInventoryPart")?.addEventListener("click",()=>showEditor("inventoryPartEditor",false));$("#cancelInventoryPart")?.addEventListener("click",()=>showEditor("inventoryPartEditor",false));$("#addInventoryPartItem")?.addEventListener("click",()=>addInventoryPartRow({},true));$("#inventoryPartType")?.addEventListener("change",syncInventoryPartType);$("#inventoryPartWarehouse")?.addEventListener("change",syncInventoryPartType);$("#inventoryPartDestination")?.addEventListener("change",syncInventoryPartType);
$("#inventoryPartItems")?.addEventListener("input",e=>{const input=e.target.closest(".invPartProductSearch");if(!input)return;const row=input.closest(".inventory-part-row"),hidden=row?.querySelector(".invPartProductId");if(hidden)hidden.value="";const exact=inventoryPartFindProduct(input.value);if(exact&&normalizeText(inventoryPartProductLabel(exact))===normalizeText(input.value))inventoryPartResolveProduct(row,false)});
$("#inventoryPartItems")?.addEventListener("change",e=>{const input=e.target.closest(".invPartProductSearch");if(input)inventoryPartResolveProduct(input.closest(".inventory-part-row"),true)});
$("#inventoryPartItems")?.addEventListener("keydown",e=>{if(e.key!=="Enter")return;const row=e.target.closest(".inventory-part-row");if(!row)return;if(e.target.closest(".invPartProductSearch")){e.preventDefault();const p=inventoryPartResolveProduct(row,true);if(p)row.querySelector(".invPartSize")?.focus();return}if(e.target.closest(".invPartSize")){e.preventDefault();row.querySelector(".invPartQty")?.focus();return}if(e.target.closest(".invPartQty")){e.preventDefault();row.querySelector(".invPartCost")?.focus();return}if(e.target.closest(".invPartCost")){e.preventDefault();if(!row.querySelector(".invPartProductId")?.value){row.querySelector(".invPartProductSearch")?.focus();return toast("Selecciona el producto antes de agregar otra línea")}addInventoryPartRow({},true)}});
$("#inventoryPartItems")?.addEventListener("click",e=>{const b=e.target.closest("[data-remove-inventory-part]");if(!b)return;b.closest(".inventory-part-row")?.remove();if(!$("#inventoryPartItems")?.children.length)addInventoryPartRow({},true)});
$("#saveInventoryPart")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{$$("#inventoryPartItems .inventory-part-row").forEach(row=>{if(!row.querySelector(".invPartProductId")?.value&&String(row.querySelector(".invPartProductSearch")?.value||"").trim())inventoryPartResolveProduct(row,false)});const tipo=$("#inventoryPartType").value,items=inventoryPartItems(),bodega=$("#inventoryPartWarehouse").value,dest=$("#inventoryPartDestination").value;if(!bodega)return toast("Selecciona la bodega");if(!items.length)return toast("Agrega al menos una línea con un producto válido");if(tipo==="TRANSFERENCIA"&&(!dest||dest===bodega))return toast("Selecciona otra bodega de destino");const payload={tipo,bodega_id:bodega,bodega_destino_id:dest,documento_numero:$("#inventoryPartDocument").value.trim(),motivo:$("#inventoryPartReason").value.trim(),items};const out=await AleAPI.post(tipo==="TRANSFERENCIA"?"inventorytransfer":"inventorypart",payload,token);showEditor("inventoryPartEditor",false);ledgerTraceCache.clear();await loadAdminModules({modules:["stock","products","ledger"],retry:true});renderWarehouseStock();renderLedger();toast(`✓ ${out.numero||"Movimiento"} aplicado · PDF asociado al correlativo`)}catch(err){console.warn(err);const code=String(err?.message||err||"").toUpperCase();toast(code.includes("STOCK_INSUFICIENTE")?"✕ Stock insuficiente en la bodega.":"✕ No fue posible aplicar el movimiento")}}));

function ledgerIsoDate(value){
  const raw=String(value||"").trim();if(!raw)return"";
  const m=raw.match(/^(\d{4}-\d{2}-\d{2})/);if(m)return m[1];
  const d=new Date(raw);if(Number.isNaN(d.getTime()))return"";
  const y=d.getFullYear(),mo=String(d.getMonth()+1).padStart(2,"0"),da=String(d.getDate()).padStart(2,"0");return`${y}-${mo}-${da}`;
}
function ledgerFilteredRows(){
  const q=normalizeText($("#ledgerSearch")?.value||""),type=String($("#ledgerTypeFilter")?.value||"").toUpperCase(),from=String($("#ledgerDateFrom")?.value||""),to=String($("#ledgerDateTo")?.value||"");
  return(data.ledgerRows||[]).filter(x=>{
    const textOk=!q||normalizeText(`${x.tipo} ${x.documento} ${x.cliente} ${x.rut} ${x.pedido_id} ${x.bodega}`).includes(q);
    const typeOk=!type||String(x.tipo||"").toUpperCase().includes(type);
    const day=ledgerIsoDate(x.fecha),fromOk=!from||!!day&&day>=from,toOk=!to||!!day&&day<=to;
    return textOk&&typeOk&&fromOk&&toOk;
  });
}
function ledgerDateLabel(iso){if(!iso)return"";const [y,m,d]=iso.split("-");return`${d}-${m}-${y}`}
function renderLedger(){
  const host=$("#ledgerTable");if(!host)return;const rows=ledgerFilteredRows(),from=String($("#ledgerDateFrom")?.value||""),to=String($("#ledgerDateTo")?.value||"");
  const summary=$("#ledgerFilterSummary");if(summary){let period="Todos los períodos";if(from&&to)period=`${ledgerDateLabel(from)} al ${ledgerDateLabel(to)}`;else if(from)period=`Desde ${ledgerDateLabel(from)}`;else if(to)period=`Hasta ${ledgerDateLabel(to)}`;summary.innerHTML=`<strong>${rows.length.toLocaleString("es-CL")}</strong> movimiento${rows.length===1?"":"s"} · <span>${esc(period)}</span>`}
  movementDetailRegistry.forEach((_,k)=>{if(k.startsWith("ledger-"))movementDetailRegistry.delete(k)});const ledgerRows=rows.slice(0,1500);host.innerHTML=table(["Fecha","Movimiento","Documento","Cliente / RUT","Bodega","Cantidad","Monto","Estado"],ledgerRows.map((x,i)=>{const dk=movementDetailPut("ledger",i,x);return `<tr class="ledger-row" data-ledger-doc="${esc(x.documento||x.pedido_id||"")}" data-ledger-pedido="${esc(x.pedido_id||"")}" data-ledger-dte="${esc(x.documento_id||"")}" data-ledger-operation="${esc(x.operacion_id||"")}" data-ledger-movement="${esc(x.movimiento_id||"")}"><td class="trace-date-cell">${esc(formatDate(x.fecha))}</td><td class="movement-action-cell"><button type="button" class="movement-detail-btn ledger-movement-btn" data-movement-detail="${esc(dk)}"><i class="bi bi-search"></i><span>${esc(x.tipo||"Movimiento")}</span></button></td><td class="trace-document-cell">${esc(x.documento||"—")}</td><td class="trace-client-cell">${esc(x.cliente||"—")}${x.rut?`<small>${esc(formatRutChile(x.rut))}</small>`:""}</td><td class="warehouse-code-cell"><span class="warehouse-code-chip">${esc(x.bodega||"—")}</span></td><td class="trace-number-cell">${x.cantidad===undefined?"—":Number(x.cantidad||0).toLocaleString("es-CL",{maximumFractionDigits:3})}</td><td class="trace-money-cell">${Number(x.monto||0)?money(x.monto):"—"}</td><td class="trace-state-cell"><span class="trace-state-pill">${esc(x.estado||"—")}</span></td></tr>`}).join(""));
}
function ledgerSetDateRange(from,to){if($("#ledgerDateFrom"))$("#ledgerDateFrom").value=from||"";if($("#ledgerDateTo"))$("#ledgerDateTo").value=to||"";renderLedger()}
function ledgerLocalIso(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return`${y}-${m}-${day}`}
$("#ledgerSearch")?.addEventListener("input",renderLedger);$("#ledgerTypeFilter")?.addEventListener("change",renderLedger);$("#ledgerDateFrom")?.addEventListener("change",renderLedger);$("#ledgerDateTo")?.addEventListener("change",renderLedger);
$("#ledgerDateToday")?.addEventListener("click",()=>{const t=ledgerLocalIso(new Date());ledgerSetDateRange(t,t)});
$("#ledgerDateMonth")?.addEventListener("click",()=>{const n=new Date(),a=new Date(n.getFullYear(),n.getMonth(),1),b=new Date(n.getFullYear(),n.getMonth()+1,0);ledgerSetDateRange(ledgerLocalIso(a),ledgerLocalIso(b))});
$("#ledgerDatePrevMonth")?.addEventListener("click",()=>{const n=new Date(),a=new Date(n.getFullYear(),n.getMonth()-1,1),b=new Date(n.getFullYear(),n.getMonth(),0);ledgerSetDateRange(ledgerLocalIso(a),ledgerLocalIso(b))});
$("#ledgerDateClear")?.addEventListener("click",()=>ledgerSetDateRange("",""));
$("#exportLedgerXlsx")?.addEventListener("click",()=>{const rows=ledgerFilteredRows();if(!rows.length)return toast("No hay movimientos para exportar con los filtros actuales");const from=String($("#ledgerDateFrom")?.value||""),to=String($("#ledgerDateTo")?.value||""),suffix=from||to?`_${from||"INICIO"}_${to||"HOY"}`:"";exportRowsXlsx(rows.map(x=>({fecha:x.fecha,movimiento:x.tipo,documento:x.documento,pedido:x.pedido_id,cliente:x.cliente,rut:x.rut,bodega:x.bodega,cantidad:x.cantidad,monto:x.monto,estado:x.estado,origen:x.origen})),`ALE_ATENCIO_LIBRO_MAYOR_AUXILIAR${suffix}.xlsx`)});
const ledgerTraceCache=new Map();
let ledgerTraceRequestSeq=0;
function ledgerTraceRef(input=""){
  if(input&&typeof input==="object")return{
    q:String(input.q||input.documento||"").trim(),
    pedido_id:String(input.pedido_id||"").trim(),
    documento_id:String(input.documento_id||"").trim(),
    operacion_id:String(input.operacion_id||"").trim(),
    movimiento_id:String(input.movimiento_id||"").trim()
  };
  return{q:String(input||$("#ledgerSearch")?.value||"").trim(),pedido_id:"",documento_id:"",operacion_id:"",movimiento_id:""};
}
function ledgerTraceKey(ref){return [ref.pedido_id,ref.documento_id,ref.operacion_id,ref.movimiento_id,ref.q].filter(Boolean).join("|").toUpperCase()}
function ledgerTraceFromRow(row,prefix="ledger"){
  if(!row)return null;
  if(prefix==="inventory")return{q:row.dataset.traceDoc||"",pedido_id:row.dataset.traceOrder||"",documento_id:"",operacion_id:row.dataset.traceOperation||"",movimiento_id:row.dataset.traceMovement||""};
  return{q:row.dataset.ledgerDoc||"",pedido_id:row.dataset.ledgerPedido||"",documento_id:row.dataset.ledgerDte||"",operacion_id:row.dataset.ledgerOperation||"",movimiento_id:row.dataset.ledgerMovement||""};
}
function renderLedgerTraceResult(out,ref){
  const order=out?.order||{},dtes=out?.dtes||[],ops=out?.operations||[];
  const title=order.numero_pedido||(dtes[0]?`DTE ${dtes[0]?.tipo_dte}-${dtes[0]?.folio}`:ops[0]?.numero)||ref.q||"Trazabilidad";
  $("#ledgerHistoryTitle").textContent=title;
  $("#ledgerDocumentSummary").innerHTML=`<div><span>Pedido</span><strong>${esc(order.numero_pedido||order.id||"—")}</strong></div><div><span>Cliente</span><strong>${esc(order.nombre||"—")}</strong></div><div><span>Total</span><strong>${order.total!==undefined?money(order.total):"—"}</strong></div><div><span>Bodega</span><strong>${esc(order.bodega_codigo_snapshot||warehouseCode(order.bodega_id)||"—")}</strong></div>${dtes.length?`<div class="span-2"><span>DTE</span><strong>${dtes.map(x=>`${x.tipo_dte}-${x.folio}`).join(" · ")}</strong></div>`:""}${ops.length?`<div class="span-2"><span>Inventario</span><strong>${ops.map(x=>x.numero).join(" · ")}</strong></div>`:""}`;
  $("#ledgerTimeline").innerHTML=(out?.timeline||[]).map(x=>`<div class="ledger-timeline-row"><span class="ledger-dot"></span><div><strong>${esc(x.titulo||x.tipo)}</strong><small>${esc(formatDate(x.fecha))}${x.detalle?` · ${esc(x.detalle)}`:""}${Number(x.monto||0)?` · ${money(x.monto)}`:""}</small></div></div>`).join("")||'<div class="empty-card">Sin historial relacionado.</div>';
}
function showLedgerTraceLoading(ref){
  $("#ledgerHistoryTitle").textContent=ref.q||"Trazabilidad";
  $("#ledgerDocumentSummary").innerHTML='<div class="ledger-loading-card"><span></span><strong></strong></div><div class="ledger-loading-card"><span></span><strong></strong></div><div class="ledger-loading-card"><span></span><strong></strong></div><div class="ledger-loading-card"><span></span><strong></strong></div>';
  $("#ledgerTimeline").innerHTML='<div class="ledger-trace-loading"><i class="bi bi-arrow-repeat"></i><span>Cargando trazabilidad…</span></div>';
  showEditor("ledgerHistoryEditor",true);
}
async function consultLedgerDocument(input=""){
  const ref=ledgerTraceRef(input),key=ledgerTraceKey(ref);
  if(!key)return toast("Ingresa un documento, pedido o folio");
  const cached=ledgerTraceCache.get(key),now=Date.now();
  if(cached){renderLedgerTraceResult(cached.data,ref);showEditor("ledgerHistoryEditor",true);if(now-cached.at<45000)return}
  else showLedgerTraceLoading(ref);

  const seq=++ledgerTraceRequestSeq;
  try{
    const out=await AleAPI.post("ledgerdocumenthistory",ref,token);
    if(seq!==ledgerTraceRequestSeq)return;
    ledgerTraceCache.set(key,{at:Date.now(),data:out});
    renderLedgerTraceResult(out,ref);
  }catch(err){
    console.warn(err);
    if(seq!==ledgerTraceRequestSeq)return;
    if(!cached){$("#ledgerTimeline").innerHTML='<div class="empty-card">No fue posible cargar la trazabilidad.</div>';toast("✕ No fue posible encontrar el historial")}
  }
}
$("#ledgerConsult")?.addEventListener("click",()=>consultLedgerDocument());
$("#ledgerSearch")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();consultLedgerDocument()}});
$("#ledgerTable")?.addEventListener("click",e=>{const detail=e.target.closest("[data-movement-detail]");if(detail){e.preventDefault();e.stopPropagation();return openMovementDetail(detail.dataset.movementDetail)}const row=e.target.closest(".ledger-row");if(row)consultLedgerDocument(ledgerTraceFromRow(row,"ledger"))});
$("#warehouseMovementsTable")?.addEventListener("click",e=>{const pdf=e.target.closest("[data-inventory-pdf]");if(pdf){e.preventDefault();e.stopPropagation();return openInventoryOperationPdf(pdf.dataset.inventoryPdf,pdf)}const detail=e.target.closest("[data-movement-detail]");if(detail){e.preventDefault();e.stopPropagation();return openMovementDetail(detail.dataset.movementDetail)}const row=e.target.closest(".inventory-trace-row");if(row)consultLedgerDocument(ledgerTraceFromRow(row,"inventory"))});
$("#closeLedgerHistory")?.addEventListener("click",()=>showEditor("ledgerHistoryEditor",false));$("#closeLedgerHistoryBottom")?.addEventListener("click",()=>showEditor("ledgerHistoryEditor",false));
$("#closeMovementDetail")?.addEventListener("click",()=>showEditor("movementDetailEditor",false));$("#closeMovementDetailBottom")?.addEventListener("click",()=>showEditor("movementDetailEditor",false));

function renderInventory(){
  const supplies=data.supplies||[],purchases=data.purchases||[];const current=new Date();const value=supplies.reduce((a,x)=>a+Number(x.stock||0)*Number(x.costo_promedio||0),0),low=supplies.filter(x=>Number(x.stock_minimo||0)>0&&Number(x.stock||0)<=Number(x.stock_minimo||0)).length,month=purchases.filter(x=>{const d=new Date(x.fecha||x.creado_en);return !Number.isNaN(d.getTime())&&d.getFullYear()===current.getFullYear()&&d.getMonth()===current.getMonth()}).reduce((a,x)=>a+Number(x.total||0),0);if($("#inventoryKpiValue"))$("#inventoryKpiValue").textContent=money(value);if($("#inventoryKpiLow"))$("#inventoryKpiLow").textContent=String(low);if($("#inventoryKpiMonth"))$("#inventoryKpiMonth").textContent=money(month);
  if($("#suppliesTable"))$("#suppliesTable").innerHTML=table(["Insumo","Unidad","Stock","Mínimo","Costo promedio","Valor stock","Acciones"],supplies.map(x=>`<tr><td><strong>${esc(x.nombre)}</strong></td><td>${esc(x.unidad||"")}</td><td>${Number(x.stock||0).toLocaleString("es-CL")}</td><td>${Number(x.stock_minimo||0).toLocaleString("es-CL")}</td><td>${money(x.costo_promedio||0)}</td><td>${money(Number(x.stock||0)*Number(x.costo_promedio||0))}</td><td><div class="row-actions"><button data-edit-supply="${esc(x.id)}">Editar</button></div></td></tr>`).join(""));
  const smap=new Map((data.suppliers||[]).map(x=>[String(x.id),x.nombre]));if($("#purchasesTable"))$("#purchasesTable").innerHTML=table(["Fecha","Proveedor","Documento","Items","Total"],purchases.map(x=>{const count=(data.purchaseItems||[]).filter(i=>String(i.compra_id)===String(x.id)).length;return`<tr><td>${esc(formatDate(x.fecha||x.creado_en))}</td><td>${esc(smap.get(String(x.proveedor_id))||"Sin proveedor")}</td><td>${esc([x.tipo_documento,x.documento].filter(Boolean).join(" · "))}</td><td>${count}</td><td>${money(x.total||0)}</td></tr>`}).join(""));
  if($("#productCostTable"))$("#productCostTable").innerHTML=table(["Producto","Ingredientes","Costo estimado","Precio desde","Margen bruto referencial"],(data.products||[]).map(p=>{const cost=Number(p.costo_estimado||0),sizes=Array.isArray(p.tamanos)?p.tamanos:[],prices=sizes.map(z=>Number(z.precio||0)).filter(v=>v>0),price=prices.length?Math.min(...prices):Number(p.precio||0),margin=price>0?price-cost:0;return`<tr><td><strong>${esc(p.nombre)}</strong></td><td>${(p.ingredientes||[]).length}</td><td>${money(cost)}</td><td>${money(price)}</td><td>${money(margin)}</td></tr>`}).join(""));
  const sel=$("#receiptSupplier");if(sel){const v=sel.value;sel.innerHTML='<option value="">Sin proveedor</option>'+(data.suppliers||[]).filter(x=>String(x.activo??"SI").toUpperCase()!=="NO").map(x=>`<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join("");sel.value=v}
}
function clearSupply(){["supplyId","supplyName","supplyStock","supplyCost","supplyMin"].forEach(id=>{if($("#"+id))$("#"+id).value=""});if($("#supplyUnit"))$("#supplyUnit").value="KG";if($("#supplyActive"))$("#supplyActive").value="SI"}
function openSupply(id=""){clearSupply();const x=(data.supplies||[]).find(v=>String(v.id)===String(id));if(x){$("#supplyId").value=x.id||"";$("#supplyName").value=x.nombre||"";$("#supplyUnit").value=x.unidad||"UNIDAD";$("#supplyStock").value=Number(x.stock||0);$("#supplyCost").value=Number(x.costo_promedio||0);$("#supplyMin").value=Number(x.stock_minimo||0);$("#supplyActive").value=(String(x.activo??true).toUpperCase()==="FALSE"||String(x.activo).toUpperCase()==="NO")?"NO":"SI"}showEditor("supplyEditor",true)}
$("#newSupply")?.addEventListener("click",()=>openSupply());$("#closeSupplyEditor")?.addEventListener("click",()=>showEditor("supplyEditor",false));$("#cancelSupply")?.addEventListener("click",()=>showEditor("supplyEditor",false));$("#suppliesTable")?.addEventListener("click",e=>{const b=e.target.closest("[data-edit-supply]");if(b)openSupply(b.dataset.editSupply)});
$("#saveSupply")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const payload={id:$("#supplyId").value,nombre:$("#supplyName").value.trim(),unidad:$("#supplyUnit").value.trim(),stock:Number($("#supplyStock").value||0),costo_promedio:parseClpAmount($("#supplyCost").value),stock_minimo:Number($("#supplyMin").value||0),activo:$("#supplyActive").value};if(!payload.nombre)return toast("Nombre del insumo obligatorio");await AleAPI.post("saveSupply",payload,token);data=normalizePanelData(await AleAPI.adminModuleReliable("inventory",token,2));showEditor("supplyEditor",false);renderInventory();renderProductIngredientEditor(collectProductIngredients());toast("✓ Insumo guardado")}catch(err){console.warn(err);toast("✕ No fue posible guardar el insumo")}}));
function receiptItemRows(){return $$("#receiptItemsEditor .receipt-item-row").map(row=>({insumo_id:row.querySelector(".receiptSupply")?.value||"",nombre:row.querySelector(".receiptName")?.value.trim()||"",unidad:row.querySelector(".receiptUnit")?.value.trim()||"UNIDAD",cantidad:Math.max(0,Number(row.querySelector(".receiptQty")?.value||0)),costo_unitario:parseClpAmount(row.querySelector(".receiptCost")?.value)})).filter(x=>x.cantidad>0&&(x.insumo_id||x.nombre))}
function updateReceiptTotal(){if($("#receiptTotal"))$("#receiptTotal").textContent=money(receiptItemRows().reduce((a,x)=>a+x.cantidad*x.costo_unitario,0))}
function addReceiptItemRow(x={}){const box=$("#receiptItemsEditor");if(!box)return;const opts=(data.supplies||[]).filter(i=>String(i.activo??"SI").toUpperCase()!=="NO").map(i=>`<option value="${esc(i.id)}">${esc(i.nombre)} · ${esc(i.unidad||"")}</option>`).join("");box.insertAdjacentHTML("beforeend",`<div class="receipt-item-row"><label><small>Insumo existente</small><select class="receiptSupply"><option value="">Nuevo insumo</option>${opts}</select></label><label><small>Nombre</small><input class="receiptName" value="${esc(x.nombre||"")}" placeholder="Nombre"></label><label><small>Unidad</small><input class="receiptUnit" value="${esc(x.unidad||"KG")}"></label><label><small>Cantidad</small><input class="receiptQty" type="number" min="0" step="0.001" value="${Number(x.cantidad||1)}"></label><label><small>Costo unitario</small><input class="receiptCost" inputmode="numeric" value="${Number(x.costo_unitario||0)}"></label><button type="button" class="product-size-remove" data-remove-receipt>×</button></div>`);const row=box.lastElementChild;if(x.insumo_id)row.querySelector(".receiptSupply").value=String(x.insumo_id);updateReceiptTotal()}
function openInventoryReceipt(){if($("#receiptSupplier"))$("#receiptSupplier").value="";if($("#receiptDocument"))$("#receiptDocument").value="";if($("#receiptNotes"))$("#receiptNotes").value="";if($("#receiptType"))$("#receiptType").value="COMPRA";if($("#receiptDate")){const d=new Date(),local=new Date(d.getTime()-d.getTimezoneOffset()*60000);$("#receiptDate").value=local.toISOString().slice(0,16)};if($("#receiptItemsEditor"))$("#receiptItemsEditor").innerHTML="";addReceiptItemRow();showEditor("inventoryReceiptEditor",true)}
$("#newInventoryReceipt")?.addEventListener("click",openInventoryReceipt);$("#addReceiptItem")?.addEventListener("click",()=>addReceiptItemRow());$("#closeInventoryReceipt")?.addEventListener("click",()=>showEditor("inventoryReceiptEditor",false));$("#cancelInventoryReceipt")?.addEventListener("click",()=>showEditor("inventoryReceiptEditor",false));
$("#receiptItemsEditor")?.addEventListener("input",updateReceiptTotal);$("#receiptItemsEditor")?.addEventListener("change",e=>{const sel=e.target.closest(".receiptSupply");if(sel&&sel.value){const item=(data.supplies||[]).find(x=>String(x.id)===String(sel.value)),row=sel.closest(".receipt-item-row");if(item&&row){row.querySelector(".receiptName").value=item.nombre||"";row.querySelector(".receiptUnit").value=item.unidad||"UNIDAD";row.querySelector(".receiptCost").value=Number(item.costo_promedio||0)}}updateReceiptTotal()});$("#receiptItemsEditor")?.addEventListener("click",e=>{const b=e.target.closest("[data-remove-receipt]");if(!b)return;b.closest(".receipt-item-row")?.remove();if(!$("#receiptItemsEditor")?.children.length)addReceiptItemRow();updateReceiptTotal()});
$("#saveInventoryReceipt")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const items=receiptItemRows();if(!items.length)return toast("Agrega al menos una línea de mercadería");await AleAPI.post("saveInventoryReceipt",{proveedor_id:$("#receiptSupplier").value,fecha:$("#receiptDate").value?new Date($("#receiptDate").value).toISOString():new Date().toISOString(),tipo_documento:$("#receiptType").value,documento:$("#receiptDocument").value.trim(),observaciones:$("#receiptNotes").value.trim(),items},token);data=normalizePanelData(await AleAPI.adminModuleReliable("inventory",token,2));showEditor("inventoryReceiptEditor",false);renderInventory();toast("✓ Mercadería ingresada y costo promedio actualizado") }catch(err){console.warn(err);toast("✕ No fue posible registrar la mercadería")}}));

function renderGallery(){const host=$("#galleryAdminGrid");if(!host)return;host.innerHTML=(data.gallery||[]).length?(data.gallery||[]).map(x=>`<article class="gallery-admin-card"><div class="gallery-admin-media">${x.image_url?`<img src="${esc(resolveMediaUrl(x.image_url))}" alt="${esc(x.titulo||"")}">`:""}</div><div class="gallery-admin-body"><strong>${esc(x.titulo||"")}</strong><small>${esc(x.categoria||"Sin categoría")}${x.fecha_evento?` · ${esc(String(x.fecha_evento).slice(0,10))}`:""}</small><span>${String(x.visible_publico??"SI").toUpperCase()==="NO"?"Privada":"Visible en Web"}</span><button class="btn btn-light btn-compact" data-edit-gallery="${esc(x.id)}">Editar</button></div></article>`).join(""):'<div class="empty-card">Aún no hay imágenes en Galería.</div>'}
function clearGallery(){["galleryId","galleryImageId","galleryImageUrl","galleryTitle","galleryCategory","galleryDate","galleryDescription"].forEach(id=>{if($("#"+id))$("#"+id).value=""});if($("#galleryOrder"))$("#galleryOrder").value="0";if($("#galleryPublic"))$("#galleryPublic").value="SI";if($("#galleryActive"))$("#galleryActive").value="SI";resetFilePicker("#galleryImage")}
function openGallery(id=""){clearGallery();const x=(data.gallery||[]).find(v=>String(v.id)===String(id));if(x){$("#galleryId").value=x.id||"";$("#galleryImageId").value=x.drive_file_id||x.storage_path||"";$("#galleryImageUrl").value=x.image_url||"";$("#galleryTitle").value=x.titulo||"";$("#galleryCategory").value=x.categoria||"";$("#galleryDate").value=x.fecha_evento?String(x.fecha_evento).slice(0,10):"";$("#galleryOrder").value=Number(x.orden||0);$("#galleryDescription").value=x.descripcion||"";$("#galleryPublic").value=String(x.visible_publico??"SI").toUpperCase()==="NO"?"NO":"SI";$("#galleryActive").value=String(x.activo??"SI").toUpperCase()==="NO"?"NO":"SI"}showEditor("galleryEditor",true)}
$("#newGalleryItem")?.addEventListener("click",()=>openGallery());$("#closeGalleryEditor")?.addEventListener("click",()=>showEditor("galleryEditor",false));$("#cancelGalleryEditor")?.addEventListener("click",()=>showEditor("galleryEditor",false));$("#galleryAdminGrid")?.addEventListener("click",e=>{const b=e.target.closest("[data-edit-gallery]");if(b)openGallery(b.dataset.editGallery)});
$("#saveGalleryItem")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{let imageId=$("#galleryImageId").value,imageUrl=$("#galleryImageUrl").value;const file=$("#galleryImage")?.files?.[0];if(file){const up=await upload(file,"GALERIA");imageId=up.fileId;imageUrl=up.imageUrl||imageUrl}const payload={id:$("#galleryId").value,titulo:$("#galleryTitle").value.trim(),categoria:$("#galleryCategory").value.trim(),fecha_evento:$("#galleryDate").value,orden:Number($("#galleryOrder").value||0),descripcion:$("#galleryDescription").value.trim(),drive_file_id:imageId,image_url:imageUrl,visible_publico:$("#galleryPublic").value,activo:$("#galleryActive").value};if(!payload.titulo)return toast("Título obligatorio");if(!payload.image_url&&!payload.drive_file_id)return toast("Selecciona una imagen");await AleAPI.post("saveGalleryItem",payload,token);data=normalizePanelData(await AleAPI.adminModuleReliable("gallery",token,2));showEditor("galleryEditor",false);renderGallery();toast("✓ Imagen guardada en Galería") }catch(err){console.warn(err);toast("✕ No fue posible guardar la imagen")}}));

function openAdminView(view){const target=$(`.admin-nav button[data-view="${CSS.escape(String(view||"dashboard"))}"]`);if(!target)return;if(target.closest('.nav-group'))openNavGroupForButton(target);else{$$('.nav-group').forEach(x=>x.removeAttribute('open'));try{localStorage.removeItem(NAV_GROUP_STORAGE)}catch{}}if(String(target.dataset.view)!=="wholesale-credits"&&typeof closeAllWholesaleCreditModals==="function")closeAllWholesaleCreditModals();$$('.admin-nav button').forEach(x=>x.classList.remove("active"));target.classList.add("active");$$('.admin-view').forEach(x=>x.classList.remove("active"));$("#view-"+target.dataset.view)?.classList.add("active");$("#viewTitle").textContent=target.textContent.trim();if(target.dataset.view==="dashboard"){renderModernDashboard()}if(target.dataset.view==="products"){if($("#productSearch"))$("#productSearch").value="";if($("#productFilter"))$("#productFilter").value="";renderProducts()}if(target.dataset.view==="wholesale"){renderWholesale()}if(target.dataset.view==="wholesale-credits"){renderWholesaleCredits()}if(target.dataset.view==="suppliers"){renderSuppliers()}if(target.dataset.view==="purchases"){loadSiiExchange().catch(err=>{console.warn("purchases dte",err);toast(`✕ ${err.message||err}`)})}if(target.dataset.view==="warehouses"){renderWarehouses()}if(target.dataset.view==="stock"){renderWarehouseStock()}if(target.dataset.view==="ledger"){renderLedger()}if(target.dataset.view==="inventory"){renderInventory()}if(target.dataset.view==="gallery"){renderGallery()}if(target.dataset.view==="folio-manager"){loadFolioManager(false).catch(err=>console.warn("folio manager open",err))}if(target.dataset.view==="reports"){loadReports(true).catch(err=>console.warn("reports open",err))}if(sidebarIsMobile())setSidebarOpen(false);window.scrollTo({top:0,behavior:"smooth"})}
$$('.admin-nav button').forEach(btn=>btn.addEventListener("click",()=>openAdminView(btn.dataset.view)));
function formatDate(v){if(!v)return"";const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString("es-CL")}
let sessionRestoreTimer=null,sessionRestoreBusy=false;
async function restoreAdminSession(){
  if(sessionRestoreBusy||!token)return;
  sessionRestoreBusy=true;
  if(sessionRestoreTimer){clearTimeout(sessionRestoreTimer);sessionRestoreTimer=null}
  showLogin("Validando sesión guardada…");
  try{
    const sess=await validateStoredSession(3);
    if(!sess?.ok)throw new Error(sess?.error||"SESION_INVALIDA");
    if(String(sess.user?.rol||"").toUpperCase()==="MAYORISTA"){
      // Sesiones históricas de mayorista tampoco pueden abrir el área administrativa.
      const wholesaleToken=token;
      clearAdminToken();
      if(wholesaleToken)localStorage.setItem("aleMayoristaToken",wholesaleToken);
      location.href="mayoristas.html";
      return;
    }
    data.currentUser=sess.user||data.currentUser;
    if(sess.permissions)data.permissions=sess.permissions;
    showAdmin();
    renderSessionHeader(sess.user);
    // La sesión ya fue validada. Una falla al cargar datos NO debe cerrar sesión.
    try{await reload()}catch(err){
      console.warn("reload after restored session",err);
      if(isDefinitiveSessionError(err))throw err;
      setSyncState("warning","Reconectando");
      scheduleAdminRetry(ADMIN_DATA_MODULES);
    }
    startNotificationWatcher();
    AleAPI.backendStatus().then(st=>{
      if(!st?.ok&&$("#apiWarning"))$("#apiWarning").textContent="Conexión intermitente con Supabase. La sesión permanece iniciada.";
    }).catch(()=>{});
  }catch(e){
    console.warn("restore session",e);
    if(isDefinitiveSessionError(e)){
      clearAdminToken();
      showLogin("La sesión venció o fue cerrada. Ingresa nuevamente.");
    }else{
      // No borrar el token por timeout, pérdida momentánea de Internet o respuesta 5xx.
      showLogin("No fue posible validar la conexión en este momento. Tu sesión se conserva y se reintentará automáticamente.");
      sessionRestoreTimer=setTimeout(()=>restoreAdminSession(),4500);
    }
  }finally{sessionRestoreBusy=false}
}

window.addEventListener("online",()=>{if(!token)return;if(document.body.classList.contains("auth-active"))reload().catch(e=>console.warn("online reload",e));else restoreAdminSession()});
window.addEventListener("focus",()=>{if(!token)return;if(document.body.classList.contains("auth-active"))reload().catch(e=>console.warn("focus reload",e));else if(!sessionRestoreBusy)restoreAdminSession()});

wireRutInput("#qRut");
wireRutInput("#sBusinessRut");

(async()=>{
  if(!AleAPI.configured()) return showLogin("Configura la URL de Supabase Edge Function en config.js.");
  if(token){
    // R9.15.1: validar primero la sesión; el ping no puede expulsar al usuario.
    await restoreAdminSession();
    return;
  }
  showLogin();
  AleAPI.backendStatus().then(st=>{
    if(!st?.ok&&$("#apiWarning"))$("#apiWarning").textContent="Backend Supabase sin respuesta: "+(st.error||"SIN_RESPUESTA")+". Revisa la Edge Function dynamic-processor.";
  }).catch(()=>{});
})();

// R9.18.22 · Inicialización monetaria CLP/voz natural.
installStaticClpFields();

// R9.18.104 · Facturación SII · PRUEBA LOCAL firmada + PDF representación SII
const siiState={config:null,certificados:[],caf:[],documentos:[],intercambios:[],intercambioRespuestas:[],intercambioDetalles:[],certificacion:[],certMetricas:{},inboundEmailWebhook:false,loaded:false};
let siiLoadedOrderDocs=[];let siiLoadedOrderId=null;let siiLoadedOrderItems=[];
const SII_DTE_NAMES={33:"Factura Electrónica",34:"Factura No Afecta o Exenta Electrónica",39:"Boleta Electrónica",41:"Boleta No Afecta o Exenta Electrónica",43:"Liquidación Factura Electrónica",52:"Guía de Despacho Electrónica",56:"Nota de Débito Electrónica",61:"Nota de Crédito Electrónica"};
function siiStatusClass(value){const x=String(value||"").toUpperCase();if(["ACEPTADO","ENVIADO","FIRMADO","0"].includes(x))return"ok";if(x.includes("PRUEBA_LOCAL"))return"local";if(["ERROR","ERROR_ENVIO","RECHAZADO"].some(v=>x.includes(v)))return"error";return"warn"}
function siiFormatDate(value){if(!value)return"—";const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString("es-CL")}
function fileAsBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(r.error||new Error("LECTURA_ARCHIVO_FALLIDA"));r.onload=()=>resolve(String(r.result||"").split(",").pop()||"");r.readAsDataURL(file)})}
function fileAsText(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(r.error||new Error("LECTURA_ARCHIVO_FALLIDA"));r.onload=()=>resolve(String(r.result||""));r.readAsText(file,"UTF-8")})}
function setSiiEnvBadge(env){const el=$("#siiEnvironmentBadge");if(!el)return;const prod=String(env||"").toUpperCase()==="PRODUCCION";el.textContent=prod?"SII PRODUCCIÓN":"SII CERTIFICACIÓN";el.classList.toggle("production",prod);el.classList.toggle("certification",!prod)}
function renderSiiConfig(){const c=siiState.config||{};$("#siiEnvironment").value=c.ambiente||"CERTIFICACION";$("#siiEnabled").value=c.habilitado?"SI":"NO";$("#siiRutEmisor").value=c.rut_emisor||"";$("#siiRazonSocial").value=c.razon_social||"";$("#siiGiro").value=c.giro||"";$("#siiActeco").value=c.acteco||"";$("#siiDireccion").value=c.direccion_origen||"";$("#siiComuna").value=c.comuna_origen||"";$("#siiCiudad").value=c.ciudad_origen||"";if($("#siiDireccionRegional"))$("#siiDireccionRegional").value=c.direccion_regional_sii||"";if($("#siiBoletaApiEnabled"))$("#siiBoletaApiEnabled").value=c.boleta_api_habilitada?"SI":"NO";if($("#siiBoletaEmissionModel"))$("#siiBoletaEmissionModel").value=c.boleta_modelo_emision||"POR_DEFINIR";if($("#siiBoletaFormat"))$("#siiBoletaFormat").value=c.boleta_formato||"TICKET_80";if($("#siiBoletaPrintFormat"))$("#siiBoletaPrintFormat").value=c.boleta_formato||"TICKET_80";$("#siiEmail").value=c.email_emisor||"";$("#siiResolucionNumero").value=c.numero_resolucion??"";$("#siiResolucionFecha").value=c.fecha_resolucion?String(c.fecha_resolucion).slice(0,10):"";setSiiEnvBadge(c.ambiente)}
function renderSiiCertificates(){const host=$("#siiCertificateList"),active=String(siiState.config?.certificado_activo_id||"");if(!host)return;host.innerHTML=siiState.certificados.length?siiState.certificados.map(x=>{const isActive=String(x.id)===active;return `<div class="sii-list-item ${isActive?'is-active':''}"><div><strong>${esc(x.alias||'Certificado SII')}</strong><small>${esc(x.rut_firmante||'')} · vence ${esc(siiFormatDate(x.valido_hasta))}</small></div><div class="sii-list-actions">${isActive?'<span class="sii-status-pill ok">Activo</span>':`<button class="btn btn-light btn-compact" type="button" data-sii-cert-activate="${esc(x.id)}">Usar</button>`}</div></div>`}).join(""):'<div class="muted">No hay certificado digital cargado.</div>'}
function renderSiiCaf(){const tbody=$("#siiCafTable");if(!tbody)return;const rows=siiState.caf||[];tbody.innerHTML=rows.length?rows.map(x=>{const total=Math.max(1,Number(x.folio_hasta||0)-Number(x.folio_desde||0)+1),available=Math.max(0,Number(x.folio_hasta||0)-Number(x.proximo_folio||0)+1),pct=Math.round(available*100/total),local=Boolean(x.es_prueba_local),state=x.agotado?"Agotado":local?"PRUEBA LOCAL":x.activo?"CAF SII ACTIVO":"Inactivo",stateClass=x.agotado?"error":local?"local":"ok",expiry=local&&x.vence_prueba?`<small class="sii-local-expiry">Vence ${siiFormatDate(x.vence_prueba)}</small>`:"",low=!x.agotado&&x.activo&&(available<=5||pct<=20),lowBadge=low?`<small class="sii-folio-low">⚠ ${available<=5?'QUEDAN '+available:pct+'% DISPONIBLE'}</small>`:"";return `<tr class="${local?'sii-local-row':''} ${low?'sii-low-row':''}"><td><strong>${Number(x.tipo_dte)}</strong><small>${esc(SII_DTE_NAMES[x.tipo_dte]||'DTE')}</small>${local?'<small class="sii-local-label">NO AUTORIZADO SII</small>':''}</td><td class="folio-cell">${Number(x.folio_desde).toLocaleString('es-CL')} – ${Number(x.folio_hasta).toLocaleString('es-CL')}</td><td class="folio-cell">${Number(x.proximo_folio||0).toLocaleString('es-CL')}</td><td class="folio-cell"><strong>${available.toLocaleString('es-CL')}</strong><small>${pct}% del rango</small>${lowBadge}${expiry}</td><td><span class="sii-status-pill ${stateClass}">${state}</span></td></tr>`}).join(""):'<tr><td colspan="5" class="sii-document-empty">Aún no hay CAF ni rangos de prueba cargados para este ambiente.</td></tr>';const alert=$("#siiFolioAlert"),low=rows.filter(x=>x.activo&&!x.agotado&&Math.max(0,Number(x.folio_hasta||0)-Number(x.proximo_folio||0)+1)<=Math.max(5,Math.ceil((Number(x.folio_hasta||0)-Number(x.folio_desde||0)+1)*.2)));if(alert){alert.classList.toggle("hidden",!low.length);alert.innerHTML=low.length?`<i class="bi bi-exclamation-triangle"></i><span><strong>Folios por agotarse:</strong> ${low.map(x=>`DTE ${Number(x.tipo_dte)} · ${Math.max(0,Number(x.folio_hasta||0)-Number(x.proximo_folio||0)+1)} disponibles`).join(' · ')}</span>`:""}}
function renderSiiDocuments(){const tbody=$("#siiDocumentsTable");if(!tbody)return;tbody.innerHTML=siiState.documentos.length?siiState.documentos.map(x=>{const local=Boolean(x.es_prueba_local);return `<tr class="${local?'sii-local-row':''}"><td>${esc(siiFormatDate(x.fecha_emision||x.creado_en))}</td><td><strong>${Number(x.tipo_dte)}</strong><small>${esc(SII_DTE_NAMES[x.tipo_dte]||'DTE')}</small>${local?'<small class="sii-local-label">PRUEBA LOCAL</small>':''}</td><td class="folio-cell"><strong>${Number(x.folio||0).toLocaleString('es-CL')}</strong></td><td class="sii-order-number"><strong>${esc(x.pedido_numero||((data.orders||[]).find(o=>String(o.id)===String(x.pedido_id))?.numero_pedido)||x.pedido_id||'—')}</strong></td><td class="sii-doc-name"><strong>${esc(x.razon_social_receptor||'')}</strong><small>${esc(x.rut_receptor||'')}</small></td><td class="money-cell">${money(x.total||0)}</td><td><span class="sii-status-pill ${siiStatusClass(x.estado)}">${esc(x.estado||'—')}</span>${x.estado_sii?`<small>SII: ${esc(x.estado_sii)}</small>`:''}</td><td class="sii-track">${local?'NO ENVIADO':esc(x.track_id||'—')}</td><td><div class="sii-action-row">${x.track_id?`<button class="btn btn-light btn-compact" type="button" data-sii-query="${esc(x.id)}">Consultar SII</button>`:''}<button class="btn btn-light btn-compact" type="button" data-sii-pdf="${esc(x.id)}"><i class="bi bi-file-earmark-pdf"></i> PDF</button><button class="btn btn-light btn-compact" type="button" data-sii-detail="${esc(x.id)}">Ver XML</button></div></td></tr>`}).join(""):'<tr><td colspan="9" class="sii-document-empty">No hay documentos tributarios emitidos.</td></tr>'}
function renderSiiRuntime(){const c=siiState.config||{},cert=siiState.certificados.find(x=>String(x.id)===String(c.certificado_activo_id)),last=siiState.documentos[0],official=siiState.caf.filter(x=>x.activo&&!x.agotado&&!x.es_prueba_local).length,local=siiState.caf.filter(x=>x.activo&&!x.agotado&&x.es_prueba_local).length;$("#siiServiceStatus").textContent=SiiAPI?.configured()?"Configurado":"URL pendiente";$("#siiServiceVersion").textContent=c.version||"facturacion-sii";$("#siiCertificateStatus").textContent=cert?`${cert.alias||'Certificado'} · ${cert.rut_firmante||''}`:"Sin certificado";$("#siiCertificateExpiry").textContent=cert?`Vence ${siiFormatDate(cert.valido_hasta)}`:"Carga PFX/P12";$("#siiCafStatus").textContent=local?`${official} CAF SII · ${local} prueba local`:`${official} CAF activos`;$("#siiLastDteStatus").textContent=last?`${last.tipo_dte}-${last.folio} · ${last.estado}`:"Sin emisiones";$("#siiLastTrack").textContent=last?.track_id?`TrackID ${last.track_id}`:"—"}

function siiDownloadXml(filename,xml){const blob=new Blob([String(xml||"")],{type:"application/xml;charset=ISO-8859-1"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=String(filename||"respuesta.xml").replace(/[^a-zA-Z0-9._-]/g,"_");document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function siiDteDeadline(row){if(!row?.fecha_limite_eventos)return"";const d=new Date(row.fecha_limite_eventos);if(Number.isNaN(d.getTime()))return"";const days=Math.ceil((d.getTime()-Date.now())/86400000);return days<0?`Plazo vencido ${siiFormatDate(d)}`:days===0?`Vence hoy · ${siiFormatDate(d)}`:`${days} día${days===1?'':'s'} · ${siiFormatDate(d)}`}
function siiExchangeSignature(x){return x.firma_valida===true?'<span class="sii-status-pill ok">Válida</span>':x.firma_valida===false?'<span class="sii-status-pill error">No válida</span>':x.firma_presente?'<span class="sii-status-pill warn">No verificada</span>':'<span class="sii-status-pill warn">Sin firma</span>'}
function renderSiiExchange(){const tbody=$("#siiExchangeTable");const rows=siiState.intercambios||[],inbound=$("#siiInboundStatus");if(inbound){inbound.className=`sii-issue-status span-2 ${siiState.inboundEmailWebhook?'ok':'warn'}`;inbound.innerHTML=`<i class="bi ${siiState.inboundEmailWebhook?'bi-envelope-check':'bi-envelope-exclamation'}"></i><span>${siiState.inboundEmailWebhook?'Recepción automática de DTE por correo/webhook habilitada.':'Recepción automática pendiente: configura SII_DTE_INBOUND_SECRET en la Edge Function. La importación manual XML/MIME sigue disponible.'}</span>`}if(!tbody)return;tbody.innerHTML=rows.length?rows.map(x=>`<tr><td>${esc(siiFormatDate(x.fecha_emision||x.recibido_en))}<small>${esc(x.origen_recepcion||'MANUAL')}</small></td><td><strong>${esc(x.razon_social_emisor||x.rut_emisor||'')}</strong><small>${esc(x.rut_emisor||'')}</small></td><td><strong>${Number(x.tipo_dte)} / ${Number(x.folio).toLocaleString('es-CL')}</strong><small>${esc(SII_DTE_NAMES[x.tipo_dte]||'DTE')}</small></td><td class="money-cell">${money(x.monto_total||0)}</td><td>${siiExchangeSignature(x)}</td><td><span class="sii-status-pill ${String(x.estado_recepcion).includes('CONFORME')?'ok':'warn'}">${esc(x.estado_recepcion||'PENDIENTE')}</span></td><td><span class="sii-status-pill ${x.estado_comercial==='ACEPTADO'?'ok':x.estado_comercial==='RECHAZADO'?'error':'warn'}">${esc(x.estado_comercial||'PENDIENTE')}</span>${x.acuse_mercaderias?'<small>Acuse mercaderías/servicios</small>':''}</td><td><div class="sii-action-row"><button class="btn btn-light btn-compact" data-sii-x-response="RECEPCION_ENVIO" data-id="${esc(x.id)}">Recepción XML</button><button class="btn btn-light btn-compact" data-sii-x-response="ACEPTACION" data-id="${esc(x.id)}">Aceptar XML</button><button class="btn btn-light btn-compact" data-sii-x-response="RECHAZO" data-id="${esc(x.id)}">Rechazar XML</button><button class="btn btn-light btn-compact" data-sii-x-response="ACUSE_MERCADERIAS" data-id="${esc(x.id)}">Acuse XML</button><button class="btn btn-light btn-compact" data-sii-x-detail="${esc(x.id)}">XML recibido</button></div></td></tr>`).join(''):'<tr><td colspan="8" class="sii-document-empty">No hay DTE recibidos. Importa un EnvioDTE XML/MIME o habilita la recepción automática.</td></tr>'}
function renderPurchaseDte(){const tbody=$("#purchaseDteTable"),rows=siiState.intercambios||[];if($("#purchaseDteCount"))$("#purchaseDteCount").textContent=rows.length.toLocaleString('es-CL');if($("#purchaseDtePending"))$("#purchaseDtePending").textContent=rows.filter(x=>[33,34,43].includes(Number(x.tipo_dte))&&!x.evento_sii_codigo).length.toLocaleString('es-CL');if($("#purchaseDteUnregistered"))$("#purchaseDteUnregistered").textContent=rows.filter(x=>[33,34,43].includes(Number(x.tipo_dte))&&!x.registrado_compra&&x.estado_comercial!=='RECHAZADO').length.toLocaleString('es-CL');if($("#purchaseDteTotal"))$("#purchaseDteTotal").textContent=money(rows.reduce((a,x)=>a+Number(x.monto_total||0),0));if(!tbody)return;tbody.innerHTML=rows.length?rows.map(x=>{const deadline=siiDteDeadline(x),legal=x.evento_sii_codigo||'PENDIENTE',legalCls=['RCD','RFP','RFT'].includes(legal)?'error':['ACD','ERM'].includes(legal)?'ok':'warn',purchase=x.registrado_compra?`<span class="sii-status-pill ok">Registrada</span>${x.compra_id?`<small>${esc(x.compra_id)}</small>`:''}`:'<span class="sii-status-pill warn">Pendiente</span>',canPurchase=[33,34,43].includes(Number(x.tipo_dte))&&x.estado_comercial!=='RECHAZADO'&&!['RCD','RFP','RFT'].includes(String(x.evento_sii_codigo||''));return `<tr><td>${esc(siiFormatDate(x.recibido_en))}<small>${esc(x.origen_recepcion||'MANUAL')}</small></td><td><strong>${esc(x.razon_social_emisor||'Proveedor')}</strong><small>${esc(x.rut_emisor||'')}</small></td><td><strong>${Number(x.tipo_dte)} / ${Number(x.folio).toLocaleString('es-CL')}</strong><small>${esc(SII_DTE_NAMES[x.tipo_dte]||'DTE')}</small></td><td class="money-cell"><small>Neto ${money(x.monto_neto||0)}</small><small>IVA ${money(x.monto_iva||0)}</small><strong>${money(x.monto_total||0)}</strong></td><td><span class="sii-status-pill ${String(x.estado_recepcion).includes('CONFORME')?'ok':'warn'}">${esc(x.estado_recepcion||'PENDIENTE')}</span><small>${esc(x.estado_comercial||'PENDIENTE')}</small></td><td><span class="sii-status-pill ${legalCls}">${esc(legal)}</span>${deadline?`<small>${esc(deadline)}</small>`:'<small>Sin fecha SII sincronizada</small>'}</td><td>${purchase}</td><td><div class="sii-action-row"><button class="btn btn-light btn-compact" data-sii-registry-sync="${esc(x.id)}">Sincronizar SII</button>${[33,34,43].includes(Number(x.tipo_dte))?`<button class="btn btn-primary btn-compact" data-sii-registry="${esc(x.id)}">Acción SII</button>`:''}${canPurchase&&!x.registrado_compra?`<button class="btn btn-light btn-compact" data-sii-purchase="${esc(x.id)}">Registrar compra</button>`:''}<button class="btn btn-light btn-compact" data-sii-x-detail="${esc(x.id)}">Ver XML</button></div></td></tr>`}).join(''):'<tr><td colspan="8" class="sii-document-empty">No hay DTE de compras recibidos.</td></tr>'}
async function loadSiiExchange(){const out=await SiiAPI.exchangeList(token);siiState.intercambios=out.documentos||[];siiState.intercambioRespuestas=out.respuestas||[];siiState.intercambioDetalles=out.detalles||[];siiState.inboundEmailWebhook=Boolean(out.inbound_email_webhook);renderSiiExchange();renderPurchaseDte();return out}
async function importSiiExchangeFile(){const file=$("#siiExchangeFile")?.files?.[0];if(!file)throw new Error("Selecciona un XML, EML o MIME");const text=await fileAsText(file),name=String(file.name||"");const isMime=/\.(eml|mime)$/i.test(name)||String(file.type||'').toLowerCase()==='message/rfc822';const out=isMime?await SiiAPI.exchangeMimeImport(text,name,token):await SiiAPI.exchangeImport(text,name,token);$("#siiExchangeFile").value="";const label=$("#siiExchangeModal .file-name");if(label)label.textContent="Sin archivo seleccionado";await loadSiiExchange();toast(`✓ ${Number(out.importados||0)} DTE recibido${Number(out.importados||0)===1?'':'s'} registrado${Number(out.importados||0)===1?'':'s'}`);return out}
function openSiiRegistryEvent(id){const row=(siiState.intercambios||[]).find(x=>String(x.id)===String(id));if(!row)return toast('✕ DTE recibido no encontrado');$("#siiRegistryDteId").value=row.id;$("#siiRegistryEventSubtitle").textContent=`${row.razon_social_emisor||row.rut_emisor} · DTE ${row.tipo_dte} · Folio ${Number(row.folio).toLocaleString('es-CL')}`;$("#siiRegistryAction").value=row.evento_sii_codigo==='ERM'?'ERM':'ACD';openSiiModal('siiRegistryEventModal')}
async function applySiiRegistryEvent(){const id=$("#siiRegistryDteId").value,accion=$("#siiRegistryAction").value;if(!id)throw new Error('DTE_REQUERIDO');const labels={ACD:'Aceptar contenido del documento',ERM:'Otorgar recibo de mercaderías/servicios',RCD:'Reclamar contenido del documento',RFP:'Reclamar falta parcial',RFT:'Reclamar falta total'};if(!confirm(`${labels[accion]||accion}\n\nEsta acción se enviará al Registro de Aceptación/Reclamo del SII. ¿Continuar?`))return;const out=await SiiAPI.registryEvent(id,accion,token);if(!out.registrado)throw new Error(`${out.codigo||'SII'} · ${out.glosa||'El SII no registró la acción'}`);closeSiiModals();await loadSiiExchange();toast(`✓ SII ${accion}: ${out.glosa||'Acción registrada'}`)}
async function handleReceivedDteClick(e){const response=e.target.closest('[data-sii-x-response]'),detail=e.target.closest('[data-sii-x-detail]'),sync=e.target.closest('[data-sii-registry-sync]'),registry=e.target.closest('[data-sii-registry]'),purchase=e.target.closest('[data-sii-purchase]');if(response){return busy(response,async()=>{try{const tipo=response.dataset.siiXResponse,id=response.dataset.id,glosa=tipo==='RECHAZO'?(prompt('Motivo del rechazo comercial XML:','Documento rechazado comercialmente')||'Documento rechazado comercialmente'):'';const out=await SiiAPI.exchangeResponse(id,tipo,glosa,token);siiDownloadXml(out.filename||`${tipo}.xml`,out.xml_respuesta);await loadSiiExchange();toast(`✓ ${tipo.replaceAll('_',' ')} generada y firmada`)}catch(err){toast(`✕ ${err.message||err}`)}})}if(detail){return busy(detail,async()=>{try{const out=await SiiAPI.exchangeDetail(detail.dataset.siiXDetail,token),d=out.documento||{};siiDownloadXml(`DTE_RECIBIDO_${Number(d.tipo_dte||0)}_${Number(d.folio||0)}.xml`,out.xml_recibido||'')}catch(err){toast(`✕ ${err.message||err}`)}})}if(sync){return busy(sync,async()=>{try{const out=await SiiAPI.registrySync(sync.dataset.siiRegistrySync,token);await loadSiiExchange();toast(`✓ Registro SII sincronizado${out.evento?` · ${out.evento}`:''}`)}catch(err){toast(`✕ ${err.message||err}`)}})}if(registry){openSiiRegistryEvent(registry.dataset.siiRegistry);return}if(purchase){return busy(purchase,async()=>{try{const out=await SiiAPI.exchangeRegisterPurchase(purchase.dataset.siiPurchase,token);await Promise.all([loadSiiExchange(),loadAdminModules({modules:['suppliers','inventory'],retry:true})]);renderInventory();toast(out.already?'✓ La compra ya estaba registrada':'✓ Compra registrada e integrada a mercadería/insumos')}catch(err){toast(`✕ ${err.message||err}`)}})}}
function renderSiiCertification(){const tbody=$("#siiCertificationTable");if(!tbody)return;const stages=siiState.certificacion||[],states=['PENDIENTE','EN_PROCESO','COMPLETADO','OBSERVADO'];tbody.innerHTML=stages.length?stages.map(x=>`<tr><td><strong>${Number(x.orden)}. ${esc(x.nombre||x.codigo)}</strong><small>${esc(x.codigo)}</small></td><td><select class="sii-cert-state" data-code="${esc(x.codigo)}">${states.map(s=>`<option value="${s}" ${s===x.estado?'selected':''}>${s.replace('_',' ')}</option>`).join('')}</select></td><td><input class="sii-cert-detail" data-code="${esc(x.codigo)}" value="${esc(x.detalle||'')}" placeholder="Resultado, TrackID, fecha o observación"><input class="sii-cert-evidence" data-code="${esc(x.codigo)}" value="${esc(x.evidencia||'')}" placeholder="Evidencia / referencia oficial"></td><td><button class="btn btn-primary btn-compact" data-sii-cert-save="${esc(x.codigo)}">Guardar</button></td></tr>`).join(''):'<tr><td colspan="4" class="sii-document-empty">Ejecuta los SQL R9.18.126 y R9.18.127 para habilitar intercambio, compras y control de certificación.</td></tr>';$("#siiCertReceivedCount").textContent=Number(siiState.certMetricas?.dte_recibidos||0).toLocaleString('es-CL');$("#siiCertResponseCount").textContent=Number(siiState.certMetricas?.respuestas_generadas||0).toLocaleString('es-CL')}
async function loadSiiCertification(){const out=await SiiAPI.certificationStatus(token);siiState.certificacion=out.etapas||[];siiState.certMetricas=out.metricas||{};renderSiiCertification();return out}

function renderSiiAll(){renderSiiConfig();renderSiiCertificates();renderSiiCaf();renderSiiDocuments();renderSiiRuntime();updateSiiIssueModeUi()}
function closeSiiModals(){ $$('.sii-modal').forEach(x=>x.classList.add('hidden'));document.body.classList.remove('sii-modal-open') }
function openSiiModal(id){const modal=$(`#${CSS.escape(String(id||''))}`);if(!modal)return;closeSiiModals();modal.classList.remove('hidden');document.body.classList.add('sii-modal-open');const focusable=modal.querySelector('input,select,button,textarea');setTimeout(()=>focusable?.focus({preventScroll:true}),0)}
async function openSiiManagerModal(id){try{await loadSiiBilling(false);if(id==="siiExchangeModal")await loadSiiExchange();if(id==="siiCertificationModal")await loadSiiCertification()}catch(err){console.warn("open sii manager",err);toast(`✕ ${err.message||err}`)}openSiiModal(id)}
window.openOrderSiiIssue=async(orderId,tipoDte=33)=>{
  const o=data.orders.find(x=>String(x.id)===String(orderId));
  if(!o)return toast('✕ Pedido no encontrado');
  if(orderState(o.estado)==='CANCELADO')return toast('✕ Un pedido CANCELADO no puede emitir documentos tributarios.');
  try{await loadSiiBilling(false)}catch(err){console.warn('load sii from order',err)}
  $('#siiTipoDte').value=String(tipoDte);
  $('#siiPedidoId').value=String(o.numero_pedido||o.id||'');
  $('#siiRutReceptor').value=o.rut||'';
  $('#siiRazonReceptor').value=o.razon_social||o.nombre||'';
  $('#siiGiroReceptor').value='';
  $('#siiDireccionReceptor').value=o.direccion||'';
  $('#siiComunaReceptor').value=o.comuna||'';
  $('#siiCiudadReceptor').value=o.ciudad||'';
  const ctx=$('#siiEmitContext');if(ctx)ctx.textContent=`Pedido ${o.numero_pedido||o.id} · ${SII_DTE_NAMES[Number(tipoDte)]||'Documento tributario'}`;
  toggleSiiReferenceFields();openSiiModal('siiEmitModal');
  try{await loadSiiOrderData()}catch(err){console.warn('prefill sii order',err);toast('Revisa los datos tributarios del cliente antes de emitir.')}
};
async function loadSiiBilling(force=false){if(!window.SiiAPI||!SiiAPI.configured()){renderSiiRuntime();toast("Configura SII_API_URL en config.js");return}if(siiState.loaded&&!force){renderSiiAll();return}try{const out=await SiiAPI.status(token);siiState.config=out.config||{};siiState.certificados=out.certificados||[];siiState.caf=out.caf||[];siiState.documentos=out.documentos||[];siiState.loaded=true;renderSiiAll()}catch(err){console.warn("SII status",err);toast(`✕ Facturación SII: ${err.message||err}`)}}
async function saveSiiConfig(){const payload={ambiente:$("#siiEnvironment").value,habilitado:$("#siiEnabled").value==="SI",rut_emisor:$("#siiRutEmisor").value.trim(),razon_social:$("#siiRazonSocial").value.trim(),giro:$("#siiGiro").value.trim(),acteco:$("#siiActeco").value.trim(),direccion_origen:$("#siiDireccion").value.trim(),comuna_origen:$("#siiComuna").value.trim(),ciudad_origen:$("#siiCiudad").value.trim(),direccion_regional_sii:$("#siiDireccionRegional")?.value.trim()||"",email_emisor:$("#siiEmail").value.trim(),numero_resolucion:$("#siiResolucionNumero").value,fecha_resolucion:$("#siiResolucionFecha").value,boleta_api_habilitada:$("#siiBoletaApiEnabled")?.value==="SI",boleta_modelo_emision:$("#siiBoletaEmissionModel")?.value||"POR_DEFINIR",boleta_formato:$("#siiBoletaFormat")?.value||"TICKET_80"};const out=await SiiAPI.saveConfig(payload,token);siiState.config=out.config||payload;renderSiiAll();toast("✓ Configuración SII guardada")}
async function uploadSiiCertificate(){const file=$("#siiCertFile")?.files?.[0];if(!file)return toast("Selecciona un certificado PFX/P12");const password=$("#siiCertPassword").value;if(!password)return toast("Ingresa la contraseña del certificado");const rut=$("#siiCertRut").value.trim();if(!rut)return toast("Ingresa el RUT del firmante");const pfx_base64=await fileAsBase64(file);await SiiAPI.uploadCertificate({alias:$("#siiCertAlias").value.trim()||"Certificado SII",rut_firmante:rut,password,pfx_base64},token);$("#siiCertPassword").value="";$("#siiCertFile").value="";siiState.loaded=false;await loadSiiBilling(true);toast("✓ Certificado cifrado y cargado")}
async function uploadSiiCaf(){const file=$("#siiCafFile")?.files?.[0];if(!file)return toast("Selecciona un CAF XML o un XML de folios de prueba local");const xml=await fileAsText(file);try{const out=await SiiAPI.uploadCaf(xml,token);$("#siiCafFile").value="";const name=$("#siiCafModal .file-name");if(name)name.textContent="Sin archivo seleccionado";siiState.loaded=false;await loadSiiBilling(true);if(out?.modo==="PRUEBA_LOCAL")toast(`✓ Folios de PRUEBA LOCAL importados · DTE ${out.caf?.tipo_dte} · ${Number(out.caf?.folio_desde||0).toLocaleString('es-CL')}–${Number(out.caf?.folio_hasta||0).toLocaleString('es-CL')}`);else toast(`✓ CAF SII importado · DTE ${out.caf?.tipo_dte} · ${Number(out.caf?.folio_desde||0).toLocaleString('es-CL')}–${Number(out.caf?.folio_hasta||0).toLocaleString('es-CL')}`)}catch(err){console.warn("sii caf upload",err);const code=String(err?.message||err||"");const msg=code.includes("FOLIOS_PRUEBA_RUT_NO_COINCIDE")?"El RUT del archivo de prueba no coincide con el RUT emisor configurado":code.includes("PRUEBA_LOCAL_NO_PERMITIDOS_EN_PRODUCCION")?"Los folios de prueba local solo se pueden cargar en CERTIFICACIÓN":code.includes("CAF_ESTRUCTURA_INVALIDA")?"El XML no corresponde a un CAF oficial SII ni a un archivo de prueba local compatible":code;toast(`✕ ${msg}`);throw err}}
async function generateSiiLocalFolios(){const tipo=Number($("#siiLocalFolioDte")?.value||33),cantidad=Number($("#siiLocalFolioQty")?.value||100),vigencia_cantidad=Number($("#siiLocalFolioValidity")?.value||3),vigencia_unidad=$("#siiLocalFolioValidityUnit")?.value||"MESES";if(!Number.isInteger(cantidad)||cantidad<1||cantidad>10000)throw new Error("Cantidad debe estar entre 1 y 10.000");if(!Number.isInteger(vigencia_cantidad)||vigencia_cantidad<1||vigencia_cantidad>120)throw new Error("Vigencia inválida");const out=await SiiAPI.generateLocalFolios({tipo_dte:tipo,cantidad,vigencia_cantidad,vigencia_unidad},token);siiState.loaded=false;await loadSiiBilling(true);toast(`✓ PRUEBA LOCAL creada · DTE ${out.caf?.tipo_dte} · ${Number(out.caf?.folio_desde||0).toLocaleString('es-CL')}–${Number(out.caf?.folio_hasta||0).toLocaleString('es-CL')}`);return out}
function openSiiFoliosPortal(){const prod=String(siiState.config?.ambiente||'').toUpperCase()==='PRODUCCION',url=prod?'https://www.sii.cl/servicios_online/1039-1184.html':'https://www.sii.cl/servicios_online/1039-menu_certificacion-1184.html';window.open(url,'_blank','noopener,noreferrer')}
function siiAvailableCaf(tipo,local){const now=Date.now();return siiState.caf.find(x=>Number(x.tipo_dte)===Number(tipo)&&Boolean(x.es_prueba_local)===Boolean(local)&&x.activo&&!x.agotado&&Number(x.proximo_folio||0)<=Number(x.folio_hasta||0)&&(!local||!x.vence_prueba||new Date(x.vence_prueba).getTime()>now))||null}
function resolveSiiIssueMode(){const tipo=Number($("#siiTipoDte")?.value||0),requested=$("#siiIssueMode")?.value||"AUTO",prod=String(siiState.config?.ambiente||"").toUpperCase()==="PRODUCCION",official=siiAvailableCaf(tipo,false),local=siiAvailableCaf(tipo,true),boleta=[39,41].includes(tipo);if(prod)return{mode:"SII",official,local:null};if(requested==="PRUEBA_LOCAL")return{mode:local?"PRUEBA_LOCAL":"PRUEBA_LOCAL_SIN_FOLIOS",official,local};if(requested==="SII")return{mode:"SII",official,local};if(boleta&&local)return{mode:"PRUEBA_LOCAL",official,local};if(official)return{mode:"SII",official,local};if(local)return{mode:"PRUEBA_LOCAL",official,local};return{mode:"SII",official:null,local:null}}
function siiExistingForIssue(tipo=null,mode=null){
  const t=Number((tipo??$("#siiTipoDte")?.value)||0),m=mode||resolveSiiIssueMode();if(!siiLoadedOrderId||!SINGLE_SII_ORDER_TYPES.has(t))return null;
  const local=m.mode==="PRUEBA_LOCAL",env=local?'CERTIFICACION':String(siiState.config?.ambiente||'CERTIFICACION').toUpperCase();return (siiLoadedOrderDocs||[]).find(x=>Number(x.tipo_dte)===t&&Boolean(x.es_prueba_local)===local&&String(x.ambiente||'CERTIFICACION').toUpperCase()===env)||null
}
const SINGLE_SII_ORDER_TYPES=new Set([33,34,39,41]);
function updateSiiIssueModeUi(){
  const btn=$("#siiEmitDte"),note=$("#siiIssueModeNotice"),sel=$("#siiIssueMode");if(!btn)return;
  const tipo=Number($("#siiTipoDte")?.value||0),m=resolveSiiIssueMode(),prod=String(siiState.config?.ambiente||"").toUpperCase()==="PRODUCCION",existing=siiExistingForIssue(tipo,m);
  if(sel){
    sel.querySelector('option[value="PRUEBA_LOCAL"]')?.toggleAttribute('disabled',prod||!siiAvailableCaf(tipo,true));
    if(prod&&sel.value==="PRUEBA_LOCAL")sel.value="SII";
  }
  const clearStatus=()=>{if(note){note.className="sii-issue-status hidden span-2";note.innerHTML=""}};
  const showStatus=(text,tone="warn")=>{if(note){note.className=`sii-issue-status span-2 ${tone}`;note.innerHTML=`<i class="bi ${tone==="error"?"bi-exclamation-triangle":tone==="ok"?"bi-check-circle":"bi-info-circle"}"></i><span>${esc(text)}</span>`}};
  clearStatus();
  btn.disabled=false;

  if(existing){
    btn.innerHTML=`<i class="bi bi-eye"></i> Ver documento`;
    showStatus(`Documento ya emitido · Folio ${Number(existing.folio||0).toLocaleString('es-CL')}`,"ok");
    return;
  }
  if(m.mode==="PRUEBA_LOCAL"){
    btn.innerHTML='<i class="bi bi-receipt"></i> Generar documento';
    return;
  }
  if(m.mode==="PRUEBA_LOCAL_SIN_FOLIOS"){
    btn.innerHTML='<i class="bi bi-receipt"></i> Generar documento';
    btn.disabled=true;
    showStatus("Sin folios de prueba disponibles","error");
    return;
  }
  if([39,41].includes(tipo)){
    const enabled=Boolean(siiState.config?.boleta_api_habilitada);
    const modelo=String(siiState.config?.boleta_modelo_emision||'POR_DEFINIR').toUpperCase();
    const modeloOk=modelo!=="POR_DEFINIR";
    btn.innerHTML='<i class="bi bi-receipt"></i> Generar documento';
    if(!enabled){btn.disabled=true;showStatus("Emisión SII de Boleta deshabilitada","error")}
    else if(!modeloOk){btn.disabled=true;showStatus("Modelo de emisión de Boleta pendiente","error")}
    else if(!m.official){btn.disabled=true;showStatus("CAF oficial no disponible","error")}
    return;
  }
  btn.innerHTML='<i class="bi bi-receipt"></i> Generar documento';
  if(!m.official){btn.disabled=true;showStatus("CAF no disponible","error")}
}
function toggleSiiReferenceFields(){const tipo=Number($("#siiTipoDte")?.value||0),show=[56,61].includes(tipo),boleta=[39,41].includes(tipo);$$('.sii-reference-field').forEach(x=>x.classList.toggle('hidden',!show));$$('.sii-boleta-format-field').forEach(x=>x.classList.toggle('hidden',!boleta));if(boleta&&$("#siiBoletaPrintFormat")&&!$("#siiBoletaPrintFormat").value)$("#siiBoletaPrintFormat").value=siiState.config?.boleta_formato||"TICKET_80";updateSiiIssueModeUi()}
function siiPdfMoney(v){return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v||0))}
function siiPdfText(v){return String(v??'').replace(/[\r\n]+/g,' ').trim()}
function siiPdfDate(v){if(!v)return'';const s=String(v).slice(0,10),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:s}
function createSiiPdf417(text){
  if(!window.bwipjs)throw new Error('LIBRERIA_PDF417_NO_DISPONIBLE');
  const canvas=document.createElement('canvas'),latin1=String(text||'').normalize('NFC').replace(/[^\x00-\xFF]/g,'?');
  window.bwipjs.toCanvas(canvas,{bcid:'pdf417',text:latin1,binarytext:true,scale:4,columns:10,eclevel:5,rowmult:3,paddingwidth:0,paddingheight:0});
  const ratio=Math.max(.1,canvas.width/Math.max(1,canvas.height));
  let width=88,height=width/ratio;
  if(height>30){height=30;width=Math.min(90,height*ratio)}
  if(height<20){height=20;width=Math.min(90,height*ratio)}
  if(width<50){width=50;height=Math.min(30,width/ratio)}
  return{data:canvas.toDataURL('image/png'),width,height}
}
function createSiiVerificationQr(text){
  if(!text||!window.bwipjs)return null;
  try{const canvas=document.createElement('canvas');window.bwipjs.toCanvas(canvas,{bcid:'qrcode',text:String(text),scale:4,eclevel:'M',paddingwidth:0,paddingheight:0});return{data:canvas.toDataURL('image/png')}}catch(err){console.warn('QR_DTE_NO_DISPONIBLE',err);return null}
}
async function siiPdfBase64(blob){return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result||'').split(',')[1]||'');fr.onerror=reject;fr.readAsDataURL(blob)})}
async function persistSiiPdf(documentId,pdfResult){if(!documentId||!pdfResult?.base64)return null;try{return await SiiAPI.savePdf(documentId,pdfResult.base64,token)}catch(err){console.warn('SII_PDF_SAVE',err);toast('⚠ El DTE fue generado, pero no fue posible publicar su PDF para reimpresión por QR');return null}}
// R9.18.118-UI-EMISION-LIMPIA
async function generateSiiBoletaTicketPdf(rep,targetWindow=null){
  if(!window.jspdf?.jsPDF)throw new Error('LIBRERIA_PDF_NO_DISPONIBLE');
  const {jsPDF}=window.jspdf,tipo=Number(rep?.tipo_dte||0),local=Boolean(rep?.es_prueba_local),fmt=String(rep?.formato_impresion||'TICKET_80').toUpperCase(),width=fmt==='TICKET_57'?57:fmt==='TICKET_58'?58:80,margin=4,content=width-margin*2,em=rep.emisor||{},rc=rep.receptor||{},tot=rep.totales||{},items=Array.isArray(rep.items)?rep.items:[];
  const estimated=Math.max(185,120+items.reduce((s,it)=>s+Math.max(8,Math.ceil(siiPdfText([it.nombre,it.descripcion].filter(Boolean).join(' - ')).length/((fmt==='TICKET_57'||fmt==='TICKET_58')?27:42))*4),0)+(rep.verification_url?34:18));
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:[width,Math.min(1000,estimated)],compress:true});let y=5;
  // R9.18.116: en ticket, el QR complementario va arriba del logo. A4 no cambia.
  if(rep.verification_url){
    const topQr=createSiiVerificationQr(rep.verification_url);
    if(topQr){
      const qs=(fmt==='TICKET_57'||fmt==='TICKET_58')?16:18;
      doc.addImage(topQr.data,'PNG',(width-qs)/2,y,qs,qs,undefined,'FAST');
      y+=qs+2;
      doc.setFont('helvetica','normal');
      doc.setFontSize((fmt==='TICKET_57'||fmt==='TICKET_58')?5.4:6);
      doc.text('Consultar / reimprimir',width/2,y,{align:'center',maxWidth:content});
      y+=4;
    }
  }
  const logo=await siiDteLogoDataUrl(em.logo_url||data.config?.logo_url||'');
  if(logo){
    try{
      const compact=fmt==='TICKET_57'||fmt==='TICKET_58';
      const maxW=compact?Math.min(content*.68,30):Math.min(content*.62,42);
      const maxH=compact?14:18;
      const sz=siiTicketLogoSize(doc,logo,maxW,maxH);
      doc.addImage(logo,pdfImageType(logo),(width-sz.w)/2,y,sz.w,sz.h,undefined,'FAST');
      y+=sz.h+3;
    }catch(e){console.warn('SII_BOLETA_LOGO',e)}
  }
  doc.setFont('helvetica','bold');doc.setFontSize(fmt==='TICKET_57'?8.2:9.5);doc.text(siiPdfText(em.razon_social||'EMISOR'),width/2,y,{align:'center',maxWidth:content});y+=4;
  doc.setFont('helvetica','normal');doc.setFontSize(fmt==='TICKET_57'?6.7:7.5);[em.giro,em.direccion,[em.comuna,em.ciudad].filter(Boolean).join(' - ')].filter(Boolean).forEach(v=>{const lines=doc.splitTextToSize(siiPdfText(v),content);doc.text(lines,width/2,y,{align:'center'});y+=lines.length*3.3});
  y+=2;doc.setLineWidth(.35);doc.rect(margin,y,content,24);doc.setFont('helvetica','bold');doc.setFontSize(fmt==='TICKET_57'?8:9);doc.text(`R.U.T.: ${siiPdfText(em.rut)}`,width/2,y+6,{align:'center'});doc.text(siiPdfText(rep.nombre_dte||`DTE ${tipo}`).toUpperCase(),width/2,y+12,{align:'center',maxWidth:content-3});doc.setFontSize(fmt==='TICKET_57'?10:12);doc.text(`N° ${Number(rep.folio||0).toLocaleString('es-CL')}`,width/2,y+20,{align:'center'});y+=28;
  doc.setFont('helvetica','normal');doc.setFontSize(fmt==='TICKET_57'?6.5:7.2);doc.text(`Fecha: ${siiPdfDate(rep.fecha_emision)}`,margin,y);y+=4;if(rc.rut&&rc.rut!=='66666666-6'){doc.text(`RUT Cliente: ${siiPdfText(rc.rut)}`,margin,y);y+=4}if(rc.razon_social){const l=doc.splitTextToSize(`Cliente: ${siiPdfText(rc.razon_social)}`,content);doc.text(l,margin,y);y+=l.length*3.3}doc.line(margin,y,width-margin,y);y+=4;
  doc.setFont('helvetica','bold');doc.text('DETALLE',margin,y);y+=4;doc.setFont('helvetica','normal');
  for(const it of items){const name=siiPdfText([it.nombre,it.descripcion].filter(Boolean).join(' - ')),lines=doc.splitTextToSize(name,content);doc.text(lines,margin,y);y+=lines.length*3.2;doc.text(`${Number(it.cantidad||1)} x ${siiPdfMoney(it.precio_unitario)}`,margin,y);doc.text(siiPdfMoney(it.monto_item),width-margin,y,{align:'right'});y+=4.5}
  doc.line(margin,y,width-margin,y);y+=5;doc.setFont('helvetica','bold');doc.setFontSize((fmt==='TICKET_57'||fmt==='TICKET_58')?8.5:10);if(tipo===41&&Number(tot.exento||0)>0){doc.setFontSize((fmt==='TICKET_57'||fmt==='TICKET_58')?6.8:7.5);doc.text('MONTO EXENTO',margin,y);doc.text(siiPdfMoney(tot.exento),width-margin,y,{align:'right'});y+=5;doc.setFontSize((fmt==='TICKET_57'||fmt==='TICKET_58')?8.5:10)}else if(tipo===39){doc.setFontSize((fmt==='TICKET_57'||fmt==='TICKET_58')?6.8:7.5);doc.text('NETO',margin,y);doc.text(siiPdfMoney(tot.neto),width-margin,y,{align:'right'});y+=4;doc.text(`IVA (${Number(tot.tasa_iva||19)}%)`,margin,y);doc.text(siiPdfMoney(tot.iva),width-margin,y,{align:'right'});y+=5;doc.setFontSize((fmt==='TICKET_57'||fmt==='TICKET_58')?8.5:10)}doc.text('TOTAL',margin,y);doc.text(siiPdfMoney(tot.total),width-margin,y,{align:'right'});y+=5;if(Number(rep?.medio_pago||0)){const labels={1:'EFECTIVO',2:'PAGO ELECTRÓNICO',3:'TRANSFERENCIA ELECTRÓNICA',4:'CHEQUE',5:'OTRO'};doc.setFont('helvetica','normal');doc.setFontSize((fmt==='TICKET_57'||fmt==='TICKET_58')?6.2:7);doc.text(`Medio de pago: ${labels[Number(rep.medio_pago)]||siiPdfText(rep.medio_pago_glosa)||'OTRO'}`,margin,y,{maxWidth:content});y+=5}y+=2;
  if(local){doc.setTextColor(170,70,50);doc.setFont('helvetica','bold');doc.setFontSize(fmt==='TICKET_57'?6.8:7.5);const wm=doc.splitTextToSize('PRUEBA LOCAL · NO VÁLIDO TRIBUTARIAMENTE',content);doc.text(wm,width/2,y,{align:'center'});y+=wm.length*3.5+2;doc.setTextColor(0,0,0)}
  // Desde 2026 el timbre impreso en Boleta es opcional, pero se conserva para verificación. Si se imprime, respetamos >=45x20 mm y >200 dpi en el raster.
  if(rep.timbre){try{const canvas=document.createElement('canvas'),latin1=String(rep.timbre||'').normalize('NFC').replace(/[^\x00-\xFF]/g,'?');window.bwipjs.toCanvas(canvas,{bcid:'pdf417',text:latin1,binarytext:true,scale:5,columns:6,eclevel:5,rowmult:3,paddingwidth:0,paddingheight:0});const bw=Math.min(49,Math.max(45,content)),bh=Math.max(20,Math.min(28,bw/(canvas.width/Math.max(1,canvas.height))));doc.addImage(canvas.toDataURL('image/png'),'PNG',(width-bw)/2,y,bw,bh,undefined,'FAST');y+=bh+3;doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.text(local?'Timbre PRUEBA LOCAL - NO VALIDO SII':'Timbre Electrónico S.I.I.',width/2,y,{align:'center'});y+=4}catch(err){console.warn('SII_BOLETA_PDF417',err)}}
  doc.setFont('helvetica','normal');doc.setFontSize(fmt==='TICKET_57'?5.8:6.5);doc.text('Verifique documento: www.sii.cl',width/2,y,{align:'center'});y+=4;
  const finalHeight=siiTicketFitPageHeight(doc,y,estimated,7);
  doc.setProperties({title:`${rep.nombre_dte||'Boleta'} ${rep.folio||''}${local?' - PRUEBA LOCAL':''}`,subject:local?'PRUEBA LOCAL - NO VALIDO TRIBUTARIAMENTE':'Representación impresa Boleta Electrónica SII',author:siiPdfText(em.razon_social||'ALE ATENCIO'),keywords:'BOLETA SII TICKET PDF417 QR'});
  const blob=doc.output('blob'),base64=await siiPdfBase64(blob),url=URL.createObjectURL(blob),filename=`BOLETA_${tipo}_${rep.folio||0}_${fmt}${local?'_PRUEBA_LOCAL':''}.pdf`;if(targetWindow&&!targetWindow.closed)targetWindow.location.replace(url);else window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),120000);return{url,filename,copias:1,blob,base64,formato:fmt,page_height_mm:finalHeight}
}
async function generateSiiRepresentationPdf(rep,targetWindow=null){
  if(!window.jspdf?.jsPDF)throw new Error('LIBRERIA_PDF_NO_DISPONIBLE');
  const {jsPDF}=window.jspdf, tipo=Number(rep?.tipo_dte||0), local=Boolean(rep?.es_prueba_local), traslado=Number(rep?.ind_traslado||0);
  if([39,41].includes(tipo)&&String(rep?.formato_impresion||'TICKET_80').toUpperCase()!=="A4")return generateSiiBoletaTicketPdf(rep,targetWindow);
  const copies=[{cedible:false,label:''}];
  if([33,34].includes(tipo))copies.push({cedible:true,label:'CEDIBLE'});
  if(tipo===52&&(traslado===0||traslado===1||traslado===2||traslado===9))copies.push({cedible:true,label:'CEDIBLE CON SU FACTURA'});
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  const em=rep.emisor||{},rc=rep.receptor||{},tot=rep.totales||{},items=Array.isArray(rep.items)?rep.items:[],pageW=doc.internal.pageSize.getWidth(),margin=10;
  const logo=await siiDteLogoDataUrl(em.logo_url||data.config?.logo_url||'');
  const drawWatermark=()=>{if(!local)return;doc.setTextColor(224,216,211);doc.setFont('helvetica','bold');doc.setFontSize(24);doc.text('PRUEBA LOCAL - NO VALIDO SII',31,166,{angle:35});doc.setTextColor(0,0,0)};
  const header=(copy)=>{
    drawWatermark();doc.setTextColor(0,0,0);let issuerX=margin,issuerW=108;
    if(logo){try{const props=doc.getImageProperties(logo),boxW=34,boxH=20,ratio=Math.min(boxW/props.width,boxH/props.height),w=props.width*ratio,h=props.height*ratio;doc.addImage(logo,pdfImageType(logo),margin,10,w,h,undefined,'FAST');issuerX=48;issuerW=72}catch(err){console.warn('SII_LOGO_PDF',err)}}
    doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(siiPdfText(em.razon_social||'EMISOR'),issuerX,16,{maxWidth:issuerW});
    doc.setFont('helvetica','normal');doc.setFontSize(8.2);let y=23;[
      em.giro&&`Giro: ${em.giro}`,
      em.direccion&&`Casa Matriz: ${em.direccion}`,
      em.comuna&&`${em.comuna}${em.ciudad?` - ${em.ciudad}`:''}`,
      em.email&&`Email: ${em.email}`
    ].filter(Boolean).forEach(v=>{doc.text(siiPdfText(v),issuerX,y,{maxWidth:issuerW});y+=5});
    doc.setDrawColor(190,0,0);doc.setTextColor(190,0,0);doc.setLineWidth(.7);const fiscalX=pageW-margin-80,fiscalC=fiscalX+40;doc.rect(fiscalX,9,80,38);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(`R.U.T.: ${siiPdfText(em.rut)}`,fiscalC,18,{align:'center'});
    doc.setFontSize(10.5);const name=doc.splitTextToSize(siiPdfText(rep.nombre_dte||`DTE ${tipo}`).toUpperCase(),72);doc.text(name,fiscalC,26,{align:'center'});doc.setFontSize(12);doc.text(`N° ${Number(rep.folio||0).toLocaleString('es-CL')}`,fiscalC,41,{align:'center'});
    doc.setTextColor(0,0,0);doc.setDrawColor(0,0,0);doc.setFontSize(8);doc.text(`S.I.I. - ${siiPdfText(em.direccion_regional_sii||'DIRECCION REGIONAL')}`,fiscalC,52,{align:'center'});
    if(copy.cedible&&[33,34].includes(tipo)){doc.setTextColor(188,188,188);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('COPIA DE FACTURA NO DA DERECHO A CREDITO FISCAL',28,177,{angle:35});doc.setTextColor(0,0,0)}
  };
  const receptor=()=>{
    doc.setDrawColor(175,175,175);doc.setLineWidth(.25);doc.roundedRect(margin,60,pageW-2*margin,34,2,2);doc.setFontSize(8.4);doc.setFont('helvetica','bold');
    const rightX=pageW-84;doc.text('SEÑOR(ES):',13,67);doc.text('R.U.T.:',rightX,67);doc.text('GIRO:',13,75);doc.text('DIRECCIÓN:',13,83);doc.text('COMUNA:',rightX,83);doc.text('FECHA EMISIÓN:',rightX,91);
    doc.setFont('helvetica','normal');doc.text(siiPdfText(rc.razon_social),32,67,{maxWidth:rightX-38});doc.text(siiPdfText(rc.rut),rightX+15,67);doc.text(siiPdfText(rc.giro),26,75,{maxWidth:pageW-39});doc.text(siiPdfText(rc.direccion),34,83,{maxWidth:rightX-40});doc.text(`${siiPdfText(rc.comuna)}${rc.ciudad?` - ${siiPdfText(rc.ciudad)}`:''}`,rightX+18,83,{maxWidth:pageW-(rightX+28)});doc.text(siiPdfDate(rep.fecha_emision),rightX+28,91)
  };
  const tableHeader=(y)=>{doc.setFillColor(240,240,240);doc.rect(margin,y,pageW-2*margin,9,'F');doc.setDrawColor(165,165,165);doc.setFont('helvetica','bold');doc.setFontSize(7.7);doc.text('Item',12,y+5.8);doc.text('Código',24,y+5.8);doc.text('Descripción',48,y+5.8);doc.text('Cant.',pageW-77,y+5.8,{align:'right'});doc.text('Unid.',pageW-65,y+5.8);doc.text('P. Unitario',pageW-38,y+5.8,{align:'right'});doc.text('Valor',pageW-13,y+5.8,{align:'right'});doc.line(margin,y+9,pageW-margin,y+9);return y+9};
  const body=()=>{let y=101;y=tableHeader(y);doc.setFont('helvetica','normal');doc.setFontSize(7.8);for(const it of items){const desc=siiPdfText([it.nombre,it.descripcion].filter(Boolean).join(' - ')),lines=doc.splitTextToSize(desc,82),h=Math.max(8,lines.length*4+2);if(y+h>174)break;doc.text(String(it.nro||''),12,y+5.3);doc.text(siiPdfText(it.codigo||''),24,y+5.3,{maxWidth:20});doc.text(lines,48,y+5.3);doc.text(String(Number(it.cantidad||0)),pageW-77,y+5.3,{align:'right'});doc.text(siiPdfText(it.unidad||'UN'),pageW-65,y+5.3);doc.text(siiPdfMoney(it.precio_unitario),pageW-38,y+5.3,{align:'right'});doc.text(siiPdfMoney(it.monto_item),pageW-13,y+5.3,{align:'right'});doc.setDrawColor(226,226,226);doc.line(margin,y+h,pageW-margin,y+h);y+=h}return y};
  const drawTotals=()=>{let y=182,labelX=pageW-71,valueX=pageW-13;doc.setFont('helvetica','normal');doc.setFontSize(8.5);const isExempt=[34,41].includes(tipo);if(!isExempt){doc.text('MONTO NETO',labelX,y);doc.text(siiPdfMoney(tot.neto),valueX,y,{align:'right'});y+=6}if(Number(tot.exento||0)>0){doc.text('MONTO EXENTO',labelX,y);doc.text(siiPdfMoney(tot.exento),valueX,y,{align:'right'});y+=6}if(!isExempt&&Number(tot.iva||0)>0){doc.text(`IVA ${Number(tot.tasa_iva||19)}%`,labelX,y);doc.text(siiPdfMoney(tot.iva),valueX,y,{align:'right'});y+=6}doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('MONTO TOTAL',labelX,y);doc.text(siiPdfMoney(tot.total),valueX,y,{align:'right'})};
  const drawTimbre=()=>{const bx=20,by=211;let img=null;try{img=createSiiPdf417(rep.timbre);doc.addImage(img.data,'PNG',bx,by,img.width,img.height)}catch(e){doc.rect(bx,by,82,25);doc.setFontSize(7);doc.text('PDF417 NO DISPONIBLE',61,224,{align:'center'})}const center=bx+((img?.width||82)/2);doc.setFont('helvetica','bold');doc.setFontSize(7.3);doc.text(local?'Timbre de PRUEBA LOCAL - NO VALIDO SII':'Timbre Electrónico S.I.I.',center,246,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(6.7);const yr=rep.resolucion?.fecha?String(rep.resolucion.fecha).slice(0,4):'';doc.text(`Resolución Ex. SII N° ${rep.resolucion?.numero??''}${yr?` de ${yr}`:''} - verifique documento: www.sii.cl`,center,250.5,{align:'center'})};
  const drawVerificationQr=()=>{if(!rep.verification_url)return;const qr=createSiiVerificationQr(rep.verification_url);if(!qr)return;const x=10,y=251,size=17;try{doc.addImage(qr.data,'PNG',x,y,size,size,undefined,'FAST');doc.setFont('helvetica','normal');doc.setFontSize(5.6);doc.text('Reimprimir / verificar',x+size/2,270.8,{align:'center'})}catch(err){console.warn('SII_QR_PDF',err)}};
  const drawAcuse=(copy)=>{if(!copy.cedible)return;const x=pageW-105,y=207,w=95,h=50;doc.setDrawColor(110,110,110);doc.setLineWidth(.3);doc.rect(x,y,w,h);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('ACUSE DE RECIBO',x+3,y+6);doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.text('Nombre: ____________________________________',x+3,y+12);doc.text('RUT: __________________  Fecha: _____________',x+3,y+18);doc.text('Recinto: ___________________________________',x+3,y+24);doc.text('Firma: _____________________________________',x+3,y+30);doc.setFontSize(6.1);const leyenda='El acuse de recibo que se declara en este acto, de acuerdo a lo dispuesto en la letra b) del Art. 4°, y la letra c) del Art. 5° de la Ley 19.983, acredita que la entrega de mercaderías o servicio(s) prestado(s) ha(n) sido recibido(s).';doc.text(doc.splitTextToSize(leyenda,w-6),x+3,y+35,{maxWidth:w-6});doc.setFont('helvetica','bold');doc.setFontSize(copy.label.length>14?8:9);doc.text(copy.label,pageW-margin,269,{align:'right'})};
  const bottomNotice=()=>{if(local){doc.setTextColor(170,70,50);doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.text('DOCUMENTO GENERADO PARA PRUEBAS INTERNAS - SIN VALIDEZ TRIBUTARIA',pageW/2,275.2,{align:'center'});doc.setTextColor(0,0,0)}};
  copies.forEach((copy,i)=>{if(i>0)doc.addPage('a4','portrait');header(copy);receptor();body();drawTotals();drawTimbre();drawVerificationQr();drawAcuse(copy);bottomNotice()});
  doc.setProperties({title:`${rep.nombre_dte||'DTE'} ${rep.folio||''}${local?' - PRUEBA LOCAL':''}`,subject:local?'PRUEBA LOCAL - NO VALIDO TRIBUTARIAMENTE':'Representación impresa DTE conforme guía SII',author:siiPdfText(em.razon_social||'ALE ATENCIO'),keywords:'DTE SII PDF417 CEDIBLE'});
  const blob=doc.output('blob'),base64=await siiPdfBase64(blob),url=URL.createObjectURL(blob),filename=`DTE_${tipo}_${rep.folio||0}${local?'_PRUEBA_LOCAL':''}.pdf`;if(targetWindow&&!targetWindow.closed){targetWindow.location.replace(url)}else{window.open(url,'_blank','noopener')}setTimeout(()=>URL.revokeObjectURL(url),120000);return{url,filename,copias:copies.length,blob,base64}
}
async function loadSiiOrderData(){
  const ref=$("#siiPedidoId").value.trim();if(!ref)return toast("Ingresa el ID, N.º de pedido o solo el número; por ejemplo 24");
  const out=await SiiAPI.orderPreview(ref,token),o=out?.pedido||{};if(!o?.id)throw new Error("PEDIDO_NO_ENCONTRADO");
  siiLoadedOrderId=String(o.id);siiLoadedOrderDocs=Array.isArray(out.documentos_existentes)?out.documentos_existentes:[];siiLoadedOrderItems=Array.isArray(out.items)?out.items:[];
  $("#siiPedidoId").value=o.numero_pedido||ref;$("#siiRutReceptor").value=o.rut||"";$("#siiRazonReceptor").value=o.razon_social||o.nombre||"";$("#siiGiroReceptor").value=o.giro||"";$("#siiDireccionReceptor").value=o.direccion||"";$("#siiComunaReceptor").value=o.comuna||"";$("#siiCiudadReceptor").value=o.ciudad||"";
  const preview=$("#siiOrderPreview");if(preview){
    const previewTipo=Number($("#siiTipoDte").value||0),fiscalReceiver=[33,34,56,61].includes(previewTipo),missing=(fiscalReceiver?[!o.rut&&"RUT",!($("#siiRazonReceptor").value)&&"razón social",!o.giro&&"giro",!o.direccion&&"dirección",!o.comuna&&"comuna"]:[]).filter(Boolean),docs=siiLoadedOrderDocs.filter(x=>SINGLE_SII_ORDER_TYPES.has(Number(x.tipo_dte)));
    const giroInfo=fiscalReceiver?(o.giro_desde_clientes?`<small class="ok"><i class="bi bi-database-check"></i> Giro cargado desde el maestro de Clientes.</small>`:o.cliente_en_registro?`<small class="warn"><i class="bi bi-database-exclamation"></i> El cliente existe en Clientes, pero no tiene Giro registrado. Complétalo aquí; al emitir quedará guardado en su ficha.</small>`:`<small class="warn"><i class="bi bi-person-plus"></i> Este RUT aún no está en Clientes. El Giro se dejó en blanco. Completa los datos tributarios y, al emitir, el cliente será creado y vinculado al pedido.</small>`):`<small class="ok"><i class="bi bi-receipt-cutoff"></i> Boleta 39/41: el Giro del receptor no forma parte del XML. Si no hay RUT, el backend puede usar el RUT genérico 66.666.666-6 permitido para venta/servicio no periódico.</small>`;
    const orderItems=siiLoadedOrderItems;
    const rows=orderItems.length?orderItems.map((it,i)=>{
      const name=it.nombre||it.producto_nombre||it.descripcion||`Ítem ${i+1}`,desc=(it.descripcion&&it.descripcion!==name)?it.descripcion:"",qty=Number(it.cantidad||1),unit=it.unidad||"UN",price=Number(it.precio_unitario||0),subtotal=Number(it.monto_item??(qty*price));
      return `<tr><td>${i+1}</td><td><span class="sii-order-item-name">${esc(name)}</span>${desc?`<span class="sii-order-item-desc">${esc(desc)}</span>`:""}</td><td class="num">${esc(qty)} ${esc(unit)}</td><td class="num">${money(price)}</td><td class="num"><strong>${money(subtotal)}</strong></td></tr>`
    }).join(""):`<tr><td colspan="5">El pedido no tiene ítems registrados.</td></tr>`;
    const statusBits=[o.estado?`Pedido: ${esc(o.estado)}`:"",o.estado_pago?`Pago: ${esc(o.estado_pago)}`:"",o.medio_pago?`Medio: ${esc(o.medio_pago)}`:""].filter(Boolean);
    const documentInfo=docs.length?`<small class="warn"><i class="bi bi-receipt"></i> Documento(s) ya emitido(s): ${docs.map(x=>`${esc(SII_DTE_NAMES[Number(x.tipo_dte)]||`DTE ${x.tipo_dte}`)} folio ${Number(x.folio||0).toLocaleString('es-CL')}${x.es_prueba_local?' (PRUEBA LOCAL)':''}`).join(' · ')}</small>`:missing.length?`<small class="warn"><i class="bi bi-exclamation-triangle"></i> Completa antes de facturar: ${esc(missing.join(", "))}</small>`:`<small class="ok"><i class="bi bi-shield-check"></i> Datos tributarios del receptor completos.</small>`;
    preview.classList.remove("hidden");
    preview.innerHTML=`<div class="sii-order-preview-head"><div><strong><i class="bi bi-check2-circle"></i> ${esc(o.numero_pedido||o.id)}</strong><span>${esc(o.nombre||o.razon_social||"")} · ${orderItems.length} ítem(s)</span></div><small class="sii-order-review-badge"><i class="bi bi-eye"></i> Revisar antes de emitir</small></div><div class="sii-order-detail-box"><div class="sii-order-detail-title"><strong><i class="bi bi-list-check"></i> Detalle del pedido</strong><small>${orderItems.length} línea(s)</small></div><div class="sii-order-detail-scroll"><table class="sii-order-detail-table"><thead><tr><th>#</th><th>Producto / descripción</th><th class="num">Cantidad</th><th class="num">Precio unit.</th><th class="num">Subtotal</th></tr></thead><tbody>${rows}</tbody></table></div></div><div class="sii-order-preview-footer"><div class="sii-order-preview-status">${statusBits.map(v=>`<small>${v}</small>`).join("")}</div><div class="sii-order-preview-total"><small>Total del pedido</small><strong>${money(o.total||0)}</strong></div></div><div class="sii-order-review-note">${giroInfo}${documentInfo}</div>`;
  }
  const ctx=$("#siiEmitContext");if(ctx)ctx.textContent=`Pedido ${o.numero_pedido||o.id} cargado · ${SII_DTE_NAMES[Number($("#siiTipoDte").value)]||"Documento tributario"}`;updateSiiIssueModeUi();toast(`✓ Pedido ${o.numero_pedido||o.id} cargado · ${Number(out.items_count||0)} ítem(s)`)
}
async function emitSiiDte(){
  const tipo=Number($("#siiTipoDte").value),pedido_id=$("#siiPedidoId").value.trim();if(!pedido_id)return toast("Ingresa el ID, N.º de pedido o solo el número; por ejemplo 24");
  if(!siiLoadedOrderId)return toast("Primero busca/carga el pedido y revisa su detalle antes de generar el documento.");
  if(!Array.isArray(siiLoadedOrderItems)||!siiLoadedOrderItems.length)return toast("El pedido no tiene detalle de productos. No se puede generar el documento.");
  const mode=resolveSiiIssueMode(),existing=siiExistingForIssue(tipo,mode);
  if(existing){let tab=null;try{tab=window.open('about:blank','_blank');const detail=await SiiAPI.detail(existing.id,token);if(detail?.representacion){const pdf=await generateSiiRepresentationPdf(detail.representacion,tab);await persistSiiPdf(existing.id,pdf)}else tab?.close();toast(`✓ Documento existente · folio ${Number(existing.folio||0).toLocaleString('es-CL')} · no se consumió otro folio`);return{reutilizado:true,...existing}}catch(err){try{tab?.close()}catch(_){}throw err}}
  if(mode.mode==="PRUEBA_LOCAL_SIN_FOLIOS")return toast("No hay folios PRUEBA LOCAL disponibles para este DTE");if(mode.mode==="SII"&&!mode.official)return toast("No hay CAF oficial disponible para este DTE. Selecciona PRUEBA LOCAL o importa un CAF SII.");
  if([39,41].includes(tipo)&&mode.mode==="SII"&&!siiState.config?.boleta_api_habilitada)return toast("La API REST real de Boleta está instalada pero deshabilitada. Mantén PRUEBA LOCAL o actívala en Configuración tributaria cuando inicies certificación real.");if([39,41].includes(tipo)&&mode.mode==="SII"&&String(siiState.config?.boleta_modelo_emision||"POR_DEFINIR").toUpperCase()==="POR_DEFINIR")return toast("Define primero el modelo de emisión de Boleta que declaraste en el SII.");
  const local=mode.mode==="PRUEBA_LOCAL",payload={tipo_dte:tipo,pedido_id,enviar_sii:!local,modo_prueba_local:local,rut_receptor:$("#siiRutReceptor").value.trim(),razon_social_receptor:$("#siiRazonReceptor").value.trim(),giro_receptor:$("#siiGiroReceptor").value.trim(),direccion_receptor:$("#siiDireccionReceptor").value.trim(),comuna_receptor:$("#siiComunaReceptor").value.trim(),ciudad_receptor:$("#siiCiudadReceptor").value.trim(),formato_impresion:[39,41].includes(tipo)?($("#siiBoletaPrintFormat")?.value||siiState.config?.boleta_formato||"TICKET_80"):"A4"};
  if([33,34,56,61].includes(tipo)&&(!payload.rut_receptor||!payload.razon_social_receptor||!payload.giro_receptor||!payload.direccion_receptor||!payload.comuna_receptor))return toast("Factura/Nota requiere RUT, razón social, giro, dirección y comuna del receptor.");if([56,61].includes(tipo)){if(!$("#siiRefFolio").value.trim())return toast("La Nota requiere el folio del documento de referencia");payload.referencia={tipo_dte:$("#siiRefTipo").value.trim()||"33",folio:$("#siiRefFolio").value.trim(),fecha:$("#siiRefFecha").value,codigo:Number($("#siiRefCodigo").value||1),razon:$("#siiRefRazon").value.trim()||"Referencia tributaria"}}
  let pdfWindow=null;try{pdfWindow=window.open('about:blank','_blank');if(pdfWindow)pdfWindow.document.write('<title>Generando DTE</title><body style="font-family:Arial,sans-serif;padding:30px">Generando representación PDF del DTE…</body>');const out=await SiiAPI.issue(payload,token);
    if(out?.duplicado||out?.reutilizado){const detail=await SiiAPI.detail(out.documento_id,token);if(detail?.representacion){const pdf=await generateSiiRepresentationPdf(detail.representacion,pdfWindow);await persistSiiPdf(out.documento_id,pdf)}else pdfWindow?.close();siiLoadedOrderDocs=[out,...siiLoadedOrderDocs.filter(x=>String(x.id)!==String(out.documento_id))];updateSiiIssueModeUi();toast(`✓ El pedido ya tenía ${SII_DTE_NAMES[tipo]||`DTE ${tipo}`} folio ${Number(out.folio||0).toLocaleString('es-CL')} · no se consumió otro folio`);return out}
    if(out?.representacion){const pdf=await generateSiiRepresentationPdf(out.representacion,pdfWindow);await persistSiiPdf(out.documento_id,pdf)}else if(pdfWindow&&!pdfWindow.closed)pdfWindow.close();siiState.loaded=false;await loadSiiBilling(true);siiLoadedOrderDocs.unshift({id:out.documento_id,ambiente:String(siiState.config?.ambiente||'CERTIFICACION').toUpperCase(),tipo_dte:out.tipo_dte,folio:out.folio,estado:out.estado,track_id:out.track_id,es_prueba_local:Boolean(out.es_prueba_local)});updateSiiIssueModeUi();try{if(typeof loadAdminModules==="function")await loadAdminModules({modules:["clients","orders"],retry:false})}catch(e){console.warn("refresh clients after DTE",e)}const clientMsg=out?.cliente_creado?" · cliente creado en Clientes":out?.cliente_guardado?" · ficha de Cliente actualizada":"";if(local)toast(`✓ PRUEBA LOCAL generada · ${SII_DTE_NAMES[Number(out.tipo_dte)]||`DTE ${out.tipo_dte}`} · folio ${out.folio} · XML firmado + PDF abierto${clientMsg}`);else toast(`✓ DTE ${out.tipo_dte} folio ${out.folio}${out.track_id?` · TrackID ${out.track_id}`:''} · PDF generado${clientMsg}`);return out
  }catch(err){try{if(pdfWindow&&!pdfWindow.closed)pdfWindow.close()}catch(_){}throw err}
}



// R9.18.125 · Mantenedor central de folios
const folioManagerState={loaded:false,series:[],config:{}};
const FOLIO_DTE_NAMES={33:"Factura Electrónica",34:"Factura Exenta",39:"Boleta Electrónica",41:"Boleta Exenta",52:"Guía de Despacho",56:"Nota de Débito",61:"Nota de Crédito"};
function folioAvailable(row){return Math.max(0,Number(row?.folio_hasta||0)-Number(row?.siguiente||0)+1)}
function folioStateFor(row){if(!row?.activo)return{label:"INACTIVO",cls:"off"};const avail=folioAvailable(row),total=Math.max(1,Number(row.folio_hasta||0)-Math.max(1,Number(row.siguiente||1))+1),base=Math.max(1,Number(row.folio_hasta||0));if(avail<=0)return{label:"AGOTADO",cls:"end"};if(avail<=5||avail/base<=.2)return{label:"POR AGOTARSE",cls:"low"};return{label:"ACTIVO",cls:"ok"}}
function dteFolioRows(){const types=[33,34,39,41,52,56,61],cafs=siiState?.caf||[];return types.map(tipo=>{const matches=cafs.filter(x=>Number(x.tipo_dte)===tipo&&x.activo&&!x.es_prueba_local),active=matches.find(x=>!x.agotado&&Number(x.proximo_folio||0)<=Number(x.folio_hasta||0))||matches[0]||null;return{clave:`DTE_${tipo}`,nombre:`${FOLIO_DTE_NAMES[tipo]} · DTE ${tipo}`,origen:"SII",prefijo:"—",digitos:0,siguiente:active?Number(active.proximo_folio||0):0,folio_desde:active?Number(active.folio_desde||0):0,folio_hasta:active?Number(active.folio_hasta||0):0,activo:!!active&&!active.agotado,caf:active}})}
function renderFolioCompany(){const c=folioManagerState.config||data.config||{},s=siiState?.config||{};const set=(id,v)=>{const el=$(id);if(el)el.value=v??""};set('#fmEmpresa',c.empresa||s.razon_social||'');set('#fmRazonSocial',c.empresa_razon_social||s.razon_social||c.empresa||'');set('#fmRut',c.empresa_rut||s.rut_emisor||'');set('#fmGiro',c.empresa_giro||s.giro||'');set('#fmActeco',c.empresa_acteco||s.acteco||'');set('#fmEmail',c.email||s.email_emisor||'');set('#fmDireccion',c.direccion||s.direccion_origen||'');set('#fmComuna',c.empresa_comuna||s.comuna_origen||'');set('#fmCiudad',c.empresa_ciudad||s.ciudad_origen||'');const sync=$('#folioCompanySync');if(sync)sync.classList.toggle('is-off',!(window.SiiAPI&&SiiAPI.configured()))}
function renderFolioManager(){renderFolioCompany();const local=(folioManagerState.series||[]).filter(x=>String(x.origen||'SISTEMA').toUpperCase()==='SISTEMA'),dtes=dteFolioRows(),rows=[...local,...dtes],tbody=$('#folioSeriesTable');let internalAvailable=0,alerts=0;local.forEach(x=>{internalAvailable+=folioAvailable(x);const st=folioStateFor(x);if(['low','end'].includes(st.cls))alerts++});dtes.forEach(x=>{const a=x.caf?Math.max(0,Number(x.caf.folio_hasta||0)-Number(x.caf.proximo_folio||0)+1):0,total=x.caf?Math.max(1,Number(x.caf.folio_hasta||0)-Number(x.caf.folio_desde||0)+1):1;if(!x.caf||a<=5||a/total<=.2)alerts++});if($('#folioInternalCount'))$('#folioInternalCount').textContent=local.length.toLocaleString('es-CL');if($('#folioInternalAvailable'))$('#folioInternalAvailable').textContent=internalAvailable.toLocaleString('es-CL');if($('#folioSiiCafCount'))$('#folioSiiCafCount').textContent=(siiState?.caf||[]).filter(x=>x.activo&&!x.agotado&&!x.es_prueba_local).length.toLocaleString('es-CL');if($('#folioAlertCount'))$('#folioAlertCount').textContent=alerts.toLocaleString('es-CL');if(!tbody)return;tbody.innerHTML=rows.map(r=>{const isSii=String(r.origen).toUpperCase()==='SII';let avail=0,total=1,range='—',next='—',st;if(isSii){if(r.caf){avail=Math.max(0,Number(r.caf.folio_hasta||0)-Number(r.caf.proximo_folio||0)+1);total=Math.max(1,Number(r.caf.folio_hasta||0)-Number(r.caf.folio_desde||0)+1);range=`${Number(r.caf.folio_desde||0).toLocaleString('es-CL')} – ${Number(r.caf.folio_hasta||0).toLocaleString('es-CL')}`;next=Number(r.caf.proximo_folio||0).toLocaleString('es-CL');st=r.caf.agotado?{label:'AGOTADO',cls:'end'}:avail<=5||avail/total<=.2?{label:'POR AGOTARSE',cls:'low'}:{label:'CAF ACTIVO',cls:'ok'}}else st={label:'SIN CAF',cls:'end'}}else{avail=folioAvailable(r);total=Math.max(1,Number(r.folio_hasta||0)-Math.max(1,Number(r.siguiente||1))+1);range=`1 – ${Number(r.folio_hasta||0).toLocaleString('es-CL')}`;next=Number(r.siguiente||0).toLocaleString('es-CL');st=folioStateFor(r)}const pct=Math.max(0,Math.min(100,Math.round(avail/Math.max(1,total)*100)));const actions=isSii?`<button class="btn btn-primary btn-compact folio-sii-link" type="button" data-folio-sii="${esc(r.clave)}"><i class="bi bi-building"></i> Solicitar / cargar en SII</button>`:`<button class="btn btn-light btn-compact" type="button" data-folio-edit="${esc(r.clave)}">Configurar</button><button class="btn btn-primary btn-compact" type="button" data-folio-extend="${esc(r.clave)}"><i class="bi bi-plus-circle"></i> Solicitar más</button>`;return `<tr class="${st.cls==='low'?'folio-row-low':st.cls==='end'?'folio-row-end':''}"><td><strong>${esc(r.nombre||r.clave)}</strong><small>${esc(r.descripcion||'')}</small></td><td><span class="folio-origin ${isSii?'sii':'local'}">${isSii?'SII / CAF':'SISTEMA'}</span></td><td><strong>${esc(r.prefijo||'—')}</strong>${!isSii?`<small>${Number(r.digitos||6)} dígitos</small>`:''}</td><td>${range}</td><td><strong>${next}</strong></td><td class="folio-available"><strong>${avail.toLocaleString('es-CL')}</strong><small>${pct}% disponible</small><div class="folio-progress" style="color:${st.cls==='end'?'#a33':st.cls==='low'?'#a06f16':'#4f7f5e'}"><i style="width:${pct}%"></i></div></td><td><span class="folio-state ${st.cls}">${st.label}</span></td><td><div class="folio-actions">${actions}</div></td></tr>`}).join('')||'<tr><td colspan="8" class="empty-cell">No hay series configuradas.</td></tr>'}
async function loadFolioManager(force=false){if(folioManagerState.loaded&&!force){renderFolioManager();return}const out=await AleAPI.post('foliomanagerstatus',{},token);folioManagerState.series=out.series||[];folioManagerState.config=out.config||data.config||{};try{if(window.SiiAPI&&SiiAPI.configured())await loadSiiBilling(force)}catch(err){console.warn('folio sii status',err)}folioManagerState.loaded=true;renderFolioManager()}
function openFolioModal(id){const el=$('#'+id);if(!el)return;$$('.folio-modal').forEach(x=>x.classList.add('hidden'));el.classList.remove('hidden');document.body.classList.add('sii-modal-open')}
function closeFolioModals(){$$('.folio-modal').forEach(x=>x.classList.add('hidden'));if(!$$('.sii-modal:not(.hidden)').length)document.body.classList.remove('sii-modal-open')}
function folioFind(key){return(folioManagerState.series||[]).find(x=>String(x.clave)===String(key))}
function openFolioSeriesEditor(key){const r=folioFind(key);if(!r)return;$('#folioSeriesKey').value=r.clave;$('#folioSeriesEditorSubtitle').textContent=r.nombre||r.clave;$('#folioSeriesPrefix').value=r.prefijo||'';$('#folioSeriesDigits').value=Number(r.digitos||6);$('#folioSeriesNext').value=Number(r.siguiente||1);$('#folioSeriesEnd').value=Number(r.folio_hasta||1);$('#folioSeriesActive').value=r.activo?'SI':'NO';openFolioModal('folioSeriesEditor')}
function openFolioExtendEditor(key){const r=folioFind(key);if(!r)return;$('#folioExtendKey').value=r.clave;$('#folioExtendSubtitle').textContent=`${r.nombre||r.clave} · rango actual hasta ${Number(r.folio_hasta||0).toLocaleString('es-CL')}`;$('#folioExtendQty').value=1000;openFolioModal('folioExtendEditor')}
async function saveFolioSeries(){const out=await AleAPI.post('folioseriessave',{clave:$('#folioSeriesKey').value,prefijo:$('#folioSeriesPrefix').value.trim(),digitos:Number($('#folioSeriesDigits').value||6),siguiente:Number($('#folioSeriesNext').value||1),folio_hasta:Number($('#folioSeriesEnd').value||1),activo:$('#folioSeriesActive').value==='SI'},token);folioManagerState.loaded=false;closeFolioModals();await loadFolioManager(true);toast(`✓ Serie ${out.serie?.clave||''} actualizada`)}
async function extendFolioSeries(){const key=$('#folioExtendKey').value,qty=Number($('#folioExtendQty').value||0);const out=await AleAPI.post('folioseriesextend',{clave:key,cantidad:qty},token);folioManagerState.loaded=false;closeFolioModals();await loadFolioManager(true);toast(`✓ ${Number(out.cantidad||qty).toLocaleString('es-CL')} folios agregados a ${key}`)}
async function saveFolioCompany(){const rut=$('#fmRut').value.trim()?requireRutChile($('#fmRut').value):'';const general={empresa:$('#fmEmpresa').value.trim(),empresa_rut:rut,empresa_razon_social:$('#fmRazonSocial').value.trim(),empresa_giro:$('#fmGiro').value.trim(),empresa_acteco:$('#fmActeco').value.trim(),empresa_comuna:$('#fmComuna').value.trim(),empresa_ciudad:$('#fmCiudad').value.trim(),email:$('#fmEmail').value.trim(),direccion:$('#fmDireccion').value.trim()};const a=await AleAPI.post('saveConfig',general,token);data.config={...(data.config||{}),...(a.config||general)};let siiSynced=false;if(window.SiiAPI&&SiiAPI.configured()){try{await loadSiiBilling(false);const c=siiState.config||{};const payload={ambiente:c.ambiente||'CERTIFICACION',habilitado:Boolean(c.habilitado),rut_emisor:rut,razon_social:general.empresa_razon_social||general.empresa,giro:general.empresa_giro,acteco:general.empresa_acteco,direccion_origen:general.direccion,comuna_origen:general.empresa_comuna,ciudad_origen:general.empresa_ciudad,direccion_regional_sii:c.direccion_regional_sii||'',email_emisor:general.email,numero_resolucion:c.numero_resolucion??'',fecha_resolucion:c.fecha_resolucion?String(c.fecha_resolucion).slice(0,10):'',boleta_api_habilitada:Boolean(c.boleta_api_habilitada),boleta_modelo_emision:c.boleta_modelo_emision||'POR_DEFINIR',boleta_formato:c.boleta_formato||'TICKET_80'};const sout=await SiiAPI.saveConfig(payload,token);siiState.config=sout.config||payload;siiSynced=true}catch(err){console.warn('sync company SII',err);toast(`⚠ Empresa guardada, pero SII no pudo sincronizar: ${err.message||err}`)}}folioManagerState.config=data.config;renderSettings();renderFolioManager();if(siiSynced)toast('✓ Empresa y parametrización SII sincronizadas');else toast('✓ Parametrización de empresa guardada')}
function openFolioSii(){openAdminView('billing-sii');setTimeout(async()=>{try{await loadSiiBilling(false);openSiiModal('siiCafModal')}catch(err){toast(`✕ ${err.message||err}`)}},0)}
$('.admin-nav button[data-view="folio-manager"]')?.addEventListener('click',()=>loadFolioManager(false));
$('#folioRefresh')?.addEventListener('click',e=>busy(e.currentTarget,()=>loadFolioManager(true)));
$('#folioSaveCompany')?.addEventListener('click',e=>busy(e.currentTarget,saveFolioCompany));
$('#folioSeriesSave')?.addEventListener('click',e=>busy(e.currentTarget,saveFolioSeries));
$('#folioExtendSave')?.addEventListener('click',e=>busy(e.currentTarget,extendFolioSeries));
$$('[data-folio-close]').forEach(b=>b.addEventListener('click',closeFolioModals));
$('#folioSeriesTable')?.addEventListener('click',e=>{const edit=e.target.closest('[data-folio-edit]'),ext=e.target.closest('[data-folio-extend]'),sii=e.target.closest('[data-folio-sii]');if(edit)return openFolioSeriesEditor(edit.dataset.folioEdit);if(ext)return openFolioExtendEditor(ext.dataset.folioExtend);if(sii)return openFolioSii()});

$$('[data-sii-open]').forEach(b=>b.addEventListener('click',()=>openSiiManagerModal(b.dataset.siiOpen)));
$$('[data-sii-close]').forEach(b=>b.addEventListener('click',closeSiiModals));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('sii-modal-open'))closeSiiModals()});
$$('.admin-nav button').forEach(b=>b.addEventListener('click',()=>{if(document.body.classList.contains('sii-modal-open'))closeSiiModals()}));
$(".admin-nav button[data-view='billing-sii']")?.addEventListener("click",()=>loadSiiBilling(false));
$("#siiRefresh")?.addEventListener("click",e=>busy(e.currentTarget,()=>loadSiiBilling(true)));
$("#siiRefreshDocuments")?.addEventListener("click",e=>busy(e.currentTarget,()=>loadSiiBilling(true)));
$("#siiSaveConfig")?.addEventListener("click",e=>busy(e.currentTarget,saveSiiConfig));
$("#siiUploadCertificate")?.addEventListener("click",e=>busy(e.currentTarget,uploadSiiCertificate));
$("#siiUploadCaf")?.addEventListener("click",e=>busy(e.currentTarget,uploadSiiCaf));
$("#siiGenerateLocalFolios")?.addEventListener("click",e=>busy(e.currentTarget,generateSiiLocalFolios));
$("#siiOpenFolioPortal")?.addEventListener("click",openSiiFoliosPortal);
$("#siiTestAuth")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const out=await SiiAPI.testAuth(token);toast(`✓ Autenticación DTE clásico OK · ${out.ambiente}`)}catch(err){toast(`✕ ${err.message||err}`)}}));
$("#siiTestBoletaAuth")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{const out=await SiiAPI.testBoletaAuth(token);toast(`✓ API Boleta SII OK · ${out.ambiente} · ${out.host}`)}catch(err){toast(`✕ ${err.message||err}`)}}));
$("#siiLoadOrder")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{await loadSiiOrderData()}catch(err){console.warn(err);toast(`✕ ${err.message||err}`)}}));
$("#siiEmitDte")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{await emitSiiDte()}catch(err){console.warn(err);toast(`✕ ${err.message||err}`)}}));
$("#siiTipoDte")?.addEventListener("change",toggleSiiReferenceFields);$("#siiIssueMode")?.addEventListener("change",updateSiiIssueModeUi);$("#siiBoletaPrintFormat")?.addEventListener("change",updateSiiIssueModeUi);
$("#siiPedidoId")?.addEventListener("input",()=>{siiLoadedOrderId=null;siiLoadedOrderDocs=[];siiLoadedOrderItems=[];const p=$("#siiOrderPreview");if(p){p.classList.add("hidden");p.innerHTML=""}updateSiiIssueModeUi()});
$("#siiPedidoId")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();e.stopPropagation();$("#siiLoadOrder")?.click()}});
toggleSiiReferenceFields();
$("#orderEmitBoleta")?.addEventListener("click",()=>{if(currentOrderDetailId)window.openOrderSiiIssue(currentOrderDetailId,39)});
$("#orderEmitFactura")?.addEventListener("click",()=>{if(currentOrderDetailId)window.openOrderSiiIssue(currentOrderDetailId,33)});
$("#siiCertificateList")?.addEventListener("click",async e=>{const b=e.target.closest('[data-sii-cert-activate]');if(!b)return;await busy(b,async()=>{try{await SiiAPI.activateCertificate(b.dataset.siiCertActivate,token);siiState.loaded=false;await loadSiiBilling(true);toast("✓ Certificado activo actualizado")}catch(err){toast(`✕ ${err.message||err}`)}})});
$("#siiExchangeImport")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{await importSiiExchangeFile()}catch(err){console.warn("sii exchange import",err);toast(`✕ ${err.message||err}`)}}));
$("#siiExchangeRefresh")?.addEventListener("click",e=>busy(e.currentTarget,()=>loadSiiExchange()));
$("#purchaseDteRefresh")?.addEventListener("click",e=>busy(e.currentTarget,()=>loadSiiExchange()));
$("#siiExchangeTable")?.addEventListener("click",handleReceivedDteClick);
$("#purchaseDteTable")?.addEventListener("click",handleReceivedDteClick);
$("#siiRegistryApply")?.addEventListener("click",e=>busy(e.currentTarget,async()=>{try{await applySiiRegistryEvent()}catch(err){console.warn("sii registry event",err);toast(`✕ ${err.message||err}`)}}));
$("#siiCertificationRefresh")?.addEventListener("click",e=>busy(e.currentTarget,()=>loadSiiCertification()));
$("#siiOpenCertificationPortal")?.addEventListener("click",()=>window.open('https://www.sii.cl/servicios_online/1039-menu_certificacion-1184.html','_blank','noopener,noreferrer'));
$("#siiCertificationTable")?.addEventListener("click",async e=>{const b=e.target.closest('[data-sii-cert-save]');if(!b)return;await busy(b,async()=>{try{const code=b.dataset.siiCertSave,state=$("#siiCertificationTable")?.querySelector(`.sii-cert-state[data-code="${CSS.escape(code)}"]`)?.value||'PENDIENTE',detalle=$("#siiCertificationTable")?.querySelector(`.sii-cert-detail[data-code="${CSS.escape(code)}"]`)?.value||'',evidencia=$("#siiCertificationTable")?.querySelector(`.sii-cert-evidence[data-code="${CSS.escape(code)}"]`)?.value||'';await SiiAPI.certificationUpdate({codigo:code,estado:state,detalle,evidencia},token);await loadSiiCertification();toast(`✓ Etapa ${code} actualizada`)}catch(err){toast(`✕ ${err.message||err}`)}})});
$("#siiDocumentsTable")?.addEventListener("click",async e=>{const query=e.target.closest('[data-sii-query]'),detail=e.target.closest('[data-sii-detail]'),pdf=e.target.closest('[data-sii-pdf]');if(query){await busy(query,async()=>{try{const out=await SiiAPI.queryTrack(query.dataset.siiQuery,token);siiState.loaded=false;await loadSiiBilling(true);toast(`SII: ${out.estado||'consultado'}${out.glosa?` · ${out.glosa}`:''}`)}catch(err){toast(`✕ ${err.message||err}`)}})}else if(pdf){await busy(pdf,async()=>{let tab=null;try{tab=window.open('about:blank','_blank');const out=await SiiAPI.detail(pdf.dataset.siiPdf,token);if(out.representacion){const generated=await generateSiiRepresentationPdf(out.representacion,tab);await persistSiiPdf(pdf.dataset.siiPdf,generated)}else throw new Error('REPRESENTACION_PDF_NO_DISPONIBLE')}catch(err){try{tab?.close()}catch(_){}toast(`✕ ${err.message||err}`)}})}else if(detail){await busy(detail,async()=>{try{const out=await SiiAPI.detail(detail.dataset.siiDetail,token),d=out.documento||{};const blob=new Blob([d.xml_envio||d.xml_dte||""],{type:"text/xml;charset=ISO-8859-1"}),url=URL.createObjectURL(blob);window.open(url,"_blank","noopener");setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(err){toast(`✕ ${err.message||err}`)}})}});
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape")return;
  const ids=["ledgerHistoryEditor","inventoryPartEditor","inventoryImportEditor","warehouseChannelEditor","warehouseEditor"];
  const openId=ids.find(id=>{const el=$("#"+id);return el&&!el.classList.contains("hidden")});
  if(openId){e.preventDefault();showEditor(openId,false)}
});


/* R9.18.137 · revisión de pagos de línea de crédito Mayorista */
async function renderWholesaleCreditPaymentsAdmin(){
  const host=$("#wholesaleCreditPaymentsTable");if(!host||!token)return;
  try{
    const out=await AleAPI.post("adminwholesalecreditpayments",{},token),rows=out.payments||[];
    host.innerHTML=table(["Fecha","Mayorista","Medio","Abono","Recargo","Total cobrado","Estado","Comprobante","Acciones"],rows.map(x=>{const c=x.clientes||{},pending=String(x.estado||'').toUpperCase()==='PENDIENTE_APROBACION';return `<tr><td>${esc(formatDate(x.creado_en))}</td><td><strong>${esc(c.razon_social||c.nombre||x.cliente_id||'')}</strong><br><small>${esc(c.rut?formatRutChile(c.rut):'')}</small></td><td>${esc(x.medio_pago||'')}</td><td><strong>${money(x.monto_abono)}</strong></td><td>${money(x.recargo_monto)}</td><td>${money(x.monto_cobrado)}</td><td><span class="role-badge ${pending?'inactive-badge':''}">${esc(String(x.estado||'').replaceAll('_',' '))}</span></td><td>${x.comprobante_url?`<a class="btn btn-light btn-compact" href="${esc(x.comprobante_url)}" target="_blank" rel="noopener">Ver comprobante</a>`:'—'}</td><td>${pending?`<div class="row-actions"><button class="btn btn-primary btn-compact" onclick="reviewWholesaleCreditPayment('${esc(x.id)}','APROBAR',this)">Aprobar</button><button class="btn btn-light btn-compact" onclick="reviewWholesaleCreditPayment('${esc(x.id)}','RECHAZAR',this)">Rechazar</button></div>`:'—'}</td></tr>`}).join(""));
    if(!rows.length)host.innerHTML='<div class="empty-state">No existen comprobantes ni pagos de línea de crédito todavía.</div>';
  }catch(err){console.warn(err);const code=String(err?.message||err||'').toUpperCase();host.innerHTML=code.includes('ACCION_NO_VALIDA')?'<div class="empty-state">Despliega la Edge Function R9.18.137 para habilitar esta bandeja.</div>':'<div class="empty-state">No fue posible cargar los pagos de crédito.</div>'}
}
window.reviewWholesaleCreditPayment=async(id,decision,source)=>{let motivo='';if(decision==='RECHAZAR'){motivo=prompt('Motivo del rechazo del comprobante:','')||'';if(!motivo.trim())return}await busy(source,async()=>{try{await AleAPI.post('adminwholesalecreditpaymentdecision',{id,decision,motivo},token);toast(decision==='APROBAR'?'✓ Pago aprobado y aplicado a la línea de crédito':'✓ Comprobante rechazado');await loadAdminModules({modules:['wholesale'],retry:true});renderWholesaleCredits();renderWholesale()}catch(err){console.warn(err);toast(`✕ No fue posible ${decision==='APROBAR'?'aprobar':'rechazar'} el pago · ${String(err?.message||err||'')}`)}},decision==='APROBAR'?'Aprobando…':'Rechazando…')};

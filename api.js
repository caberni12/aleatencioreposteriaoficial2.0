(() => {
  const cfg = () => window.ALE_ATENCIO_CONFIG || {};

  const configured = () => {
    const u = String(cfg().API_URL || "").trim();
    return /^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/[A-Za-z0-9_-]+\/?$/i.test(u);
  };

  function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

  function errorText(value) {
    if (value == null || value === "") return "";
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.message || value.name || "API_ERROR";
    if (Array.isArray(value)) return value.map(errorText).filter(Boolean).join(" · ");
    if (typeof value === "object") {
      const parts = [
        value.code,
        value.message,
        value.details || value.detail,
        value.hint,
        value.error_description
      ].map(x => String(x ?? "").trim()).filter(Boolean);
      if (parts.length) return [...new Set(parts)].join(" · ");
      try { return JSON.stringify(value); } catch (_) { return "API_ERROR_OBJETO"; }
    }
    return String(value);
  }

  function makeError(message, status = 0, payload = null) {
    const err = new Error(errorText(message) || errorText(payload?.error) || "API_ERROR");
    err.status = status;
    err.payload = payload;
    err.code = String(payload?.error_code || payload?.code || "").trim();
    err.detail = String(payload?.error_detail || payload?.details || "").trim();
    return err;
  }

  async function request(action, data = {}, token = "", options = {}) {
    if (!configured()) throw makeError("API_NO_CONFIGURADA");
    const timeoutMs = Number(options.timeoutMs || cfg().REQUEST_TIMEOUT_MS || 12000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = { "Content-Type": "application/json" };
    if (token) {
      // La API usa sesión propia de public.sesiones, NO JWT/Supabase Auth.
      headers["X-Ale-Session"] = String(token);
    }

    try {
      const response = await fetch(cfg().API_URL, {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        headers,
        body: JSON.stringify({ action, data, token }),
        signal: controller.signal
      });

      const text = await response.text();
      let payload = {};
      try { payload = text ? JSON.parse(text) : {}; }
      catch (_) { throw makeError("RESPUESTA_API_INVALIDA", response.status, { raw:text.slice(0,500) }); }

      if (!response.ok || payload?.ok === false) {
        const primary = errorText(payload?.error) || errorText(payload?.message) || `HTTP_${response.status}`;
        throw makeError(primary, response.status, payload);
      }
      return payload;
    } catch (err) {
      if (err?.name === "AbortError") throw makeError("API_TIMEOUT");
      if (err instanceof TypeError && /fetch/i.test(String(err.message || ""))) throw makeError("API_CONEXION_FALLIDA");
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function pingReliable() {
    let lastErr = null;
    for (const timeoutMs of [8000, 15000]) {
      try {
        const out = await request("ping", {}, "", {timeoutMs});
        if (out?.ok) return out;
        lastErr = makeError(out?.error || "PING_ERROR");
      } catch (err) { lastErr = err; }
      await sleep(350);
    }
    throw lastErr || makeError("BACKEND_PUBLIC_CHECK_FAILED");
  }

  async function verifyRecord(type, id, attempts = 4) {
    let last = null;
    for (let i = 0; i < attempts; i++) {
      if (i) await sleep(300 + i * 150);
      try {
        last = await request("checkrecord", {type, id}, "", {timeoutMs:8000});
        if (last?.ok && last?.exists) return last;
      } catch (_) {}
    }
    return last || {ok:false, exists:false, id};
  }

  function isAmbiguousTransportError(err){
    const code=String(err?.message||err||"").toUpperCase();
    return ["API_TIMEOUT","API_CONEXION_FALLIDA","RESPUESTA_API_INVALIDA","REGISTRO_NO_CONFIRMADO"].some(x=>code.includes(x));
  }

  function isUnsupportedActionError(err){
    const code=String(err?.message||err||"").toUpperCase();
    return ["ACCION_NO_VALIDA","MODULO_ADMIN_NO_VALIDO","ADMINMODULE_NO_DISPONIBLE"].some(x=>code.includes(x));
  }

  window.AleAPI = {
    configured,

    async get(action, params = {}) {
      return request(action, params, "");
    },

    async ping() {
      return pingReliable();
    },

    async post(action, data = {}, token = "") {
      return request(action, data, token);
    },

    async bulkDeleteEntities(data = {}, token = "") {
      // DELETE múltiple es idempotente: ante timeout/conexión se puede reintentar sin duplicar efectos.
      let lastErr = null;
      const timeouts = [18000, 30000, 45000];
      for (let i = 0; i < timeouts.length; i++) {
        try {
          return await request("bulkdeleteentities", data, token, {timeoutMs:timeouts[i]});
        } catch (err) {
          lastErr = err;
          const code = String(err?.message || err || "").toUpperCase();
          if (["SESION_INVALIDA","SESION_EXPIRADA","SESION_REQUERIDA","USUARIO_INACTIVO","PERMISO_DENEGADO","IDS_REQUERIDOS","TIPO_NO_VALIDO","ELIMINACION_INCOMPLETA","ACCION_NO_VALIDA"].some(x=>code.includes(x))) throw err;
          const transient = ["API_TIMEOUT","API_CONEXION_FALLIDA","RESPUESTA_API_INVALIDA","HTTP_502","HTTP_503","HTTP_504"].some(x=>code.includes(x)) || Number(err?.status||0) >= 500;
          if (!transient || i === timeouts.length - 1) throw err;
          await sleep(500 + i * 700);
        }
      }
      throw lastErr || makeError("ELIMINACION_MULTIPLE_SIN_CONFIRMACION");
    },

    async verifyBulkDelete(data = {}, token = "") {
      // Endpoint liviano: confirma únicamente si los IDs siguen presentes después de un timeout ambiguo.
      return request("verifydeleteentities", data, token, {timeoutMs:12000});
    },

    async postPublic(action, data = {}) {
      const a=String(action||"").toLowerCase();
      const timeoutMs=a==="createorder"?40000:a==="transbankcreate"?20000:a==="createrequest"?18000:undefined;
      return request(action, data, "", {timeoutMs});
    },

    async transbankCreate(data = {}) { return request("transbankcreate", data, "", {timeoutMs:20000}); },
    async transbankStatus(data = {}) { return request("transbankstatus", data, "", {timeoutMs:12000}); },

    async login(username, password) {
      const user = String(username || "admin").trim() || "admin";
      const pass = String(password || "");
      if (!pass) throw makeError("CREDENCIALES_REQUERIDAS");
      return request("login", {usuario:user, password:pass}, "", {timeoutMs:15000});
    },

    async publicBootstrap() {
      return request("bootstrap", {}, "", {timeoutMs:15000});
    },

    async adminBootstrap(token, options = {}) {
      return request("adminbootstrap", options, token, {timeoutMs:22000});
    },

    async adminModule(module, token, options = {}) {
      return request("adminmodule", {module:String(module||"")}, token, {timeoutMs:Number(options.timeoutMs||16000)});
    },

    async adminModuleReliable(module, token, attempts = 2) {
      let lastErr = null;
      for (let i = 0; i < attempts; i++) {
        try { return await request("adminmodule", {module:String(module||"")}, token, {timeoutMs:i===0?12000:20000}); }
        catch (err) {
          lastErr = err;
          const code = String(err?.message || err || "").toUpperCase();
          if (["SESION_INVALIDA","SESION_EXPIRADA","SESION_REQUERIDA","USUARIO_INACTIVO"].some(x=>code.includes(x))) throw err;
          // Si el backend es R9.15.0/R9.15.1 no existe adminmodule.
          // No tiene sentido reintentar la misma acción: el cPanel usará adminbootstrap compatible.
          if (isUnsupportedActionError(err)) throw err;
          if (i < attempts - 1) await sleep(450 + i * 450);
        }
      }
      throw lastErr || makeError("ADMIN_MODULE_FAILED");
    },

    async session(token) {
      return request("session", {}, token, {timeoutMs:12000});
    },

    async notificationFeed(since, token) {
      return request("notificationfeed", {since:String(since || "")}, token, {timeoutMs:8000});
    },

    async markNotificationRead(key, token) {
      return request("notificationread", {key:String(key || "")}, token, {timeoutMs:8000});
    },

    async markAllNotificationsRead(keys, token) {
      return request("notificationreadall", {keys:Array.isArray(keys)?keys:[]}, token, {timeoutMs:10000});
    },

    async savePriceVerified(data = {}, token = "") {
      const out = await request("saveprice", data, token, {timeoutMs:12000});
      return {...out, verified:true};
    },

    async saveProductVerified(data = {}, token = "") {
      const out = await request("saveproduct", data, token, {timeoutMs:15000});
      return {...out, verified:true};
    },

    async uploadQuotePdf(data = {}, token = "") {
      return request("uploadquotepdf", data, token, {timeoutMs:30000});
    },

    async orderDetail(id, token = "") {
      return request("orderdetail", {id:String(id||"")}, token, {timeoutMs:15000});
    },

    async generateOrderPdf(id, token = "") {
      return request("generateorderpdf", {id:String(id||"")}, token, {timeoutMs:45000});
    },

    // R9.18.12: salesreport tolera esquema histórico en backend y conserva reintentos de transporte.
    async salesReport(data = {}, token = "") {
      let lastErr = null;
      for (const timeoutMs of [20000, 45000]) {
        try { return await request("salesreport", data, token, {timeoutMs}); }
        catch (err) {
          lastErr = err;
          const code=String(err?.message||err||"").toUpperCase();
          const transient=["API_TIMEOUT","API_CONEXION_FALLIDA","HTTP_502","HTTP_503","HTTP_504"].some(x=>code.includes(x));
          if(!transient) throw err;
          await sleep(500);
        }
      }
      throw lastErr || makeError("REPORTE_SIN_RESPUESTA");
    },

    async backendStatus() {
      try {
        const out = await pingReliable();
        return {
          ok:true,
          version:String(out.version || "SUPABASE"),
          service:String(out.service || "ALE_ATENCIO_API"),
          raw:out
        };
      } catch (err) {
        return {ok:false, error:String(err?.message || err || "PING_ERROR")};
      }
    },

    verifyRecord,
    isAmbiguousTransportError,
    isUnsupportedActionError,
    errorText,

    fileToDataUrl(file) {
      return new Promise((resolve,reject)=>{
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    }
  };
})();

window.ALE_ATENCIO_CONFIG = {
  // ALE ATENCIO R9.18.173 · FACTURACION UI COMPACTA / MULTIPROVEEDOR.
  // La interfaz de Facturación es única. El proveedor activo solo cambia la API/driver utilizada.
  API_URL: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/dynamic-processor",

  // Proveedor interno existente · Facturación propia SII.
  SII_API_URL: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/facturacion-sii",

  // Proveedor externo · Facturacion.cl.
  FACTURACION_CL_GATEWAY_URL: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/facturacion-cl-gateway",
  // Alias de compatibilidad; el cliente multiproveedor usa FACTURACION_CL_GATEWAY_URL.
  FACTURACION_CL_API_URL: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/facturacion-cl-gateway",

  // Mantenedor central de proveedores de facturación.
  FACTURACION_PROVIDERS_API_URL: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/facturacion-proveedores",

  // Mapa lógico: el cPanel nunca modifica estas URL; solo activa un proveedor.
  FACTURACION_PROVIDERS: {
    SII_PROPIO: { api: "SII_API_URL", driver: "facturacion-sii" },
    FACTURACION_CL: { api: "FACTURACION_CL_GATEWAY_URL", driver: "facturacion-cl-gateway" }
  },

  // Las cuatro Edge Functions que componen el sistema.
  SYSTEM_ENDPOINTS: {
    CORE: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/dynamic-processor",
    PROVEEDORES_FACTURACION: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/facturacion-proveedores",
    FACTURACION_PROPIA: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/facturacion-sii",
    FACTURACION_CL: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/facturacion-cl-gateway"
  },

  REQUEST_TIMEOUT_MS: 12000,
  API_REQUIRED_VERSION: "ALE-SUPABASE-R9.18.54-OPERACION-COMPLETA",
  PUBLIC_BASE_URL: "https://aleatencioreposteria.cl/",
  BACKEND: "SUPABASE",
  AUTH_MODE: "TABLE_SESSION",
  VERIFY_JWT: false
};

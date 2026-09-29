window.ALE_ATENCIO_CONFIG = {
  // ALE ATENCIO R9.18.176 · MANTENEDOR DEL SISTEMA / PUESTA EN PRODUCCION.
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

  // Mantenedor administrativo: respaldo y reinicio operacional protegido.
  SYSTEM_MAINTENANCE_API_URL: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/mantenedor-sistema",

  // Mapa lógico: el cPanel nunca modifica estas URL; solo activa un proveedor.
  FACTURACION_PROVIDERS: {
    SII_PROPIO: { api: "SII_API_URL", driver: "facturacion-sii" },
    FACTURACION_CL: { api: "FACTURACION_CL_GATEWAY_URL", driver: "facturacion-cl-gateway" }
  },

  // Endpoints principales del sistema.
  SYSTEM_ENDPOINTS: {
    CORE: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/dynamic-processor",
    PROVEEDORES_FACTURACION: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/facturacion-proveedores",
    FACTURACION_PROPIA: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/facturacion-sii",
    FACTURACION_CL: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/facturacion-cl-gateway",
    MANTENEDOR_SISTEMA: "https://btvliyzripnhjexdgoef.supabase.co/functions/v1/mantenedor-sistema"
  },

  REQUEST_TIMEOUT_MS: 12000,
  API_REQUIRED_VERSION: "ALE-SUPABASE-R9.18.54-OPERACION-COMPLETA",
  PUBLIC_BASE_URL: "https://aleatencioreposteria.cl/",
  BACKEND: "SUPABASE",
  AUTH_MODE: "TABLE_SESSION",
  VERIFY_JWT: false
};

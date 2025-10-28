import api from './http'

export interface LoginRequest {
  correo: string
  contraseña: string
}

export interface LoginResponse {
  token: string
  user: {
    id: number
    correo: string
    nombre: string
    roles: string[]
  }
}

export interface AuthUser {
  id: number
  correo: string
  nombre: string
  roles: string[]
}

// ===== Usuarios (Admin) =====
export type UsuarioEstado = 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO'

export interface RolCatalogo {
  id: number
  nombre: string
  descripcion?: string
}

export interface UsuarioItem {
  id: number
  email: string
  nombres: string
  apellidos: string
  telefono?: string
  estado: UsuarioEstado
  roles: string[]
}

export interface UsuariosListResponse {
  items: UsuarioItem[]
  total: number
  page: number
  limit: number
}

// Endpoints de autenticación
export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    // Backend espera { email, password } y responde { data: { user, token } }
    const response = await api.post('/auth/login', {
      email: data.correo,
      password: data.contraseña,
    })

    const payload = response.data
    // Adaptar respuesta del backend al contrato esperado por el frontend
    const backendData = payload?.data || {}
    const backendUser = backendData?.user || {}

    const mapped: LoginResponse = {
      token: backendData?.token,
      user: {
        id: backendUser.id,
        correo: backendUser.email, // mapear email -> correo
        nombre: backendUser.nombre_completo || backendUser.nombre || '',
        roles: backendUser.roles || [],
      },
    }
    return mapped
  },

  refresh: async (): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/refresh')
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  me: async (): Promise<AuthUser> => {
    const response = await api.get<AuthUser>('/auth/me')
    return response.data
  },

  register: async (data: any): Promise<AuthUser> => {
    const response = await api.post<AuthUser>('/auth/register', data)
    return response.data
  },
}

export const usuariosApi = {
  list: async (params?: { page?: number; limit?: number; search?: string; estado?: UsuarioEstado; role?: string }): Promise<UsuariosListResponse> => {
    const response = await api.get('/usuarios', { params })
    const data = response.data?.data
    return {
      items: (data?.items || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        nombres: u.nombres,
        apellidos: u.apellidos,
        telefono: u.telefono,
        estado: u.estado,
        roles: u.roles || [],
      })),
      total: data?.total || 0,
      page: data?.page || params?.page || 1,
      limit: data?.limit || params?.limit || 10,
    }
  },

  create: async (payload: { email: string; password: string; nombre_completo?: string; nombres?: string; apellidos?: string; telefono?: string; roles: number[] }): Promise<void> => {
    await api.post('/usuarios', payload)
  },

  update: async (id: number, payload: { email?: string; nombre_completo?: string; nombres?: string; apellidos?: string; telefono?: string; roles?: number[]; password?: string }): Promise<void> => {
    await api.put(`/usuarios/${id}`, payload)
  },

  changeStatus: async (id: number, estado: UsuarioEstado): Promise<void> => {
    await api.patch(`/usuarios/${id}/estado`, { estado })
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/usuarios/${id}`)
  },

  getRolesCatalog: async (): Promise<RolCatalogo[]> => {
    const response = await api.get('/usuarios/catalogo/roles')
    const roles = response.data?.data?.roles || []
    return roles
  },
}

// ===== Inquilinos =====
export interface InquilinoItem {
  id: number
  doc_identidad?: string
  nombre_completo: string
  correo?: string
  telefono?: string
  direccion?: string
  activo: boolean
}

export interface InquilinosListResponse {
  items: InquilinoItem[]
  total: number
  page: number
  limit: number
}

export const inquilinosApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }): Promise<InquilinosListResponse> => {
    const response = await api.get('/inquilinos', { params })
    const data = response.data?.data
    return {
      items: (data?.items || []) as InquilinoItem[],
      total: data?.total || 0,
      page: data?.page || params?.page || 1,
      limit: data?.limit || params?.limit || 10,
    }
  },
  create: async (payload: { nombre_completo: string; correo?: string; telefono?: string; direccion?: string; doc_identidad?: string }): Promise<void> => {
    await api.post('/inquilinos', payload)
  },
  update: async (id: number, payload: Partial<{ nombre_completo: string; correo: string; telefono: string; direccion: string; doc_identidad: string }>): Promise<void> => {
    await api.put(`/inquilinos/${id}`, payload)
  },
  changeStatus: async (id: number, activo: boolean): Promise<void> => {
    await api.patch(`/inquilinos/${id}/estado`, { activo })
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/inquilinos/${id}`)
  },
}

// ===== Propiedades =====
export interface PropiedadItem {
  id: number
  codigo: string
  tipo: 'APARTAMENTO' | 'CASA' | 'ESTUDIO' | 'OTRO'
  titulo: string
  direccion: string
  renta_mensual: number
  dormitorios?: number
  banos?: number
  area_m2?: number | null
  deposito?: number
  notas?: string | null
  estado?: string
}

export interface PropiedadesListResponse {
  items: PropiedadItem[]
  total: number
  page: number
  limit: number
}

export const propiedadesApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }): Promise<PropiedadesListResponse> => {
    const response = await api.get('/propiedades', { params })
    const data = response.data?.data
    return {
      items: (data?.items || []) as PropiedadItem[],
      total: data?.total || 0,
      page: data?.page || params?.page || 1,
      limit: data?.limit || params?.limit || 10,
    }
  },
  create: async (payload: { codigo: string; tipo: string; titulo: string; direccion: string; renta_mensual: number; area_m2?: number; deposito?: number }): Promise<void> => {
    await api.post('/propiedades', payload)
  },
  update: async (id: number, payload: Partial<{ codigo: string; tipo: string; titulo: string; direccion: string; renta_mensual: number; area_m2: number; deposito: number; notas: string }>): Promise<void> => {
    await api.put(`/propiedades/${id}`, payload)
  },
  changeStatus: async (id: number, estado: string): Promise<void> => {
    await api.patch(`/propiedades/${id}/estado`, { estado })
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/propiedades/${id}`)
  },
}

// ===== Contratos =====
export type ContratoEstado = 'ACTIVO' | 'FINALIZADO' | 'RESCINDIDO'

export interface ContratoItem {
  id: number
  propiedad_id: number
  inquilino_id: number
  monto_mensual: number
  fecha_inicio: string
  fecha_fin: string
  deposito?: number
  condiciones_especiales?: string
  estado: ContratoEstado
  propiedad_direccion?: string
  inquilino_nombre?: string
}

export interface ContratosListResponse {
  items: ContratoItem[]
  total: number
  page: number
  limit: number
}

export const contratosApi = {
  list: async (params?: { page?: number; limit?: number; estado?: string; propiedad_id?: number; inquilino_id?: number; fecha_desde?: string; fecha_hasta?: string }): Promise<ContratosListResponse> => {
    const response = await api.get('/contratos', { params })
    const data = response.data
    // backend responde { data: [...], pagination: {...} }
    return {
      items: (data?.data || []) as ContratoItem[],
      total: data?.pagination?.total || 0,
      page: data?.pagination?.page || params?.page || 1,
      limit: data?.pagination?.limit || params?.limit || 10,
    }
  },
  create: async (payload: { propiedad_id: number; inquilino_id: number; monto_mensual: number; fecha_inicio: string; fecha_fin: string; deposito?: number; condiciones_especiales?: string }): Promise<void> => {
    await api.post('/contratos', payload)
  },
  update: async (id: number, payload: Partial<{ monto_mensual: number; fecha_fin: string; deposito: number; condiciones_especiales: string }>): Promise<void> => {
    await api.put(`/contratos/${id}`, payload)
  },
  finalizar: async (id: number, payload: { fecha_finalizacion: string; motivo?: string }): Promise<void> => {
    await api.put(`/contratos/${id}/finalizar`, payload)
  },
  renovar: async (id: number, payload: { nueva_fecha_fin: string; nuevo_monto?: number }): Promise<void> => {
    await api.put(`/contratos/${id}/renovar`, payload)
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/contratos/${id}`)
  },
  facturas: async (id: number): Promise<any[]> => {
    const response = await api.get(`/contratos/${id}/facturas`)
    // Espera respuesta { data: [...] }
    return response.data?.data || []
  },
}

// ===== Facturas / Facturación =====
export type FacturaEstado = 'ABIERTA' | 'PARCIAL' | 'PAGADA' | 'VENCIDA' | 'ANULADA'

export interface FacturaItem {
  id: number
  contrato_id: number
  anio_periodo: number
  mes_periodo: number
  fecha_emision: string
  fecha_vencimiento: string
  detalle: string
  monto_total: number
  saldo_pendiente: number
  estado: FacturaEstado
  propiedad_codigo?: string
  propiedad_titulo?: string
  inquilino_nombre?: string
}

export interface FacturasListResponse {
  items: FacturaItem[]
  total: number
  page: number
  limit: number
}

export const facturacionApi = {
  generar: async (payload: { anio: number; mes: number; fecha_emision: string; fecha_vencimiento: string }): Promise<{ generadas: number }> => {
    const res = await api.post('/facturacion/generar', payload)
    return res.data?.data || { generadas: 0 }
  },
}

export const facturasApi = {
  list: async (params?: { page?: number; limit?: number; estado?: FacturaEstado; contrato_id?: number; fecha_desde?: string; fecha_hasta?: string }): Promise<FacturasListResponse> => {
    const res = await api.get('/facturas', { params })
    const data = res.data
    return {
      items: (data?.data || []) as FacturaItem[],
      total: data?.meta?.pagination?.total || 0,
      page: data?.meta?.pagination?.page || params?.page || 1,
      limit: data?.meta?.pagination?.limit || params?.limit || 10,
    }
  },
  get: async (id: number): Promise<FacturaItem> => {
    const res = await api.get(`/facturas/${id}`)
    return res.data?.data
  },
  anular: async (id: number): Promise<void> => {
    await api.patch(`/facturas/${id}/anular`)
  },
  estados: async (): Promise<FacturaEstado[]> => {
    const res = await api.get('/facturas/catalogo/estados')
    return res.data?.data || []
  },
}

// ===== Pagos y Aplicaciones =====
export interface FormaPagoItem { id: number; codigo: string; nombre: string }

export interface PagoItem {
  id: number
  contrato_id: number
  forma_pago_id: number
  fecha_pago: string
  referencia?: string
  monto: number
  saldo_no_aplicado: number
  notas?: string
}

export interface PagosListResponse {
  items: PagoItem[]
  total: number
  page: number
  limit: number
}

export const pagosApi = {
  list: async (params?: { page?: number; limit?: number; contrato_id?: number; forma_pago_id?: number; fecha_desde?: string; fecha_hasta?: string }): Promise<PagosListResponse> => {
    const res = await api.get('/pagos', { params })
    const data = res.data
    return {
      items: (data?.data || []) as PagoItem[],
      total: data?.meta?.pagination?.total || 0,
      page: data?.meta?.pagination?.page || params?.page || 1,
      limit: data?.meta?.pagination?.limit || params?.limit || 10,
    }
  },
  create: async (payload: { contrato_id: number; forma_pago_id: number; fecha_pago: string; monto: number; referencia?: string; notas?: string }): Promise<void> => {
    await api.post('/pagos', payload)
  },
  get: async (id: number): Promise<PagoItem> => {
    const res = await api.get(`/pagos/${id}`)
    return res.data?.data
  },
  update: async (id: number, payload: Partial<{ forma_pago_id: number; fecha_pago: string; referencia?: string; notas?: string }>): Promise<void> => {
    await api.patch(`/pagos/${id}`, payload)
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/pagos/${id}`)
  },
  formas: async (): Promise<FormaPagoItem[]> => {
    const res = await api.get('/pagos/catalogo/formas-pago')
    return res.data?.data || []
  },
  aplicaciones: async (pago_id: number): Promise<{ id: number; factura_id: number; monto_aplicado: number; factura_estado: string }[]> => {
    const res = await api.get(`/pagos/${pago_id}/aplicaciones`)
    return res.data?.data || []
  },
  aplicar: async (pago_id: number, payload: { factura_id: number; monto_aplicado: number }): Promise<void> => {
    await api.post(`/pagos/${pago_id}/aplicar`, payload)
  },
  revertir: async (pago_id: number, aplId: number): Promise<void> => {
    await api.delete(`/pagos/${pago_id}/aplicaciones/${aplId}`)
  },
}

// ===== Gastos Fijos =====
export interface TipoGastoItem {
  id: number
  nombre: string
  descripcion?: string
}

export interface GastoItem {
  id: number
  propiedad_id: number
  propiedad_codigo?: string
  propiedad_titulo?: string
  tipo_gasto_id: number
  tipo_gasto_nombre?: string
  fecha_gasto: string
  detalle?: string | null
  monto: number
  creado_por: number
  creado_por_nombre?: string
  creado_el: string
}

export interface GastosListResponse {
  items: GastoItem[]
  total: number
  page: number
  limit: number
}

export const gastosApi = {
  list: async (params?: { page?: number; limit?: number; propiedad_id?: number; tipo_gasto_id?: number; fecha_desde?: string; fecha_hasta?: string }): Promise<GastosListResponse> => {
    const res = await api.get('/gastos', { params })
    const data = res.data
    const pagination = data?.meta?.pagination || {}
    return {
      items: (data?.data || []) as GastoItem[],
      total: pagination.total || 0,
      page: pagination.page || params?.page || 1,
      limit: pagination.limit || params?.limit || 10,
    }
  },
  create: async (payload: { propiedad_id: number; tipo_gasto_id: number; fecha_gasto: string; monto: number; detalle?: string | null }): Promise<void> => {
    await api.post('/gastos', payload)
  },
  update: async (id: number, payload: Partial<{ tipo_gasto_id: number; fecha_gasto: string; monto: number; detalle?: string | null }>): Promise<void> => {
    await api.put(`/gastos/${id}`, payload)
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/gastos/${id}`)
  },
  catalogoTipos: async (): Promise<TipoGastoItem[]> => {
    const res = await api.get('/gastos/catalogo/tipos')
    return res.data?.data || []
  },
}

// ===== Mantenimiento =====
export type MantenimientoEstado = 'ABIERTA' | 'EN_PROCESO' | 'EN_ESPERA' | 'RESUELTA' | 'CANCELADA'
export type MantenimientoPrioridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'

export interface MantenimientoItem {
  id: number
  propiedad_id: number
  propiedad_codigo?: string
  propiedad_titulo?: string
  contrato_id?: number | null
  inquilino_nombre?: string | null
  reportado_por?: string | null
  asunto: string
  descripcion?: string | null
  estado: MantenimientoEstado
  prioridad: MantenimientoPrioridad
  abierta_el: string
  cerrada_el?: string | null
  creado_por: number
  creado_por_nombre?: string
  actualizado_el: string
}

export interface MantenimientoListResponse {
  items: MantenimientoItem[]
  total: number
  page: number
  limit: number
}

export const mantenimientoApi = {
  list: async (params?: { page?: number; limit?: number; propiedad_id?: number; estado?: MantenimientoEstado; prioridad?: MantenimientoPrioridad; fecha_desde?: string; fecha_hasta?: string }): Promise<MantenimientoListResponse> => {
    const res = await api.get('/mantenimiento', { params })
    const data = res.data
    const pagination = data?.meta?.pagination || {}
    return {
      items: (data?.data || []) as MantenimientoItem[],
      total: pagination.total || 0,
      page: pagination.page || params?.page || 1,
      limit: pagination.limit || params?.limit || 10,
    }
  },
  create: async (payload: { propiedad_id: number; contrato_id?: number | null; asunto: string; descripcion?: string | null; prioridad?: MantenimientoPrioridad; estado?: MantenimientoEstado; reportado_por?: string | null }): Promise<void> => {
    await api.post('/mantenimiento', payload)
  },
  update: async (id: number, payload: Partial<{ estado: MantenimientoEstado; prioridad: MantenimientoPrioridad; descripcion?: string | null; reportado_por?: string | null }>): Promise<void> => {
    await api.patch(`/mantenimiento/${id}`, payload)
  },
  cancel: async (id: number): Promise<void> => {
    await api.delete(`/mantenimiento/${id}`)
  },
}

// ===== Reportes =====
export const reportesApi = {
  cxc: async (params?: { contrato_id?: number }) => {
    const res = await api.get('/reportes/cxc', { params })
    return res.data?.data || []
  },
  rentabilidad: async () => {
    const res = await api.get('/reportes/rentabilidad')
    return res.data?.data || []
  },
  ocupacion: async () => {
    const res = await api.get('/reportes/ocupacion')
    return res.data?.data || []
  },
  kpis: async () => {
    const res = await api.get('/reportes/kpis')
    return res.data?.data || {}
  },
}

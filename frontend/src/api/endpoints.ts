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

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

  create: async (payload: { email: string; password: string; nombres: string; apellidos: string; telefono?: string; roles: number[] }): Promise<void> => {
    await api.post('/usuarios', payload)
  },

  update: async (id: number, payload: { email?: string; nombres?: string; apellidos?: string; telefono?: string; roles?: number[] }): Promise<void> => {
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

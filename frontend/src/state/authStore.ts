import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthUser, LoginRequest } from '../api/endpoints'
import { authApi } from '../api/endpoints'
import { toast } from 'sonner'

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  setUser: (user: AuthUser) => void
  setToken: (token: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (data: LoginRequest) => {
        set({ isLoading: true })
        try {
          const response = await authApi.login(data)
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          })
          
          // Guardar en localStorage para compatibilidad
          localStorage.setItem('token', response.token)
          localStorage.setItem('user', JSON.stringify(response.user))
          
          toast.success('¡Inicio de sesión exitoso!')
        } catch (error: any) {
          set({ isLoading: false })
          const message = error.response?.data?.error?.message || 'Error al iniciar sesión'
          toast.error(message)
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        })
        
        // Limpiar localStorage
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        
        toast.success('Sesión cerrada correctamente')
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')
        
        if (!token || !userStr) {
          get().logout()
          return
        }

        try {
          const user = JSON.parse(userStr)
          set({
            user,
            token,
            isAuthenticated: true,
          })
        } catch (error) {
          get().logout()
        }
      },

      setUser: (user: AuthUser) => {
        set({ user })
        localStorage.setItem('user', JSON.stringify(user))
      },

      setToken: (token: string) => {
        set({ token })
        localStorage.setItem('token', token)
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

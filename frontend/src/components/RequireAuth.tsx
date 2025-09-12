import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../state/authStore'

interface Props {
  children: ReactNode
}

export default function RequireAuth({ children }: Props) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  // Fallback a token en localStorage por si se recarga la página
  const hasToken = !!localStorage.getItem('token')

  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}


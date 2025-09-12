import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../state/authStore'

// Normaliza nombres de rol comunes a etiquetas del sistema
function normalizeRole(name: string): 'ADMIN' | 'AGENTE' | 'PROPIETARIO' | 'INQUILINO' | undefined {
  const n = (name || '').toUpperCase()
  if (n.includes('ADMIN')) return 'ADMIN'
  if (n.includes('AGENTE')) return 'AGENTE'
  if (n.includes('PROPIET')) return 'PROPIETARIO'
  if (n.includes('INQUIL')) return 'INQUILINO'
  return undefined
}

interface Props {
  roles: Array<'ADMIN' | 'AGENTE' | 'PROPIETARIO' | 'INQUILINO'>
  children: ReactNode
}

export default function RequireRole({ roles, children }: Props) {
  const { user } = useAuthStore()
  const userRoles = (user?.roles || []).map(normalizeRole).filter(Boolean) as string[]
  const allowed = roles.some(r => userRoles.includes(r))
  if (!allowed) return <Navigate to="/" replace />
  return <>{children}</>
}


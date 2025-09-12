import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../state/authStore'
import { useEffect, useState } from 'react'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`

  const isAdmin = (user?.roles || []).some(r => (r || '').toUpperCase().includes('ADMIN'))

  // Tema oscuro
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true // oscuro por defecto
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-6">
              <NavLink to="/" className={linkClass} end>
                Dashboard
              </NavLink>
              <NavLink to="/propiedades" className={linkClass}>
                Propiedades
              </NavLink>
              <NavLink to="/inquilinos" className={linkClass}>
                Inquilinos
              </NavLink>
              <NavLink to="/contratos" className={linkClass}>
                Contratos
              </NavLink>
              <NavLink to="/facturas" className={linkClass}>
                Facturas
              </NavLink>
              <NavLink to="/pagos" className={linkClass}>
                Pagos
              </NavLink>
              <NavLink to="/gastos" className={linkClass}>
                Gastos
              </NavLink>
              <NavLink to="/mantenimiento" className={linkClass}>
                Mantenimiento
              </NavLink>
              <NavLink to="/reportes" className={linkClass}>
                Reportes
              </NavLink>
              {isAdmin && (
                <NavLink to="/usuarios" className={linkClass}>
                  Usuarios
                </NavLink>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button className="btn-secondary" onClick={toggleTheme}>{dark ? '☀️ Claro' : '🌙 Oscuro'}</button>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {user?.nombre || user?.correo}
              </span>
              <button className="btn-secondary" onClick={handleLogout}>Cerrar sesión</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-6 text-gray-900 dark:text-gray-100">
        <Outlet />
      </main>
    </div>
  )
}

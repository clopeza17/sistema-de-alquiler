import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../state/authStore'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
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
              {isAdmin && (
                <NavLink to="/usuarios" className={linkClass}>
                  Usuarios
                </NavLink>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.nombre || user?.correo}
              </span>
              <button className="btn-secondary" onClick={handleLogout}>Cerrar sesión</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>
    </div>
  )
}

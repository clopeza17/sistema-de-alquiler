import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../state/authStore'
import { useEffect, useMemo, useState } from 'react'

type NavItem = {
  to: string
  label: string
  end?: boolean
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [dark, setDark] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = useMemo<NavItem[]>(() => {
    const base: NavItem[] = [
      { to: '/', label: 'Dashboard', end: true },
      { to: '/propiedades', label: 'Propiedades' },
      { to: '/inquilinos', label: 'Inquilinos' },
      { to: '/contratos', label: 'Contratos' },
      { to: '/facturas', label: 'Facturas' },
      { to: '/pagos', label: 'Pagos' },
      { to: '/gastos', label: 'Gastos' },
      { to: '/mantenimiento', label: 'Mantenimiento' },
      { to: '/reportes', label: 'Reportes' },
    ]
    const isAdmin = (user?.roles || []).some(r => (r || '').toUpperCase().includes('ADMIN'))
    return isAdmin ? [...base, { to: '/usuarios', label: 'Usuarios' }] : base
  }, [user?.roles])

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const linkClasses = (isActive: boolean) =>
    `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-600 text-white'
        : 'text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-700'
    }`

  const renderNavItem = (item: NavItem, extraClass = '', onClick?: () => void) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => `${extraClass} ${linkClasses(isActive)}`}
      onClick={onClick}
    >
      {item.label}
    </NavLink>
  )

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const toggleMobileMenu = () => setMobileOpen(prev => !prev)

  const handleLogout = () => {
    setMobileOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const userLabel = user?.nombre || user?.correo

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 md:hidden dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-800"
                onClick={toggleMobileMenu}
                aria-controls="mobile-menu"
                aria-expanded={mobileOpen}
              >
                <span className="sr-only">Abrir menú de navegación</span>
                {mobileOpen ? (
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>
              <div className="hidden md:flex items-center gap-1 overflow-x-auto">
                {navItems.map(item => renderNavItem(item))}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <button className="btn-secondary" onClick={toggleTheme}>
                {dark ? '☀️ Claro' : '🌙 Oscuro'}
              </button>
              {userLabel && (
                <span className="text-sm text-gray-600 dark:text-gray-300">{userLabel}</span>
              )}
              <button className="btn-secondary" onClick={handleLogout}>Cerrar sesión</button>
            </div>
          </div>
        </div>
        {mobileOpen && (
          <div id="mobile-menu" className="md:hidden border-t border-gray-200 dark:border-gray-700">
            <div className="px-4 pb-3 pt-3 space-y-1">
              {navItems.map(item => renderNavItem(item, 'w-full', () => setMobileOpen(false)))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
              <button
                className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                onClick={toggleTheme}
              >
                {dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              </button>
              {userLabel && (
                <div className="text-sm text-gray-600 dark:text-gray-300">{userLabel}</div>
              )}
              <button
                className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 text-gray-900 dark:text-gray-100">
        <Outlet />
      </main>
    </div>
  )
}

import { useAuthStore } from '../../state/authStore'

export default function Dashboard() {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-6 bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
        <div className="space-y-2 text-gray-700">
          <p><span className="font-medium">Usuario:</span> {user?.nombre || '—'}</p>
          <p><span className="font-medium">Correo:</span> {user?.correo || '—'}</p>
          <p><span className="font-medium">Roles:</span> {user?.roles?.join(', ') || '—'}</p>
        </div>
        <div className="pt-4">
          <button className="btn-primary" onClick={logout}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  )
}


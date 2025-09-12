import { useEffect, useMemo, useState } from 'react'
import { usuariosApi, RolCatalogo, UsuarioItem, UsuarioEstado } from '../../api/endpoints'
import { toast } from 'sonner'
import Modal from '../../components/Modal'
import { useAuthStore } from '../../state/authStore'

export default function Usuarios() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<UsuarioItem[]>([])
  const [total, setTotal] = useState(0)
  const [roles, setRoles] = useState<RolCatalogo[]>([])

  const [form, setForm] = useState({
    email: '',
    password: '',
    nombres: '',
    apellidos: '',
    roleId: null as number | null,
  })

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState<UsuarioEstado | ''>('')
  const [role, setRole] = useState<string>('')
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UsuarioItem | null>(null)
  const [editForm, setEditForm] = useState<{ email?: string; nombres?: string; apellidos?: string; roleId?: number | null; password?: string }>({})
  const [editPwdVisible, setEditPwdVisible] = useState(false)
  const { user } = useAuthStore()
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [list, cats] = await Promise.all([
        usuariosApi.list({ page, limit, search: search || undefined, estado: estado || undefined, role: role || undefined }),
        usuariosApi.getRolesCatalog(),
      ])
      setItems(list.items)
      setTotal(list.total)
      setRoles(cats)
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, estado, role])

  const isStrongPassword = (pwd: string) => /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 8
  const canSubmit = useMemo(() => {
    return form.email && isStrongPassword(form.password) && form.nombres && form.apellidos && form.roleId !== null
  }, [form])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      await usuariosApi.create({
        email: form.email,
        password: form.password,
        nombres: form.nombres,
        apellidos: form.apellidos,
        roles: [form.roleId as number],
      })
      toast.success('Usuario creado')
      setForm({ email: '', password: '', nombres: '', apellidos: '', roleId: null })
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'No se pudo crear el usuario')
    } finally {
      setLoading(false)
    }
  }

  // roles: selección única controlada por roleId

  const openEdit = (u: UsuarioItem) => {
    setEditTarget(u)
    // Preseleccionar roles actuales
    const selectedRole = roles.find(r => u.roles.includes(r.nombre))
    setEditForm({ email: u.email, nombres: u.nombres, apellidos: u.apellidos, roleId: selectedRole ? selectedRole.id : null })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editTarget) return
    try {
      await usuariosApi.update(editTarget.id, {
        email: editForm.email,
        nombres: editForm.nombres,
        apellidos: editForm.apellidos,
        roles: editForm.roleId != null ? [editForm.roleId] : undefined,
        ...(editForm.password ? { password: editForm.password } : {}),
      })
      toast.success('Usuario actualizado')
      setEditOpen(false)
      setEditTarget(null)
      setEditForm({})
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'No se pudo actualizar el usuario')
    }
  }

  const changeStatus = async (u: UsuarioItem, estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO') => {
    try {
      await usuariosApi.changeStatus(u.id, estado)
      toast.success('Estado actualizado')
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'No se pudo actualizar el estado')
    }
  }

  const remove = async (u: UsuarioItem) => {
    if (!confirm(`¿Eliminar usuario ${u.email}?`)) return
    try {
      await usuariosApi.remove(u.id)
      toast.success('Usuario eliminado')
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'No se pudo eliminar el usuario')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Usuarios</h1>
        <p className="text-gray-600 dark:text-gray-300">Administra usuarios y roles</p>
      </div>

      {/* Formulario de creación */}
      <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 dark:border-gray-700 p-4 rounded border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            {!isStrongPassword(form.password) && form.password && (
              <p className="text-xs text-gray-500 mt-1">Debe tener 8+ caracteres, 1 mayúscula, 1 minúscula y 1 número.</p>
            )}
          </div>
          <div>
            <label className="label">Nombres</label>
            <input className="input" value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} />
          </div>
          <div>
            <label className="label">Apellidos</label>
            <input className="input" value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} />
          </div>
          {/* Teléfono removido */}
          <div>
            <label className="label">Rol</label>
            <select
              className="input"
              value={form.roleId ?? ''}
              onChange={e => setForm(f => ({ ...f, roleId: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">Seleccione un rol</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button type="submit" className="btn-primary" disabled={!canSubmit || loading}>
            {loading ? 'Guardando...' : 'Crear usuario'}
          </button>
        </div>
      </form>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 p-4 rounded border flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">Buscar</label>
          <input className="input" placeholder="Nombre o correo" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" value={estado} onChange={e => setEstado(e.target.value as UsuarioEstado | '')}>
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
        <div>
          <label className="label">Rol</label>
          <select className="input" value={role} onChange={e => setRole(e.target.value)}>
            <option value="">Todos</option>
            {roles.map(r => (
              <option key={r.id} value={r.nombre}>{r.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tamaño página</label>
          <select className="input" value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div>
          <button className="btn-secondary" onClick={() => { setPage(1); load() }}>Aplicar</button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{u.email}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{u.nombres} {u.apellidos}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`mr-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${u.estado === 'ACTIVO' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>{u.estado}</span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap overflow-x-auto">{u.roles.join(', ')}</td>
                  <td className="px-4 py-2 text-right relative">
                    <button className="btn-secondary" onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)} aria-haspopup="menu" aria-expanded={openMenuId === u.id}>⋮</button>
                    {openMenuId === u.id && (
                      <div className="absolute right-2 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow z-10 text-left">
                        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setOpenMenuId(null); openEdit(u) }}>Editar</button>
                        {u.estado !== 'ACTIVO' ? (
                          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setOpenMenuId(null); changeStatus(u, 'ACTIVO') }}>Activar</button>
                        ) : (
                          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setOpenMenuId(null); changeStatus(u, 'INACTIVO') }}>Desactivar</button>
                        )}
                        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setOpenMenuId(null); openEdit(u); setEditPwdVisible(true) }}>Restablecer contraseña</button>
                        <button className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400" onClick={() => { setOpenMenuId(null); remove(u) }}>Eliminar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-sm text-gray-600 flex items-center justify-between">
          <div>Total: {total}</div>
          <div className="space-x-2">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
            <span>Página {page}</span>
            <button className="btn-secondary" disabled={items.length < limit} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      <Modal open={editOpen} title="Editar usuario" onClose={() => setEditOpen(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input className="input" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Nombres</label>
              <input className="input" value={editForm.nombres || ''} onChange={e => setEditForm(f => ({ ...f, nombres: e.target.value }))} />
            </div>
            <div>
              <label className="label">Apellidos</label>
              <input className="input" value={editForm.apellidos || ''} onChange={e => setEditForm(f => ({ ...f, apellidos: e.target.value }))} />
            </div>
            {(user && (user.roles.some(r => r.toUpperCase().includes('ADMIN')) || (editTarget && user.id === editTarget.id))) && (
              <div className="md:col-span-2">
                <label className="label">Nueva contraseña (opcional)</label>
                <div className="flex gap-2">
                  <input className="input flex-1" type={editPwdVisible ? 'text' : 'password'} value={editForm.password || ''} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
                  <button className="btn-secondary" onClick={() => setEditPwdVisible(v => !v)} type="button">{editPwdVisible ? 'Ocultar' : 'Ver'}</button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Si se llena, debe tener 8+ caracteres, mayúscula, minúscula y número.</p>
              </div>
            )}
          </div>
          <div>
            <label className="label">Rol</label>
            <select
              className="input"
              value={editForm.roleId ?? ''}
              onChange={e => setEditForm(f => ({ ...f, roleId: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">Seleccione un rol</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={saveEdit} disabled={loading}>Guardar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

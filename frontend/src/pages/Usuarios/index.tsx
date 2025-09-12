import { useEffect, useMemo, useState } from 'react'
import { usuariosApi, RolCatalogo, UsuarioItem, UsuarioEstado } from '../../api/endpoints'
import { toast } from 'sonner'

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
    telefono: '',
    roles: [] as number[],
  })

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState<UsuarioEstado | ''>('')
  const [role, setRole] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{ email?: string; nombres?: string; apellidos?: string }>({})

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
    return form.email && isStrongPassword(form.password) && form.nombres && form.apellidos && form.roles.length > 0
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
        telefono: form.telefono || undefined,
        roles: form.roles,
      })
      toast.success('Usuario creado')
      setForm({ email: '', password: '', nombres: '', apellidos: '', telefono: '', roles: [] })
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'No se pudo crear el usuario')
    } finally {
      setLoading(false)
    }
  }

  const toggleRole = (id: number) => {
    setForm((f) => {
      const exists = f.roles.includes(id)
      return { ...f, roles: exists ? f.roles.filter(r => r !== id) : [...f.roles, id] }
    })
  }

  const startEdit = (u: UsuarioItem) => {
    setEditingId(u.id)
    const nombrePartes = (u.nombres || '').split(' ')
    setEditForm({ email: u.email, nombres: nombrePartes.join(' '), apellidos: u.apellidos })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async (u: UsuarioItem) => {
    try {
      await usuariosApi.update(u.id, {
        email: editForm.email,
        nombres: editForm.nombres,
        apellidos: editForm.apellidos,
      })
      toast.success('Usuario actualizado')
      setEditingId(null)
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
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-600">Administra usuarios y roles</p>
      </div>

      {/* Formulario de creación */}
      <form onSubmit={onSubmit} className="bg-white p-4 rounded border space-y-4">
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
          <div>
            <label className="label">Teléfono (opcional)</label>
            <input className="input" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
          </div>
          <div>
            <label className="label">Roles</label>
            <div className="flex flex-wrap gap-2">
              {roles.map(r => (
                <label key={r.id} className={`px-3 py-2 rounded border cursor-pointer ${form.roles.includes(r.id) ? 'bg-primary-600 text-white' : 'bg-white'}`}>
                  <input type="checkbox" className="mr-2" checked={form.roles.includes(r.id)} onChange={() => toggleRole(r.id)} />
                  {r.nombre}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <button type="submit" className="btn-primary" disabled={!canSubmit || loading}>
            {loading ? 'Guardando...' : 'Crear usuario'}
          </button>
        </div>
      </form>

      {/* Filtros */}
      <div className="bg-white p-4 rounded border flex flex-wrap gap-3 items-end">
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
      <div className="bg-white rounded border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {editingId === u.id ? (
                      <input className="input" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                    ) : (
                      u.email
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {editingId === u.id ? (
                      <div className="flex gap-2">
                        <input className="input" placeholder="Nombres" value={editForm.nombres || ''} onChange={e => setEditForm(f => ({ ...f, nombres: e.target.value }))} />
                        <input className="input" placeholder="Apellidos" value={editForm.apellidos || ''} onChange={e => setEditForm(f => ({ ...f, apellidos: e.target.value }))} />
                      </div>
                    ) : (
                      <>{u.nombres} {u.apellidos}</>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className="mr-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">{u.estado}</span>
                    {u.estado !== 'ACTIVO' && (
                      <button className="btn-secondary mr-2" onClick={() => changeStatus(u, 'ACTIVO')}>Activar</button>
                    )}
                    {u.estado !== 'INACTIVO' && (
                      <button className="btn-secondary mr-2" onClick={() => changeStatus(u, 'INACTIVO')}>Desactivar</button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">{u.roles.join(', ')}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {editingId === u.id ? (
                      <>
                        <button className="btn-primary" onClick={() => saveEdit(u)} disabled={loading}>Guardar</button>
                        <button className="btn-secondary" onClick={cancelEdit}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button className="btn-secondary" onClick={() => startEdit(u)}>Editar</button>
                        <button className="btn-secondary" onClick={() => remove(u)}>Eliminar</button>
                      </>
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
    </div>
  )
}

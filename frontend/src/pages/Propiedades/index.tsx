import { useEffect, useMemo, useState } from 'react'
import { propiedadesApi, PropiedadItem } from '../../api/endpoints'
import { notifyError, notifySuccess } from '../../lib/notifications'

export default function Propiedades() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<PropiedadItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({ codigo: '', tipo: 'APARTAMENTO', titulo: '', direccion: '', renta_mensual: '' as unknown as number })
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<PropiedadItem | null>(null)
  const [editForm, setEditForm] = useState<Partial<PropiedadItem> & { area_m2?: number; deposito?: number; notas?: string; estado?: string }>({})
  const [createOpen, setCreateOpen] = useState(false)

  const canSubmit = useMemo(() => form.codigo && form.titulo && form.direccion && Number(form.renta_mensual) > 0, [form])

  const load = async () => {
    setLoading(true)
    try {
      const data = await propiedadesApi.list({ page, limit, search: search || undefined })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) { notifyError(e?.response?.data?.error?.message || e.message || 'Error al cargar propiedades') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, limit, search])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      await propiedadesApi.create(form as any)
      notifySuccess('Propiedad creada')
      setForm({ codigo: '', tipo: 'APARTAMENTO', titulo: '', direccion: '', renta_mensual: '' as any })
      await load()
    } catch (e: any) { notifyError(e?.response?.data?.error?.message || e.message || 'No se pudo crear') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Propiedades</h1>
          <p className="text-gray-600 dark:text-gray-300">Listado y registro de propiedades (API en evolución).</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={() => setCreateOpen(true)}>Nueva propiedad</button>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded border">
        <div className="p-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="w-full sm:flex-1 sm:min-w-[220px]">
            <label className="label">Buscar</label>
            <input className="input" placeholder="Código, título o dirección" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="w-full sm:w-40">
            <label className="label">Tamaño página</label>
            <select className="input" value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <button className="btn-secondary w-full sm:w-auto" onClick={() => { setPage(1); load() }} type="button">Aplicar</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Código</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Título</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dirección</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Renta</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{p.codigo}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{p.titulo}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{p.tipo}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{p.direccion}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">GTQ {Number(p.renta_mensual).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right relative">
                    <button className="btn-secondary" onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}>⋮</button>
                    {openMenuId === p.id && (
                      <div className="absolute right-2 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow z-10 text-left">
                        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setOpenMenuId(null); setEditTarget(p); setEditForm({ ...p }); setEditOpen(true) }}>Editar</button>
                        <button className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400" onClick={async () => { setOpenMenuId(null); try { await propiedadesApi.remove(p.id); notifySuccess('Propiedad eliminada'); await load() } catch (e: any) { notifyError(e?.response?.data?.error?.message || e.message || 'No se pudo eliminar') } }}>Eliminar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between">
          <div>Total: {total}</div>
          <div className="space-x-2">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
            <span>Página {page}</span>
            <button className="btn-secondary" disabled={items.length < limit} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </div>
        </div>
      </div>

      {/* Modal crear propiedad */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nueva propiedad</h2>
              <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cerrar</button>
            </div>
            <form className="p-4 space-y-4" onSubmit={create}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Código</label>
                  <input className="input" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))}>
                    <option>APARTAMENTO</option>
                    <option>CASA</option>
                    <option>ESTUDIO</option>
                    <option>OTRO</option>
                  </select>
                </div>
                <div>
                  <label className="label">Título</label>
                  <input className="input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Dirección</label>
                  <input className="input" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Renta mensual (GTQ)</label>
                  <input className="input" type="number" min={0} step={0.01} value={form.renta_mensual as any} onChange={e => setForm(f => ({ ...f, renta_mensual: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancelar</button>
                <button className="btn-primary" type="submit" disabled={!canSubmit || loading}>{loading ? 'Guardando...' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Editar propiedad</h2>
              <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cerrar</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Código</label>
                  <input className="input" value={editForm.codigo || ''} onChange={e => setEditForm(f => ({ ...f, codigo: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select className="input" value={editForm.tipo || 'APARTAMENTO'} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value as any }))}>
                    <option>APARTAMENTO</option>
                    <option>CASA</option>
                    <option>ESTUDIO</option>
                    <option>OTRO</option>
                  </select>
                </div>
                <div>
                  <label className="label">Título</label>
                  <input className="input" value={editForm.titulo || ''} onChange={e => setEditForm(f => ({ ...f, titulo: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Dirección</label>
                  <input className="input" value={editForm.direccion || ''} onChange={e => setEditForm(f => ({ ...f, direccion: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Dormitorios</label>
                  <input className="input" type="number" min={0} value={(editForm as any).dormitorios ?? 0} onChange={e => setEditForm(f => ({ ...f, dormitorios: Number(e.target.value) as any }))} />
                </div>
                <div>
                  <label className="label">Baños</label>
                  <input className="input" type="number" min={0} value={(editForm as any).banos ?? 0} onChange={e => setEditForm(f => ({ ...f, banos: Number(e.target.value) as any }))} />
                </div>
                <div>
                  <label className="label">Área (m²)</label>
                  <input className="input" type="number" min={0} step={0.01} value={(editForm as any).area_m2 ?? ''} onChange={e => setEditForm(f => ({ ...f, area_m2: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Renta mensual (GTQ)</label>
                  <input className="input" type="number" min={0} step={0.01} value={editForm.renta_mensual ?? 0} onChange={e => setEditForm(f => ({ ...f, renta_mensual: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Depósito</label>
                  <input className="input" type="number" min={0} step={0.01} value={(editForm as any).deposito ?? 0} onChange={e => setEditForm(f => ({ ...f, deposito: Number(e.target.value) as any }))} />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <select className="input" value={editForm.estado || ''} onChange={e => setEditForm(f => ({ ...f, estado: e.target.value }))}>
                    <option value="">(sin cambio)</option>
                    <option value="DISPONIBLE">DISPONIBLE</option>
                    <option value="OCUPADA">OCUPADA</option>
                    <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                    <option value="INACTIVA">INACTIVA</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Notas</label>
                  <input className="input" value={(editForm as any).notas || ''} onChange={e => setEditForm(f => ({ ...f, notas: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={async () => {
                  if (!editTarget) return; setLoading(true);
                  try {
                    const { estado, ...payload } = editForm
                    await propiedadesApi.update(editTarget.id, payload as any)
                    if (estado) { await propiedadesApi.changeStatus(editTarget.id, estado) }
                    notifySuccess('Propiedad actualizada'); setEditOpen(false); setEditTarget(null); await load();
                  } catch (e: any) { notifyError(e?.response?.data?.error?.message || e.message || 'No se pudo actualizar') } finally { setLoading(false) }
                }} disabled={loading}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

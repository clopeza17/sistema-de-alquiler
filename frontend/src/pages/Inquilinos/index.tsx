import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { inquilinosApi, InquilinoItem } from '../../api/endpoints'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export default function Inquilinos() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<InquilinoItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<InquilinoItem | null>(null)
  const [editForm, setEditForm] = useState<{ doc_identidad?: string; nombre_completo?: string; telefono?: string; correo?: string; direccion?: string; activo?: boolean }>({})

  const inqSchema = z.object({
    nombre_completo: z.string().min(2, 'Ingresa el nombre completo'),
    correo: z.string().email('Correo inválido').optional().or(z.literal('')),
    telefono: z.string().regex(/^$|^\d{8}$/,'8 dígitos').optional().or(z.literal('')),
    direccion: z.string().max(255,'Máximo 255 caracteres').optional().or(z.literal('')),
  })
  type InqForm = z.infer<typeof inqSchema>
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InqForm>({
    resolver: zodResolver(inqSchema),
    defaultValues: { nombre_completo: '', correo: '', telefono: '', direccion: '' },
  })

  const load = async () => {
    setLoading(true)
    try {
      const data = await inquilinosApi.list({ page, limit, search: search || undefined })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || e.message || 'Error al cargar inquilinos')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, limit, search])

  const create = async (data: InqForm) => {
    setLoading(true)
    try {
      await inquilinosApi.create(data)
      toast.success('Inquilino creado')
      reset()
      setCreateOpen(false)
      await load()
    } catch (e: any) { toast.error(e?.response?.data?.error?.message || e.message || 'No se pudo crear') } finally { setLoading(false) }
  }

  const changeEstado = async (inq: InquilinoItem, activo: boolean) => {
    try {
      await inquilinosApi.changeStatus(inq.id, activo)
      toast.success('Estado actualizado')
      await load()
    } catch (e: any) { toast.error(e?.response?.data?.error?.message || e.message || 'No se pudo actualizar estado') }
  }

  const removeInquilino = async (inq: InquilinoItem) => {
    if (!confirm(`¿Eliminar inquilino ${inq.nombre_completo}?`)) return
    try {
      await inquilinosApi.remove(inq.id)
      toast.success('Inquilino eliminado')
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || e.message || 'No se pudo eliminar')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inquilinos</h1>
          <p className="text-gray-600 dark:text-gray-300">Gestiona inquilinos del sistema</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={() => setCreateOpen(true)}>Nuevo inquilino</button>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded border">
        <div className="p-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="w-full sm:flex-1 sm:min-w-[220px]">
            <label className="label">Buscar</label>
            <input className="input" placeholder="Nombre o correo" value={search} onChange={e => setSearch(e.target.value)} />
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
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Correo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Teléfono</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map(i => (
                <tr key={i.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{i.nombre_completo}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{i.correo || '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{i.telefono || '—'}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`mr-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${i.activo ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>{i.activo ? 'ACTIVO' : 'INACTIVO'}</span>
                  </td>
                  <td className="px-4 py-2 text-right relative">
                    <button className="btn-secondary" onClick={() => setOpenMenuId(openMenuId === i.id ? null : i.id)} aria-haspopup="menu" aria-expanded={openMenuId === i.id}>⋮</button>
                    {openMenuId === i.id && (
                      <div className="absolute right-2 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow z-10 text-left">
                        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setOpenMenuId(null); setEditTarget(i); setEditForm({ doc_identidad: (i as any).doc_identidad || '', nombre_completo: i.nombre_completo, telefono: i.telefono || '', correo: i.correo || '', direccion: i.direccion || '', activo: i.activo }); setEditOpen(true) }}>Editar</button>
                        {!i.activo ? (
                          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setOpenMenuId(null); changeEstado(i, true) }}>Activar</button>
                        ) : (
                          <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setOpenMenuId(null); changeEstado(i, false) }}>Desactivar</button>
                        )}
                        <button className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400" onClick={() => { setOpenMenuId(null); removeInquilino(i) }}>Eliminar</button>
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

      {/* Modal crear inquilino */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nuevo inquilino</h2>
              <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cerrar</button>
            </div>
            <form className="p-4 space-y-4" onSubmit={handleSubmit(create)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre completo</label>
                  <input className="input" {...register('nombre_completo')} />
                  {errors.nombre_completo && <p className="text-xs text-red-500 mt-1">{errors.nombre_completo.message}</p>}
                </div>
                <div>
                  <label className="label">Correo (opcional)</label>
                  <input className="input" type="email" {...register('correo')} />
                  {errors.correo && <p className="text-xs text-red-500 mt-1">{errors.correo.message}</p>}
                </div>
                <div>
                  <label className="label">Teléfono (opcional)</label>
                  <input className="input" {...register('telefono')} />
                  {errors.telefono && <p className="text-xs text-red-500 mt-1">{errors.telefono.message}</p>}
                </div>
                <div>
                  <label className="label">Dirección (opcional)</label>
                  <input className="input" {...register('direccion')} />
                  {errors.direccion && <p className="text-xs text-red-500 mt-1">{errors.direccion.message}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancelar</button>
                <button className="btn-primary" type="submit" disabled={isSubmitting || loading}>{isSubmitting || loading ? 'Guardando...' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Editar inquilino</h2>
              <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cerrar</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Documento (DPI/NIT)</label>
                  <input className="input" value={editForm.doc_identidad || ''} onChange={e => setEditForm(f => ({ ...f, doc_identidad: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Nombre completo</label>
                  <input className="input" value={editForm.nombre_completo || ''} onChange={e => setEditForm(f => ({ ...f, nombre_completo: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Correo</label>
                  <input className="input" type="email" value={editForm.correo || ''} onChange={e => setEditForm(f => ({ ...f, correo: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input className="input" value={editForm.telefono || ''} onChange={e => setEditForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Dirección</label>
                  <input className="input" value={editForm.direccion || ''} onChange={e => setEditForm(f => ({ ...f, direccion: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <select className="input" value={editForm.activo ? 'ACTIVO' : 'INACTIVO'} onChange={e => setEditForm(f => ({ ...f, activo: e.target.value === 'ACTIVO' }))}>
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={async () => {
                  if (!editTarget) return; setLoading(true);
                  try {
                    await inquilinosApi.update(editTarget.id, {
                      doc_identidad: editForm.doc_identidad,
                      nombre_completo: editForm.nombre_completo,
                      telefono: editForm.telefono,
                      correo: editForm.correo,
                      direccion: editForm.direccion,
                    });
                    if (typeof editForm.activo === 'boolean' && editForm.activo !== editTarget.activo) {
                      await inquilinosApi.changeStatus(editTarget.id, editForm.activo)
                    }
                    toast.success('Inquilino actualizado'); setEditOpen(false); setEditTarget(null); await load();
                  } catch (e: any) { toast.error(e?.response?.data?.error?.message || e.message || 'No se pudo actualizar') } finally { setLoading(false) }
                }} disabled={loading}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

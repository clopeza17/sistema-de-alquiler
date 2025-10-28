import { useEffect, useMemo, useState } from 'react'
import {
  gastosApi,
  GastoItem,
  TipoGastoItem,
  propiedadesApi,
  PropiedadItem,
} from '../../api/endpoints'
import { notifyApiError, notifySuccess } from '../../lib/notifications'
import { formatCurrencyGTQ, formatDateGT, formatDateTimeGT } from '../../utils/format'

interface GastoFormState {
  propiedad_id: string
  tipo_gasto_id: string
  fecha_gasto: string
  monto: string
  detalle: string
}

interface GastoEditState {
  tipo_gasto_id?: string
  fecha_gasto?: string
  monto?: string
  detalle?: string
}

const initialForm: GastoFormState = {
  propiedad_id: '',
  tipo_gasto_id: '',
  fecha_gasto: '',
  monto: '',
  detalle: '',
}

export default function Gastos() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<GastoItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const [propiedadFiltro, setPropiedadFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const [propiedades, setPropiedades] = useState<PropiedadItem[]>([])
  const [tipos, setTipos] = useState<TipoGastoItem[]>([])

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<GastoFormState>(initialForm)

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<GastoItem | null>(null)
  const [editForm, setEditForm] = useState<GastoEditState>({})

  const canCreate = useMemo(() => {
    return (
      createForm.propiedad_id &&
      createForm.tipo_gasto_id &&
      createForm.fecha_gasto &&
      Number(createForm.monto) > 0
    )
  }, [createForm])

  const load = async () => {
    setLoading(true)
    try {
      const data = await gastosApi.list({
        page,
        limit,
        propiedad_id: propiedadFiltro ? Number(propiedadFiltro) : undefined,
        tipo_gasto_id: tipoFiltro ? Number(tipoFiltro) : undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      })
      setItems(data.items)
      setTotal(data.total)
    } catch (error) {
      notifyApiError(error, 'No se pudo cargar los gastos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page, limit, propiedadFiltro, tipoFiltro, fechaDesde, fechaHasta])

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [props, tiposCat] = await Promise.all([
          propiedadesApi.list({ page: 1, limit: 100 }),
          gastosApi.catalogoTipos(),
        ])
        setPropiedades(props.items || [])
        setTipos(tiposCat)
      } catch (error) {
        notifyApiError(error, 'No se pudo cargar catálogos de gastos')
      }
    }
    fetchCatalogos()
  }, [])

  const resetCreateForm = () => {
    setCreateForm(initialForm)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreate) return
    try {
      setLoading(true)
      await gastosApi.create({
        propiedad_id: Number(createForm.propiedad_id),
        tipo_gasto_id: Number(createForm.tipo_gasto_id),
        fecha_gasto: createForm.fecha_gasto,
        monto: Number(createForm.monto),
        detalle: createForm.detalle.trim() ? createForm.detalle.trim() : undefined,
      })
      notifySuccess('Gasto registrado exitosamente')
      setCreateOpen(false)
      resetCreateForm()
      await load()
    } catch (error) {
      notifyApiError(error, 'No se pudo registrar el gasto')
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (gasto: GastoItem) => {
    setEditTarget(gasto)
    setEditForm({
      tipo_gasto_id: gasto.tipo_gasto_id?.toString() || '',
      fecha_gasto: gasto.fecha_gasto,
      monto: gasto.monto.toString(),
      detalle: gasto.detalle || '',
    })
    setEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return

    const payload: Record<string, any> = {}
    if (editForm.tipo_gasto_id && Number(editForm.tipo_gasto_id) !== editTarget.tipo_gasto_id) {
      payload.tipo_gasto_id = Number(editForm.tipo_gasto_id)
    }
    if (editForm.fecha_gasto && editForm.fecha_gasto !== editTarget.fecha_gasto) {
      payload.fecha_gasto = editForm.fecha_gasto
    }
    if (editForm.monto && Number(editForm.monto) !== Number(editTarget.monto)) {
      payload.monto = Number(editForm.monto)
    }
    if (editForm.detalle !== undefined && editForm.detalle !== (editTarget.detalle || '')) {
      payload.detalle = editForm.detalle.trim() ? editForm.detalle.trim() : null
    }

    if (Object.keys(payload).length === 0) {
      notifySuccess('No hay cambios para guardar')
      setEditOpen(false)
      return
    }

    try {
      setLoading(true)
      await gastosApi.update(editTarget.id, payload)
      notifySuccess('Gasto actualizado correctamente')
      setEditOpen(false)
      await load()
    } catch (error) {
      notifyApiError(error, 'No se pudo actualizar el gasto')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (gasto: GastoItem) => {
    if (!confirm(`¿Eliminar gasto #${gasto.id}?`)) return
    try {
      setLoading(true)
      await gastosApi.remove(gasto.id)
      notifySuccess('Gasto eliminado')
      await load()
    } catch (error) {
      notifyApiError(error, 'No se pudo eliminar el gasto')
    } finally {
      setLoading(false)
    }
  }

  const propertyName = (id: number) =>
    propiedades.find(p => p.id === id)?.titulo || propiedades.find(p => p.id === id)?.codigo || `Propiedad ${id}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gastos fijos</h1>
          <p className="text-gray-600 dark:text-gray-300">Control de gastos por propiedad con filtros y catálogos oficiales.</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={() => setCreateOpen(true)}>Registrar gasto</button>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded border">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Propiedad</label>
            <select
              className="input"
              value={propiedadFiltro}
              onChange={e => {
                setPropiedadFiltro(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todas</option>
              {propiedades.map(prop => (
                <option key={prop.id} value={prop.id}>{prop.codigo} — {prop.titulo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipo de gasto</label>
            <select
              className="input"
              value={tipoFiltro}
              onChange={e => {
                setTipoFiltro(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos</option>
              {tipos.map(tipo => (
                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fecha desde</label>
            <input
              className="input"
              type="date"
              value={fechaDesde}
              onChange={e => {
                setFechaDesde(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div>
            <label className="label">Fecha hasta</label>
            <input
              className="input"
              type="date"
              value={fechaHasta}
              onChange={e => {
                setFechaHasta(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="md:col-span-4 flex flex-wrap items-center gap-3">
            <div>
              <label className="label">Tamaño de página</label>
              <select
                className="input"
                value={limit}
                onChange={e => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setPropiedadFiltro('')
                setTipoFiltro('')
                setFechaDesde('')
                setFechaHasta('')
                setPage(1)
              }}
            >
              Limpiar filtros
            </button>
            {loading && <span className="text-sm text-gray-500 dark:text-gray-300">Cargando…</span>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Propiedad</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Detalle</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Registrado por</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map(gasto => (
                <tr key={gasto.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                    <div className="font-medium">{propertyName(gasto.propiedad_id)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{gasto.propiedad_codigo}</div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{gasto.tipo_gasto_nombre || '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{formatDateGT(gasto.fecha_gasto)}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-gray-100">{formatCurrencyGTQ(Number(gasto.monto))}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{gasto.detalle || '—'}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                    <div>{gasto.creado_por_nombre || `Usuario ${gasto.creado_por}`}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatDateTimeGT(gasto.creado_el)}</div>
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    <div className="inline-flex gap-2">
                      <button className="btn-secondary" onClick={() => openEdit(gasto)}>Editar</button>
                      <button className="btn-secondary text-red-600 hover:text-red-700" onClick={() => handleDelete(gasto)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No hay registros para los filtros seleccionados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between">
          <div>Total: {total}</div>
          <div className="space-x-2">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
            <span>Página {page}</span>
            <button className="btn-secondary" disabled={items.length < limit} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </div>
        </div>
      </div>

      {/* Modal crear */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Registrar gasto</h2>
              <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cerrar</button>
            </div>
            <form className="p-4 space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Propiedad</label>
                  <select
                    className="input"
                    value={createForm.propiedad_id}
                    onChange={e => setCreateForm(f => ({ ...f, propiedad_id: e.target.value }))}
                    required
                  >
                    <option value="">Seleccione</option>
                    {propiedades.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.codigo} — {prop.titulo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tipo de gasto</label>
                  <select
                    className="input"
                    value={createForm.tipo_gasto_id}
                    onChange={e => setCreateForm(f => ({ ...f, tipo_gasto_id: e.target.value }))}
                    required
                  >
                    <option value="">Seleccione</option>
                    {tipos.map(tipo => (
                      <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Fecha del gasto</label>
                  <input
                    type="date"
                    className="input"
                    value={createForm.fecha_gasto}
                    onChange={e => setCreateForm(f => ({ ...f, fecha_gasto: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Monto (GTQ)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="input"
                    value={createForm.monto}
                    onChange={e => setCreateForm(f => ({ ...f, monto: e.target.value }))}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Detalle (opcional)</label>
                  <textarea
                    className="input min-h-[80px]"
                    value={createForm.detalle}
                    onChange={e => setCreateForm(f => ({ ...f, detalle: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => { setCreateOpen(false); resetCreateForm() }}>Cancelar</button>
                <button className="btn-primary" type="submit" disabled={!canCreate || loading}>
                  {loading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Editar gasto #{editTarget.id}</h2>
              <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cerrar</button>
            </div>
            <form className="p-4 space-y-4" onSubmit={handleUpdate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Tipo de gasto</label>
                  <select
                    className="input"
                    value={editForm.tipo_gasto_id || ''}
                    onChange={e => setEditForm(f => ({ ...f, tipo_gasto_id: e.target.value }))}
                  >
                    <option value="">Selecciona</option>
                    {tipos.map(tipo => (
                      <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Fecha</label>
                  <input
                    type="date"
                    className="input"
                    value={editForm.fecha_gasto || ''}
                    onChange={e => setEditForm(f => ({ ...f, fecha_gasto: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Monto (GTQ)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="input"
                    value={editForm.monto || ''}
                    onChange={e => setEditForm(f => ({ ...f, monto: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Detalle</label>
                  <textarea
                    className="input min-h-[80px]"
                    value={editForm.detalle ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, detalle: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>Cancelar</button>
                <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Actualizar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

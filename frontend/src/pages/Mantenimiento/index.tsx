import { useEffect, useMemo, useState } from 'react'
import {
  mantenimientoApi,
  MantenimientoItem,
  MantenimientoEstado,
  MantenimientoPrioridad,
  propiedadesApi,
  PropiedadItem,
  contratosApi,
  ContratoItem,
} from '../../api/endpoints'
import { notifyApiError, notifySuccess } from '../../lib/notifications'
import { formatDateTimeGT } from '../../utils/format'

interface MantenimientoCreateForm {
  propiedad_id: string
  contrato_id: string
  asunto: string
  descripcion: string
  prioridad: MantenimientoPrioridad
  estado: MantenimientoEstado
  reportado_por: string
}

interface MantenimientoEditForm {
  estado?: MantenimientoEstado
  prioridad?: MantenimientoPrioridad
  descripcion?: string
  reportado_por?: string
}

const ESTADOS: MantenimientoEstado[] = ['ABIERTA', 'EN_PROCESO', 'EN_ESPERA', 'RESUELTA', 'CANCELADA']
const PRIORIDADES: MantenimientoPrioridad[] = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']

const estadoStyles: Record<MantenimientoEstado, string> = {
  ABIERTA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  EN_PROCESO: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
  EN_ESPERA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  RESUELTA: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
}

const prioridadStyles: Record<MantenimientoPrioridad, string> = {
  BAJA: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200',
  MEDIA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  ALTA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  CRITICA: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
}

const initialCreateForm: MantenimientoCreateForm = {
  propiedad_id: '',
  contrato_id: '',
  asunto: '',
  descripcion: '',
  prioridad: 'MEDIA',
  estado: 'ABIERTA',
  reportado_por: '',
}

export default function Mantenimiento() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<MantenimientoItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const [propiedadFiltro, setPropiedadFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [prioridadFiltro, setPrioridadFiltro] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const [propiedades, setPropiedades] = useState<PropiedadItem[]>([])
  const [contratosPropiedad, setContratosPropiedad] = useState<ContratoItem[]>([])

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<MantenimientoCreateForm>(initialCreateForm)
  const [contractsLoading, setContractsLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MantenimientoItem | null>(null)
  const [editForm, setEditForm] = useState<MantenimientoEditForm>({})

  const canCreate = useMemo(() => {
    return createForm.propiedad_id && createForm.asunto.trim().length >= 3
  }, [createForm.propiedad_id, createForm.asunto])

  const load = async () => {
    setLoading(true)
    try {
      const data = await mantenimientoApi.list({
        page,
        limit,
        propiedad_id: propiedadFiltro ? Number(propiedadFiltro) : undefined,
        estado: estadoFiltro ? (estadoFiltro as MantenimientoEstado) : undefined,
        prioridad: prioridadFiltro ? (prioridadFiltro as MantenimientoPrioridad) : undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      })
      setItems(data.items)
      setTotal(data.total)
    } catch (error) {
      notifyApiError(error, 'No se pudo cargar mantenimiento')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page, limit, propiedadFiltro, estadoFiltro, prioridadFiltro, fechaDesde, fechaHasta])

  useEffect(() => {
    const cargarPropiedades = async () => {
      try {
        const res = await propiedadesApi.list({ page: 1, limit: 100 })
        setPropiedades(res.items || [])
      } catch (error) {
        notifyApiError(error, 'No se pudieron cargar propiedades')
      }
    }
    cargarPropiedades()
  }, [])

  const cargarContratosDePropiedad = async (propiedadId: number) => {
    setContractsLoading(true)
    try {
      const res = await contratosApi.list({ propiedad_id: propiedadId, page: 1, limit: 100 })
      setContratosPropiedad(res.items || [])
    } catch (error) {
      notifyApiError(error, 'No se pudieron cargar contratos de la propiedad')
      setContratosPropiedad([])
    } finally {
      setContractsLoading(false)
    }
  }

  useEffect(() => {
    if (createForm.propiedad_id) {
      cargarContratosDePropiedad(Number(createForm.propiedad_id))
    } else {
      setContratosPropiedad([])
    }
  }, [createForm.propiedad_id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreate) return
    try {
      setLoading(true)
      await mantenimientoApi.create({
        propiedad_id: Number(createForm.propiedad_id),
        contrato_id: createForm.contrato_id ? Number(createForm.contrato_id) : undefined,
        asunto: createForm.asunto.trim(),
        descripcion: createForm.descripcion.trim() ? createForm.descripcion.trim() : undefined,
        prioridad: createForm.prioridad,
        estado: createForm.estado,
        reportado_por: createForm.reportado_por.trim() ? createForm.reportado_por.trim() : undefined,
      })
      notifySuccess('Solicitud registrada')
      setCreateOpen(false)
      setCreateForm(initialCreateForm)
      await load()
    } catch (error) {
      notifyApiError(error, 'No se pudo registrar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (item: MantenimientoItem) => {
    setEditTarget(item)
    setEditForm({
      estado: item.estado,
      prioridad: item.prioridad,
      descripcion: item.descripcion || '',
      reportado_por: item.reportado_por || '',
    })
    setEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return

    const payload: Record<string, any> = {}
    if (editForm.estado && editForm.estado !== editTarget.estado) {
      payload.estado = editForm.estado
    }
    if (editForm.prioridad && editForm.prioridad !== editTarget.prioridad) {
      payload.prioridad = editForm.prioridad
    }
    if (editForm.descripcion !== undefined && editForm.descripcion !== (editTarget.descripcion || '')) {
      payload.descripcion = editForm.descripcion.trim() ? editForm.descripcion.trim() : null
    }
    if (editForm.reportado_por !== undefined && editForm.reportado_por !== (editTarget.reportado_por || '')) {
      payload.reportado_por = editForm.reportado_por.trim() ? editForm.reportado_por.trim() : null
    }

    if (Object.keys(payload).length === 0) {
      notifySuccess('No hay cambios para guardar')
      setEditOpen(false)
      return
    }

    try {
      setLoading(true)
      await mantenimientoApi.update(editTarget.id, payload)
      notifySuccess('Solicitud actualizada')
      setEditOpen(false)
      await load()
    } catch (error) {
      notifyApiError(error, 'No se pudo actualizar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (item: MantenimientoItem) => {
    if (item.estado === 'CANCELADA') return
    if (!confirm(`¿Cancelar la solicitud #${item.id}?`)) return
    try {
      setLoading(true)
      await mantenimientoApi.cancel(item.id)
      notifySuccess('Solicitud cancelada')
      await load()
    } catch (error) {
      notifyApiError(error, 'No se pudo cancelar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  const propiedadLabel = (id: number) => {
    const match = propiedades.find(p => p.id === id)
    return match ? `${match.codigo} — ${match.titulo}` : `Propiedad ${id}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mantenimiento</h1>
          <p className="text-gray-600 dark:text-gray-300">Seguimiento de tickets de mantenimiento y estados operativos.</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={() => setCreateOpen(true)}>Nueva solicitud</button>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded border">
        <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
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
            <label className="label">Estado</label>
            <select
              className="input"
              value={estadoFiltro}
              onChange={e => {
                setEstadoFiltro(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos</option>
              {ESTADOS.map(estado => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Prioridad</label>
            <select
              className="input"
              value={prioridadFiltro}
              onChange={e => {
                setPrioridadFiltro(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todas</option>
              {PRIORIDADES.map(prioridad => (
                <option key={prioridad} value={prioridad}>{prioridad}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fecha desde</label>
            <input
              type="date"
              className="input"
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
              type="date"
              className="input"
              value={fechaHasta}
              onChange={e => {
                setFechaHasta(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="md:col-span-5 flex flex-wrap items-center gap-3">
            <div>
              <label className="label">Tamaño página</label>
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
                setEstadoFiltro('')
                setPrioridadFiltro('')
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
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Propiedad</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Asunto</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Prioridad</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fechas</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">#{item.id}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                    <div className="font-medium">{propiedadLabel(item.propiedad_id)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Contrato: {item.contrato_id || '—'}</div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">
                    <div className="font-medium">{item.asunto}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-300">{item.descripcion || 'Sin descripción'}</div>
                    {item.inquilino_nombre && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">Inquilino: {item.inquilino_nombre}</div>
                    )}
                    {item.reportado_por && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">Reportado por: {item.reportado_por}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[item.estado]}`}>
                      {item.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${prioridadStyles[item.prioridad]}`}>
                      {item.prioridad}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                    <div>Apertura: {formatDateTimeGT(item.abierta_el)}</div>
                    <div>Cierre: {item.cerrada_el ? formatDateTimeGT(item.cerrada_el) : '—'}</div>
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    <div className="inline-flex gap-2">
                      <button className="btn-secondary" onClick={() => openEdit(item)}>Editar</button>
                      <button
                        className={`btn-secondary ${item.estado === 'CANCELADA' ? 'opacity-50 cursor-not-allowed' : 'text-red-600 hover:text-red-700'}`}
                        onClick={() => handleCancel(item)}
                        disabled={item.estado === 'CANCELADA'}
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">No hay tickets registrados.</td>
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
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nueva solicitud de mantenimiento</h2>
              <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cerrar</button>
            </div>
            <form className="p-4 space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Propiedad</label>
                  <select
                    className="input"
                    value={createForm.propiedad_id}
                    onChange={e => setCreateForm(f => ({ ...f, propiedad_id: e.target.value, contrato_id: '' }))}
                    required
                  >
                    <option value="">Seleccione</option>
                    {propiedades.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.codigo} — {prop.titulo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Contrato (opcional)</label>
                  <select
                    className="input"
                    value={createForm.contrato_id}
                    onChange={e => setCreateForm(f => ({ ...f, contrato_id: e.target.value }))}
                    disabled={!createForm.propiedad_id || contractsLoading}
                  >
                    <option value="">Sin contrato</option>
                    {contratosPropiedad.map(contrato => (
                      <option key={contrato.id} value={contrato.id}>{contrato.id} — {contrato.inquilino_nombre || contrato.inquilino_id}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Asunto</label>
                  <input
                    className="input"
                    value={createForm.asunto}
                    onChange={e => setCreateForm(f => ({ ...f, asunto: e.target.value }))}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Descripción</label>
                  <textarea
                    className="input min-h-[90px]"
                    value={createForm.descripcion}
                    onChange={e => setCreateForm(f => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Describe el problema o solicitud"
                  />
                </div>
                <div>
                  <label className="label">Prioridad</label>
                  <select
                    className="input"
                    value={createForm.prioridad}
                    onChange={e => setCreateForm(f => ({ ...f, prioridad: e.target.value as MantenimientoPrioridad }))}
                  >
                    {PRIORIDADES.map(prioridad => (
                      <option key={prioridad} value={prioridad}>{prioridad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Estado inicial</label>
                  <select
                    className="input"
                    value={createForm.estado}
                    onChange={e => setCreateForm(f => ({ ...f, estado: e.target.value as MantenimientoEstado }))}
                  >
                    {ESTADOS.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Reportado por (opcional)</label>
                  <input
                    className="input"
                    value={createForm.reportado_por}
                    onChange={e => setCreateForm(f => ({ ...f, reportado_por: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => { setCreateOpen(false); setCreateForm(initialCreateForm) }}>Cancelar</button>
                <button className="btn-primary" type="submit" disabled={!canCreate || loading}>
                  {loading ? 'Guardando…' : 'Crear'}
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Actualizar solicitud #{editTarget.id}</h2>
              <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cerrar</button>
            </div>
            <form className="p-4 space-y-4" onSubmit={handleUpdate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Estado</label>
                  <select
                    className="input"
                    value={editForm.estado || editTarget.estado}
                    onChange={e => setEditForm(f => ({ ...f, estado: e.target.value as MantenimientoEstado }))}
                  >
                    {ESTADOS.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Prioridad</label>
                  <select
                    className="input"
                    value={editForm.prioridad || editTarget.prioridad}
                    onChange={e => setEditForm(f => ({ ...f, prioridad: e.target.value as MantenimientoPrioridad }))}
                  >
                    {PRIORIDADES.map(prioridad => (
                      <option key={prioridad} value={prioridad}>{prioridad}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Descripción</label>
                  <textarea
                    className="input min-h-[90px]"
                    value={editForm.descripcion ?? editTarget.descripcion ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Reportado por</label>
                  <input
                    className="input"
                    value={editForm.reportado_por ?? editTarget.reportado_por ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, reportado_por: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>Cancelar</button>
                <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

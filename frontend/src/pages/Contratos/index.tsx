import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { contratosApi, ContratoItem, propiedadesApi, inquilinosApi, InquilinoItem, PropiedadItem } from '../../api/endpoints'

export default function Contratos() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ContratoItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [estado, setEstado] = useState<string>('')
  const [propId, setPropId] = useState<number | ''>('')
  const [inqId, setInqId] = useState<number | ''>('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const [propsOptions, setPropsOptions] = useState<PropiedadItem[]>([])
  const [inqOptions, setInqOptions] = useState<InquilinoItem[]>([])

  const [form, setForm] = useState({
    propiedad_id: 0,
    inquilino_id: 0,
    monto_mensual: '' as unknown as number,
    fecha_inicio: '',
    fecha_fin: '',
    deposito: '' as unknown as number,
    condiciones_especiales: '',
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ContratoItem | null>(null)
  const [editForm, setEditForm] = useState<Partial<ContratoItem> & { nueva_fecha_fin?: string; nuevo_monto?: number }>({})
  const [renewOpen, setRenewOpen] = useState(false)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [finalizeForm, setFinalizeForm] = useState<{ fecha_finalizacion: string; motivo?: string }>({ fecha_finalizacion: '', motivo: '' })
  const [viewFacturasId, setViewFacturasId] = useState<number | null>(null)
  const [facturas, setFacturas] = useState<any[]>([])

  const canCreate = useMemo(() => form.propiedad_id > 0 && form.inquilino_id > 0 && Number(form.monto_mensual) > 0 && form.fecha_inicio && form.fecha_fin, [form])

  const load = async () => {
    setLoading(true)
    try {
      const data = await contratosApi.list({
        page,
        limit,
        estado: estado || undefined,
        propiedad_id: typeof propId === 'number' ? propId : undefined,
        inquilino_id: typeof inqId === 'number' ? inqId : undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || e.message || 'Error al cargar contratos')
    } finally { setLoading(false) }
  }

  const loadLookups = async () => {
    try {
      const [props, inqs] = await Promise.all([
        propiedadesApi.list({ page: 1, limit: 100 }),
        inquilinosApi.list({ page: 1, limit: 100 }),
      ])
      setPropsOptions(props.items)
      setInqOptions(inqs.items)
    } catch { /* ignore */ }
  }

  useEffect(() => { load(); loadLookups() }, [page, limit, estado, propId, inqId, fechaDesde, fechaHasta])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreate) return
    setLoading(true)
    try {
      await contratosApi.create({
        propiedad_id: form.propiedad_id,
        inquilino_id: form.inquilino_id,
        monto_mensual: form.monto_mensual,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        deposito: Number(form.deposito) || 0,
        condiciones_especiales: form.condiciones_especiales || undefined,
      })
      toast.success('Contrato creado')
      setCreateOpen(false)
      setForm({ propiedad_id: 0, inquilino_id: 0, monto_mensual: '' as any, fecha_inicio: '', fecha_fin: '', deposito: '' as any, condiciones_especiales: '' })
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || e.message || 'No se pudo crear')
    } finally { setLoading(false) }
  }

  // renovar/finalizar ahora usan modales

  const remove = async (c: ContratoItem) => {
    if (!confirm(`¿Eliminar contrato ${c.id}?`)) return
    setLoading(true)
    try { await contratosApi.remove(c.id); toast.success('Contrato eliminado'); await load() } catch (e: any) { toast.error(e?.response?.data?.error?.message || e.message || 'No se pudo eliminar') } finally { setLoading(false) }
  }

  const loadFacturas = async (id: number) => {
    try {
      const f = await contratosApi.facturas(id)
      setFacturas(f)
    } catch (e: any) { toast.error(e?.response?.data?.error?.message || e.message || 'No se pudieron cargar facturas') }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contratos</h1>
          <p className="text-gray-600 dark:text-gray-300">Gestión de contratos (crear, renovar, finalizar)</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={() => setCreateOpen(true)}>Nuevo contrato</button>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded border">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          <div>
            <label className="label">Estado</label>
            <select className="input" value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="ACTIVO">ACTIVO</option>
              <option value="FINALIZADO">FINALIZADO</option>
              <option value="RESCINDIDO">RESCINDIDO</option>
            </select>
          </div>
          <div>
            <label className="label">Propiedad</label>
            <select className="input" value={propId} onChange={e => setPropId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todas</option>
              {propsOptions.map(p => (
                <option key={p.id} value={p.id}>{p.codigo} - {p.titulo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Inquilino</label>
            <select className="input" value={inqId} onChange={e => setInqId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todos</option>
              {inqOptions.map(i => (
                <option key={i.id} value={i.id}>{i.nombre_completo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Desde</label>
            <input className="input" type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input className="input" type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
          <div>
            <label className="label">Tamaño página</label>
            <select className="input" value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-secondary w-full" onClick={() => { setPage(1); load() }}>Aplicar</button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Propiedad</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Inquilino</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Periodo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map(c => (
                <tr key={c.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{c.propiedad_direccion || `#${c.propiedad_id}`}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{c.inquilino_nombre || `#${c.inquilino_id}`}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">GTQ {Number(c.monto_mensual).toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{c.fecha_inicio} → {c.fecha_fin}</td>
                  <td className="px-4 py-2 text-sm"><span className={`mr-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.estado === 'ACTIVO' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>{c.estado}</span></td>
                  <td className="px-4 py-2 text-right relative">
                    <button className="btn-secondary" onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}>⋮</button>
                    {openMenuId === c.id && (
                      <div className="absolute right-2 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow z-10 text-left">
                        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setOpenMenuId(null); setEditTarget(c); setEditForm({ monto_mensual: c.monto_mensual, fecha_fin: c.fecha_fin }); setEditOpen(true) }}>Editar</button>
                        {c.estado === 'ACTIVO' && (
                          <>
                        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setOpenMenuId(null); setEditTarget(c); setEditForm({ nueva_fecha_fin: c.fecha_fin, nuevo_monto: c.monto_mensual }); setRenewOpen(true) }}>Renovar</button>
                        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setOpenMenuId(null); setEditTarget(c); setFinalizeOpen(true); setFinalizeForm({ fecha_finalizacion: c.fecha_fin, motivo: '' }) }}>Finalizar</button>
                        </>
                      )}
                        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => { setOpenMenuId(null); setViewFacturasId(c.id); loadFacturas(c.id) }}>Ver facturas</button>
                        <button className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400" onClick={() => { setOpenMenuId(null); remove(c) }}>Eliminar</button>
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

      {/* Modal crear contrato */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nuevo contrato</h2>
              <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cerrar</button>
            </div>
            <form className="p-4 space-y-4" onSubmit={create}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Propiedad</label>
                  <select className="input" value={form.propiedad_id || ''} onChange={e => setForm(f => ({ ...f, propiedad_id: Number(e.target.value) }))}>
                    <option value="">Seleccione propiedad</option>
                    {propsOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.codigo} - {p.titulo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Inquilino</label>
                  <select className="input" value={form.inquilino_id || ''} onChange={e => setForm(f => ({ ...f, inquilino_id: Number(e.target.value) }))}>
                    <option value="">Seleccione inquilino</option>
                    {inqOptions.map(i => (
                      <option key={i.id} value={i.id}>{i.nombre_completo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Monto mensual (GTQ)</label>
                  <input className="input" type="number" min={0} step={0.01} value={form.monto_mensual as any} onChange={e => setForm(f => ({ ...f, monto_mensual: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Depósito</label>
                  <input className="input" type="number" min={0} step={0.01} value={form.deposito as any} onChange={e => setForm(f => ({ ...f, deposito: Number(e.target.value) as any }))} />
                </div>
                <div>
                  <label className="label">Fecha inicio</label>
                  <input className="input" type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Fecha fin</label>
                  <input className="input" type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Condiciones especiales</label>
                  <input className="input" value={form.condiciones_especiales} onChange={e => setForm(f => ({ ...f, condiciones_especiales: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={!canCreate || loading}>{loading ? 'Guardando...' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar contrato */}
      {editOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Editar contrato #{editTarget.id}</h2>
              <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cerrar</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Monto mensual (GTQ)</label>
                  <input className="input" type="number" min={0} step={0.01} value={editForm.monto_mensual ?? editTarget.monto_mensual} onChange={e => setEditForm(f => ({ ...f, monto_mensual: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Fecha fin</label>
                  <input className="input" type="date" value={editForm.fecha_fin ?? editTarget.fecha_fin} onChange={e => setEditForm(f => ({ ...f, fecha_fin: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Depósito</label>
                  <input className="input" type="number" min={0} step={0.01} value={editForm.deposito ?? (editTarget.deposito || 0)} onChange={e => setEditForm(f => ({ ...f, deposito: Number(e.target.value) as any }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Condiciones especiales</label>
                  <input className="input" value={editForm.condiciones_especiales ?? (editTarget.condiciones_especiales || '')} onChange={e => setEditForm(f => ({ ...f, condiciones_especiales: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setEditOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={async () => {
                  if (!editTarget) return; setLoading(true)
                  try {
                    await contratosApi.update(editTarget.id, {
                      monto_mensual: editForm.monto_mensual,
                      fecha_fin: editForm.fecha_fin,
                      deposito: editForm.deposito,
                      condiciones_especiales: editForm.condiciones_especiales,
                    })
                    toast.success('Contrato actualizado'); setEditOpen(false); setEditTarget(null); await load()
                  } catch (e: any) { toast.error(e?.response?.data?.error?.message || e.message || 'No se pudo actualizar') } finally { setLoading(false) }
                }} disabled={loading}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal renovar contrato */}
      {renewOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRenewOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Renovar contrato #{editTarget.id}</h2>
              <button className="btn-secondary" onClick={() => setRenewOpen(false)}>Cerrar</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="label">Nueva fecha fin</label>
                <input className="input" type="date" value={editForm.nueva_fecha_fin ?? editTarget.fecha_fin} onChange={e => setEditForm(f => ({ ...f, nueva_fecha_fin: e.target.value }))} />
              </div>
              <div>
                <label className="label">Nuevo monto (opcional)</label>
                <input className="input" type="number" min={0} step={0.01} value={editForm.nuevo_monto ?? editTarget.monto_mensual} onChange={e => setEditForm(f => ({ ...f, nuevo_monto: Number(e.target.value) }))} />
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setRenewOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={async () => {
                  if (!editTarget) return; setLoading(true)
                  try { await contratosApi.renovar(editTarget.id, { nueva_fecha_fin: editForm.nueva_fecha_fin || editTarget.fecha_fin, nuevo_monto: editForm.nuevo_monto }); toast.success('Contrato renovado'); setRenewOpen(false); setEditTarget(null); await load() } catch (e: any) { toast.error(e?.response?.data?.error?.message || e.message || 'No se pudo renovar') } finally { setLoading(false) }
                }} disabled={loading}>Renovar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal finalizar contrato */}
      {finalizeOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFinalizeOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Finalizar contrato #{editTarget.id}</h2>
              <button className="btn-secondary" onClick={() => setFinalizeOpen(false)}>Cerrar</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="label">Fecha de finalización</label>
                <input className="input" type="date" value={finalizeForm.fecha_finalizacion} onChange={e => setFinalizeForm(f => ({ ...f, fecha_finalizacion: e.target.value }))} />
              </div>
              <div>
                <label className="label">Motivo (opcional)</label>
                <input className="input" value={finalizeForm.motivo || ''} onChange={e => setFinalizeForm(f => ({ ...f, motivo: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setFinalizeOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={async () => {
                  if (!editTarget || !finalizeForm.fecha_finalizacion) return; setLoading(true)
                  try { await contratosApi.finalizar(editTarget.id, { fecha_finalizacion: finalizeForm.fecha_finalizacion, motivo: finalizeForm.motivo }); toast.success('Contrato finalizado'); setFinalizeOpen(false); setEditTarget(null); await load() } catch (e: any) { toast.error(e?.response?.data?.error?.message || e.message || 'No se pudo finalizar') } finally { setLoading(false) }
                }} disabled={loading || !finalizeForm.fecha_finalizacion}>Finalizar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal facturas del contrato */}
      {viewFacturasId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewFacturasId(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Facturas del contrato #{viewFacturasId}</h2>
              <button className="btn-secondary" onClick={() => setViewFacturasId(null)}>Cerrar</button>
            </div>
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Factura</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Emisión</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vencimiento</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Saldo</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {facturas.map((f: any) => (
                      <tr key={f.id}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{f.numero_factura || f.id}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{f.fecha_emision}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{f.fecha_vencimiento}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">GTQ {Number(f.monto_total).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">GTQ {Number(f.saldo_pendiente).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm"><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{f.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

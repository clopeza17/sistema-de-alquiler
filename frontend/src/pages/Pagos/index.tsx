import { useEffect, useState } from 'react'
import { pagosApi, contratosApi, facturasApi, PagoItem, FormaPagoItem, FacturaItem } from '../../api/endpoints'
import { notifyError, notifySuccess } from '../../lib/notifications'

export default function Pagos() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<PagoItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [contratoId, setContratoId] = useState<number | ''>('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [formas, setFormas] = useState<FormaPagoItem[]>([])
  const [contratosOptions, setContratosOptions] = useState<any[]>([])

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<{ contrato_id?: number; forma_pago_id?: number; fecha_pago?: string; monto?: number; referencia?: string; notas?: string }>({})

  const [appsOpen, setAppsOpen] = useState(false)
  const [appsPagoId, setAppsPagoId] = useState<number | null>(null)
  const [appsList, setAppsList] = useState<any[]>([])
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyForm, setApplyForm] = useState<{ factura_id?: number; monto_aplicado?: number }>({})
  const [facturasDisponibles, setFacturasDisponibles] = useState<FacturaItem[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const data = await pagosApi.list({ page, limit, contrato_id: contratoId ? Number(contratoId) : undefined, fecha_desde: desde || undefined, fecha_hasta: hasta || undefined })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) { notifyError(e?.response?.data?.error?.message || e.message || 'Error al cargar pagos') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, limit, contratoId, desde, hasta])

  useEffect(() => {
    pagosApi.formas().then(setFormas).catch(() => {})
    contratosApi.list({ page: 1, limit: 100 }).then(d => setContratosOptions(d.items)).catch(() => {})
  }, [])

  const canCreate = createForm.contrato_id && createForm.forma_pago_id && createForm.fecha_pago && (createForm.monto || 0) > 0

  const createPago = async () => {
    if (!canCreate) return
    try {
      setLoading(true)
      await pagosApi.create({
        contrato_id: Number(createForm.contrato_id),
        forma_pago_id: Number(createForm.forma_pago_id),
        fecha_pago: String(createForm.fecha_pago),
        monto: Number(createForm.monto),
        referencia: createForm.referencia || undefined,
        notas: createForm.notas || undefined,
      })
      notifySuccess('Pago registrado')
      setCreateOpen(false)
      setCreateForm({})
      await load()
    } catch (e: any) { notifyError(e?.response?.data?.error?.message || e.message || 'No se pudo registrar pago') } finally { setLoading(false) }
  }

  const openAplicaciones = async (pago: PagoItem) => {
    setAppsPagoId(pago.id)
    setAppsOpen(true)
    try {
      const apps = await pagosApi.aplicaciones(pago.id)
      setAppsList(apps)
      // traer facturas abiertas/parciales del contrato
      const fact = await facturasApi.list({ contrato_id: pago.contrato_id, estado: 'ABIERTA', page: 1, limit: 100 })
      const factParcial = await facturasApi.list({ contrato_id: pago.contrato_id, estado: 'PARCIAL', page: 1, limit: 100 })
      setFacturasDisponibles([...(fact.items || []), ...(factParcial.items || [])])
    } catch (e) { /* noop */ }
  }

  const aplicar = async () => {
    if (!appsPagoId || !applyForm.factura_id || !(applyForm.monto_aplicado && applyForm.monto_aplicado > 0)) return
    try {
      setLoading(true)
      await pagosApi.aplicar(appsPagoId, { factura_id: Number(applyForm.factura_id), monto_aplicado: Number(applyForm.monto_aplicado) })
      notifySuccess('Pago aplicado')
      setApplyOpen(false)
      // recargar
      const apps = await pagosApi.aplicaciones(appsPagoId)
      setAppsList(apps)
      await load()
    } catch (e: any) { notifyError(e?.response?.data?.error?.message || e.message || 'No se pudo aplicar') } finally { setLoading(false) }
  }

  const revertir = async (apl: any) => {
    if (!appsPagoId) return
    if (!confirm('¿Revertir aplicación?')) return
    try {
      await pagosApi.revertir(appsPagoId, apl.id)
      notifySuccess('Aplicación revertida')
      const apps = await pagosApi.aplicaciones(appsPagoId)
      setAppsList(apps)
      await load()
    } catch (e: any) { notifyError(e?.response?.data?.error?.message || e.message || 'No se pudo revertir') }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pagos</h1>
          <p className="text-gray-600 dark:text-gray-300">Registro y aplicaciones de pagos</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={() => setCreateOpen(true)}>Nuevo pago</button>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded border">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Contrato</label>
            <select className="input" value={contratoId} onChange={e => setContratoId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todos</option>
              {contratosOptions.map((c: any) => (
                <option key={c.id} value={c.id}>{c.id} - {c.inquilino_nombre || ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fecha desde</label>
            <input className="input" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="label">Fecha hasta</label>
            <input className="input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Contrato</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">No aplicado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-sm">{p.id}</td>
                  <td className="px-4 py-2 text-sm">{p.contrato_id}</td>
                  <td className="px-4 py-2 text-sm">{p.fecha_pago}</td>
                  <td className="px-4 py-2 text-sm text-right">{Number(p.monto).toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right">{Number(p.saldo_no_aplicado).toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right">
                    <div className="inline-flex gap-2">
                      <button className="btn-secondary" onClick={() => openAplicaciones(p)}>Aplicaciones</button>
                    </div>
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

      {/* Modal: crear pago */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Registrar pago</h2>
              <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cerrar</button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Contrato</label>
                <select className="input" value={createForm.contrato_id || ''} onChange={e => setCreateForm(f => ({ ...f, contrato_id: Number(e.target.value) }))}>
                  <option value="">Seleccione</option>
                  {contratosOptions.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.id} - {c.inquilino_nombre || ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Forma de pago</label>
                <select className="input" value={createForm.forma_pago_id || ''} onChange={e => setCreateForm(f => ({ ...f, forma_pago_id: Number(e.target.value) }))}>
                  <option value="">Seleccione</option>
                  {formas.map(fp => (
                    <option key={fp.id} value={fp.id}>{fp.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Fecha</label>
                <input className="input" type="date" value={createForm.fecha_pago || ''} onChange={e => setCreateForm(f => ({ ...f, fecha_pago: e.target.value }))} />
              </div>
              <div>
                <label className="label">Monto</label>
                <input className="input" type="number" min={0} step={0.01} value={(createForm.monto as any) || ''} onChange={e => setCreateForm(f => ({ ...f, monto: Number(e.target.value) }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Referencia</label>
                <input className="input" value={createForm.referencia || ''} onChange={e => setCreateForm(f => ({ ...f, referencia: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Notas</label>
                <input className="input" value={createForm.notas || ''} onChange={e => setCreateForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancelar</button>
                <button className="btn-primary" disabled={!canCreate || loading} onClick={createPago}>{loading ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: aplicaciones de pago */}
      {appsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAppsOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Aplicaciones del pago #{appsPagoId}</h2>
              <div className="flex gap-2">
                <button className="btn-primary" onClick={() => setApplyOpen(true)}>Aplicar a factura</button>
                <button className="btn-secondary" onClick={() => setAppsOpen(false)}>Cerrar</button>
              </div>
            </div>
            <div className="p-4">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Factura</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto aplicado</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado factura</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {appsList.map((a: any) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2 text-sm">{a.factura_id}</td>
                      <td className="px-4 py-2 text-sm text-right">{Number(a.monto_aplicado).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">{a.factura_estado}</td>
                      <td className="px-4 py-2 text-sm text-right">
                        <button className="btn-secondary" onClick={() => revertir(a)}>Revertir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: aplicar a factura */}
      {applyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setApplyOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Aplicar pago</h2>
              <button className="btn-secondary" onClick={() => setApplyOpen(false)}>Cerrar</button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Factura</label>
                <select className="input" value={applyForm.factura_id || ''} onChange={e => setApplyForm(f => ({ ...f, factura_id: Number(e.target.value) }))}>
                  <option value="">Seleccione</option>
                  {facturasDisponibles.map((f: FacturaItem) => (
                    <option key={f.id} value={f.id}>{f.id} - {f.detalle} (Saldo {f.saldo_pendiente.toFixed(2)})</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Monto a aplicar</label>
                <input className="input" type="number" min={0} step={0.01} value={(applyForm.monto_aplicado as any) || ''} onChange={e => setApplyForm(f => ({ ...f, monto_aplicado: Number(e.target.value) }))} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setApplyOpen(false)}>Cancelar</button>
                <button className="btn-primary" disabled={loading} onClick={aplicar}>{loading ? 'Aplicando…' : 'Aplicar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

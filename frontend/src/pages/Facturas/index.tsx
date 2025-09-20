import { useEffect, useState } from 'react'
import { facturasApi, facturacionApi, FacturaItem, FacturaEstado, contratosApi } from '../../api/endpoints'
import { notifyError, notifySuccess } from '../../lib/notifications'

export default function Facturas() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<FacturaItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [estado, setEstado] = useState<FacturaEstado | ''>('')
  const [contratoId, setContratoId] = useState<number | ''>('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [genOpen, setGenOpen] = useState(false)
  const [genForm, setGenForm] = useState({ anio: new Date().getFullYear(), mes: new Date().getMonth() + 1, fecha_emision: '', fecha_vencimiento: '' })
  const [contratosOptions, setContratosOptions] = useState<{ id: number; inquilino_nombre?: string; propiedad_direccion?: string }[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const data = await facturasApi.list({ page, limit, estado: (estado as any) || undefined, contrato_id: contratoId ? Number(contratoId) : undefined, fecha_desde: desde || undefined, fecha_hasta: hasta || undefined })
      setItems(data.items)
      setTotal(data.total)
    } catch (e: any) {
      notifyError(e?.response?.data?.error?.message || e.message || 'Error al cargar facturas')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
  }, [page, limit, estado, contratoId, desde, hasta])

  useEffect(() => {
    // opciones básicas de contratos (primeras 100)
    contratosApi.list({ page: 1, limit: 100 }).then(d => setContratosOptions(d.items)).catch(() => {})
  }, [])

  const generar = async () => {
    if (!genForm.fecha_emision || !genForm.fecha_vencimiento) {
      notifyError('Ingresa fechas de emisión y vencimiento')
      return
    }
    try {
      setLoading(true)
      const data = await facturacionApi.generar({
        anio: Number(genForm.anio),
        mes: Number(genForm.mes),
        fecha_emision: genForm.fecha_emision,
        fecha_vencimiento: genForm.fecha_vencimiento,
      })
      notifySuccess(`Facturas generadas: ${data.generadas}`)
      setGenOpen(false)
      await load()
    } catch (e: any) { notifyError(e?.response?.data?.error?.message || e.message || 'No se pudo generar') } finally { setLoading(false) }
  }

  const anular = async (f: FacturaItem) => {
    if (!confirm(`¿Anular factura ${f.id}?`)) return
    try {
      await facturasApi.anular(f.id)
      notifySuccess('Factura anulada')
      await load()
    } catch (e: any) { notifyError(e?.response?.data?.error?.message || e.message || 'No se pudo anular') }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Facturas</h1>
          <p className="text-gray-600 dark:text-gray-300">Cuentas por cobrar por contrato</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={() => setGenOpen(true)}>Generar mensual</button>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded border">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Estado</label>
            <select className="input" value={estado} onChange={e => setEstado(e.target.value as any)}>
              <option value="">Todos</option>
              <option value="ABIERTA">ABIERTA</option>
              <option value="PARCIAL">PARCIAL</option>
              <option value="PAGADA">PAGADA</option>
              <option value="VENCIDA">VENCIDA</option>
              <option value="ANULADA">ANULADA</option>
            </select>
          </div>
          <div>
            <label className="label">Contrato</label>
            <select className="input" value={contratoId} onChange={e => setContratoId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todos</option>
              {contratosOptions.map(c => (
                <option key={c.id} value={c.id}>{c.id} - {c.inquilino_nombre || ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Vence desde</label>
            <input className="input" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="label">Vence hasta</label>
            <input className="input" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Contrato</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Periodo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Detalle</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Saldo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vence</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map(f => (
                <tr key={f.id}>
                  <td className="px-4 py-2 text-sm">{f.contrato_id}</td>
                  <td className="px-4 py-2 text-sm">{String(f.mes_periodo).padStart(2,'0')}/{f.anio_periodo}</td>
                  <td className="px-4 py-2 text-sm">{f.detalle}</td>
                  <td className="px-4 py-2 text-sm text-right">{f.monto_total.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right">{f.saldo_pendiente.toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm">{f.fecha_vencimiento}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${f.estado === 'ANULADA' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' : f.estado === 'PAGADA' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'}`}>{f.estado}</span>
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    {(f.estado !== 'ANULADA' && f.estado !== 'PAGADA') && (
                      <button className="btn-secondary" onClick={() => anular(f)}>Anular</button>
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

      {genOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setGenOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl mx-4 border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Generar facturas mensuales</h2>
              <button className="btn-secondary" onClick={() => setGenOpen(false)}>Cerrar</button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Año</label>
                <input className="input" type="number" value={genForm.anio} onChange={e => setGenForm(f => ({ ...f, anio: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Mes</label>
                <input className="input" type="number" min={1} max={12} value={genForm.mes} onChange={e => setGenForm(f => ({ ...f, mes: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Fecha emisión</label>
                <input className="input" type="date" value={genForm.fecha_emision} onChange={e => setGenForm(f => ({ ...f, fecha_emision: e.target.value }))} />
              </div>
              <div>
                <label className="label">Fecha vencimiento</label>
                <input className="input" type="date" value={genForm.fecha_vencimiento} onChange={e => setGenForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2">
                <button className="btn-secondary" onClick={() => setGenOpen(false)}>Cancelar</button>
                <button className="btn-primary" disabled={loading} onClick={generar}>{loading ? 'Procesando…' : 'Generar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

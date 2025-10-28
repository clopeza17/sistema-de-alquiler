import { useEffect, useMemo, useState } from 'react'
import {
  reportesApi,
  gastosApi,
  mantenimientoApi,
  GastoItem,
  MantenimientoItem,
} from '../../api/endpoints'
import { notifyApiError } from '../../lib/notifications'
import { useAuthStore } from '../../state/authStore'
import { formatCurrencyGTQ, formatDateGT, formatDateTimeGT, formatNumberGT } from '../../utils/format'

interface KpiData {
  total_propiedades: number
  ocupadas: number
  contratos_activos: number
  facturas_vencidas: number
  ocupacion_pct: number
}

interface CxcRow {
  contrato_id: number
  propiedad_codigo: string
  inquilino: string
  saldo_pendiente: number
  total_facturado: number
  total_pagado: number
}

const CARD_CLASS = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm'
const TITLE_CLASS = 'text-sm font-semibold text-gray-500 uppercase tracking-wide dark:text-gray-400'
const VALUE_CLASS = 'text-2xl font-bold text-gray-900 dark:text-gray-100'

export default function Dashboard() {
  const { user } = useAuthStore()

  const [kpis, setKpis] = useState<KpiData | null>(null)
  const [kpiLoading, setKpiLoading] = useState(false)

  const [cxc, setCxc] = useState<CxcRow[]>([])
  const [cxcLoading, setCxcLoading] = useState(false)

  const [ultimosGastos, setUltimosGastos] = useState<GastoItem[]>([])
  const [gastosLoading, setGastosLoading] = useState(false)

  const [tickets, setTickets] = useState<MantenimientoItem[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)

  useEffect(() => {
    const loadKpis = async () => {
      setKpiLoading(true)
      try {
        const data = await reportesApi.kpis()
        setKpis(data)
      } catch (error) {
        notifyApiError(error, 'No se pudieron cargar los indicadores')
      } finally {
        setKpiLoading(false)
      }
    }

    const loadCxc = async () => {
      setCxcLoading(true)
      try {
        const data = await reportesApi.cxc()
        setCxc((data || []).slice(0, 5))
      } catch (error) {
        notifyApiError(error, 'No se pudo cargar el resumen de cuentas por cobrar')
      } finally {
        setCxcLoading(false)
      }
    }

    const loadGastos = async () => {
      setGastosLoading(true)
      try {
        const data = await gastosApi.list({ page: 1, limit: 5 })
        setUltimosGastos(data.items || [])
      } catch (error) {
        notifyApiError(error, 'No se pudieron cargar los gastos recientes')
      } finally {
        setGastosLoading(false)
      }
    }

    const loadTickets = async () => {
      setTicketsLoading(true)
      try {
        const data = await mantenimientoApi.list({ page: 1, limit: 5, estado: 'ABIERTA' })
        setTickets(data.items || [])
      } catch (error) {
        notifyApiError(error, 'No se pudieron cargar los tickets de mantenimiento')
      } finally {
        setTicketsLoading(false)
      }
    }

    loadKpis()
    loadCxc()
    loadGastos()
    loadTickets()
  }, [])

  const kpiCards = useMemo(() => {
    if (!kpis) {
      return [
        { title: 'Propiedades totales', value: kpiLoading ? '…' : '0' },
        { title: 'Propiedades ocupadas', value: kpiLoading ? '…' : '0' },
        { title: 'Contratos activos', value: kpiLoading ? '…' : '0' },
        { title: 'Facturas vencidas', value: kpiLoading ? '…' : '0' },
      ]
    }

    return [
      { title: 'Propiedades totales', value: formatNumberGT(kpis.total_propiedades) },
      { title: 'Propiedades ocupadas', value: `${formatNumberGT(kpis.ocupadas)} (${kpis.ocupacion_pct}% ocupación)` },
      { title: 'Contratos activos', value: formatNumberGT(kpis.contratos_activos) },
      { title: 'Facturas vencidas', value: formatNumberGT(kpis.facturas_vencidas) },
    ]
  }, [kpis, kpiLoading])

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Resumen general del sistema.
          {user?.nombre || user?.correo ? (
            <>
              {' '}
              Sesión activa: <span className="font-semibold">{user?.nombre || user?.correo}</span>
            </>
          ) : null}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map(card => (
          <div key={card.title} className={CARD_CLASS}>
            <p className={TITLE_CLASS}>{card.title}</p>
            <p className={`${VALUE_CLASS} mt-2`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Resumen CxC */}
        <section className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top contratos con saldo pendiente</h2>
            {cxcLoading && <span className="text-xs text-gray-500 dark:text-gray-400">Actualizando…</span>}
          </div>
          <div className={`${CARD_CLASS} overflow-x-auto`}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">Contrato</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">Propiedad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">Inquilino</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wide">Saldo pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {cxc.map(row => (
                  <tr key={row.contrato_id}>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">#{row.contrato_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{row.propiedad_codigo}</td>
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200">{row.inquilino}</td>
                    <td className="px-4 py-2 text-sm text-right text-red-600 dark:text-red-300">{formatCurrencyGTQ(Number(row.saldo_pendiente || 0))}</td>
                  </tr>
                ))}
                {!cxc.length && !cxcLoading && (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400" colSpan={4}>
                      No hay saldos pendientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-4">
          {/* Mantenimiento */}
          <section className={`${CARD_CLASS} space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Tickets abiertos</h3>
              {ticketsLoading && <span className="text-xs text-gray-500 dark:text-gray-400">Cargando…</span>}
            </div>
            <ul className="space-y-3">
              {tickets.map(ticket => (
                <li key={ticket.id} className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">#{ticket.id} · {ticket.asunto}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ticket.estado === 'ABIERTA' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200'}`}>
                      {ticket.estado}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                    {ticket.descripcion || 'Sin descripción'}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div>Propiedad: {ticket.propiedad_codigo || ticket.propiedad_id}</div>
                    <div>Prioridad: {ticket.prioridad}</div>
                    <div>Apertura: {formatDateTimeGT(ticket.abierta_el)}</div>
                    <div>Reportado por: {ticket.reportado_por || 'N/D'}</div>
                  </div>
                </li>
              ))}
              {!tickets.length && !ticketsLoading && (
                <li className="text-sm text-gray-500 dark:text-gray-400">No hay tickets abiertos.</li>
              )}
            </ul>
          </section>

          {/* Gastos */}
          <section className={`${CARD_CLASS} space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Últimos gastos</h3>
              {gastosLoading && <span className="text-xs text-gray-500 dark:text-gray-400">Cargando…</span>}
            </div>
            <ul className="space-y-3">
              {ultimosGastos.map(gasto => (
                <li key={gasto.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{gasto.tipo_gasto_nombre || 'Gasto'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{gasto.propiedad_codigo || `Propiedad ${gasto.propiedad_id}`}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateGT(gasto.fecha_gasto)}</p>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrencyGTQ(Number(gasto.monto))}</div>
                </li>
              ))}
              {!ultimosGastos.length && !gastosLoading && (
                <li className="text-sm text-gray-500 dark:text-gray-400">Aún no hay gastos registrados.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

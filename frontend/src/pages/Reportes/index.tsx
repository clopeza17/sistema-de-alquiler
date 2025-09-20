import { useEffect, useState } from 'react'
import { reportesApi } from '../../api/endpoints'

export default function Reportes() {
  const [kpis, setKpis] = useState<any>({})
  const [cxc, setCxc] = useState<any[]>([])

  useEffect(() => {
    reportesApi.kpis().then(setKpis).catch(() => {})
    reportesApi.cxc().then(setCxc).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reportes</h1>
        <p className="text-gray-600 dark:text-gray-300">Indicadores y resúmenes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Propiedades" value={kpis.total_propiedades} />
        <Kpi title="Ocupadas" value={kpis.ocupadas} />
        <Kpi title="Contratos activos" value={kpis.contratos_activos} />
        <Kpi title="Facturas vencidas" value={kpis.facturas_vencidas} />
      </div>

      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded border">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Resumen CxC</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Contrato</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Propiedad</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Inquilino</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total facturado</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total pagado</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Saldo pendiente</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {cxc.map((r: any, idx: number) => (
                <tr key={idx}>
                  <td className="px-4 py-2 text-sm">{r.contrato_id}</td>
                  <td className="px-4 py-2 text-sm">{r.propiedad_codigo}</td>
                  <td className="px-4 py-2 text-sm">{r.inquilino}</td>
                  <td className="px-4 py-2 text-sm text-right">{Number(r.total_facturado || 0).toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right">{Number(r.total_pagado || 0).toFixed(2)}</td>
                  <td className="px-4 py-2 text-sm text-right">{Number(r.saldo_pendiente || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Kpi({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded border p-4">
      <div className="text-gray-600 dark:text-gray-300 text-sm">{title}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value ?? '-'}</div>
    </div>
  )
}

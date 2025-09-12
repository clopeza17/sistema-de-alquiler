import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

interface PropiedadItem {
  id: number
  codigo: string
  tipo: 'APARTAMENTO' | 'CASA' | 'ESTUDIO' | 'OTRO'
  titulo: string
  direccion: string
  renta_mensual: number
  estado?: string
}

export default function Propiedades() {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<PropiedadItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({ codigo: '', tipo: 'APARTAMENTO', titulo: '', direccion: '', renta_mensual: '' as unknown as number })

  const canSubmit = useMemo(() => form.codigo && form.titulo && form.direccion && Number(form.renta_mensual) > 0, [form])

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/v1/propiedades?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`)
      if (r.status === 404) {
        setItems([]); setTotal(0)
        return
      }
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error?.message || 'Error')
      setItems(data?.data?.items || [])
      setTotal(data?.data?.total || 0)
    } catch (e: any) { toast.error(e.message || 'Error al cargar propiedades') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, limit, search])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    try {
      const r = await fetch('/api/v1/propiedades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!r.ok) {
        const data = await r.json(); throw new Error(data?.error?.message || 'Error')
      }
      toast.success('Propiedad creada')
      setForm({ codigo: '', tipo: 'APARTAMENTO', titulo: '', direccion: '', renta_mensual: '' as any })
      await load()
    } catch (e: any) { toast.error(e.message || 'No se pudo crear') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Propiedades</h1>
        <p className="text-gray-600 dark:text-gray-300">Listado y alta básica (API en progreso).</p>
      </div>

      <form onSubmit={create} className="bg-white dark:bg-gray-800 dark:border-gray-700 p-4 rounded border space-y-4">
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
        <div>
          <button className="btn-primary" type="submit" disabled={!canSubmit || loading}>{loading ? 'Guardando...' : 'Crear propiedad'}</button>
        </div>
      </form>

      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded border">
        <div className="p-4 flex gap-3 items-end">
          <div>
            <label className="label">Buscar</label>
            <input className="input" placeholder="Código, título o dirección" value={search} onChange={e => setSearch(e.target.value)} />
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
            <button className="btn-secondary" onClick={() => { setPage(1); load() }} type="button">Aplicar</button>
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
                  <td className="px-4 py-2 text-right">
                    <button className="btn-secondary">⋮</button>
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
    </div>
  )
}

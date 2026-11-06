// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { contratosApi, facturacionApi, facturasApi, inquilinosApi, pagosApi, propiedadesApi } from '../api/endpoints'
import { notifyError, notifySuccess } from '../lib/notifications'
import Contratos from './Contratos'
import Facturas from './Facturas'
import Pagos from './Pagos'

vi.mock('../api/endpoints', () => ({
  contratosApi: { list: vi.fn(), create: vi.fn() },
  propiedadesApi: { list: vi.fn() },
  inquilinosApi: { list: vi.fn() },
  facturasApi: { list: vi.fn(), anular: vi.fn() },
  facturacionApi: { generar: vi.fn() },
  pagosApi: { list: vi.fn(), formas: vi.fn(), create: vi.fn() },
}))
vi.mock('../lib/notifications', () => ({
  notifyError: vi.fn(), notifySuccess: vi.fn(), notifyWarning: vi.fn(),
}))

const empty = { items: [], total: 0, page: 1, limit: 10 }
const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name })
const click = (name: string) => fireEvent.click(button(name))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(contratosApi.list).mockResolvedValue(empty)
  vi.mocked(propiedadesApi.list).mockResolvedValue(empty)
  vi.mocked(inquilinosApi.list).mockResolvedValue(empty)
  vi.mocked(facturasApi.list).mockResolvedValue(empty)
  vi.mocked(pagosApi.list).mockResolvedValue(empty)
  vi.mocked(pagosApi.formas).mockResolvedValue([])
})

afterEach(cleanup)

describe('Pantalla de contratos', () => {
  it('bloquea la creación con el formulario vacío', async () => {
    render(<Contratos />)
    click('Nuevo contrato')
    await waitFor(() => expect(contratosApi.list).toHaveBeenCalledTimes(1))
    expect(button('Crear').disabled).toBe(true)
    expect(contratosApi.create).not.toHaveBeenCalled()
  })

  it('cierra el formulario al cancelar sin enviar datos', async () => {
    render(<Contratos />)
    click('Nuevo contrato')
    expect(screen.getByRole('heading', { name: 'Nuevo contrato' })).toBeTruthy()
    click('Cancelar')
    expect(screen.queryByRole('heading', { name: 'Nuevo contrato' })).toBeNull()
    expect(contratosApi.create).not.toHaveBeenCalled()
    await waitFor(() => expect(contratosApi.list).toHaveBeenCalled())
  })

  it('muestra el mensaje de error entregado por el servidor', async () => {
    vi.mocked(contratosApi.list).mockRejectedValue({ response: { data: { error: { message: 'Servicio no disponible' } } } })
    render(<Contratos />)
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Servicio no disponible'))
  })
})

describe('Pantalla de facturación', () => {
  async function openGenerator() {
    render(<Facturas />)
    await waitFor(() => expect(facturasApi.list).toHaveBeenCalledTimes(1))
    click('Generar mensual')
    return screen.getByRole('heading', { name: 'Generar facturas mensuales' }).closest('.shadow-xl') as HTMLElement
  }

  it('solicita fechas obligatorias sin llamar al servicio', async () => {
    await openGenerator()
    click('Generar')
    expect(notifyError).toHaveBeenCalledWith('Ingresa fechas de emisión y vencimiento')
    expect(facturacionApi.generar).not.toHaveBeenCalled()
  })

  it('envía el período elegido y vuelve a consultar tras generar', async () => {
    vi.mocked(facturacionApi.generar).mockResolvedValue({ generadas: 4 })
    const dialog = await openGenerator()
    const [year, month] = within(dialog).getAllByRole('spinbutton')
    const [issued, due] = dialog.querySelectorAll('input[type=date]')
    fireEvent.change(year, { target: { value: '2026' } })
    fireEvent.change(month, { target: { value: '11' } })
    fireEvent.change(issued, { target: { value: '2026-11-01' } })
    fireEvent.change(due, { target: { value: '2026-11-08' } })
    click('Generar')
    expect(facturacionApi.generar).toHaveBeenCalledWith({
      anio: 2026, mes: 11, fecha_emision: '2026-11-01', fecha_vencimiento: '2026-11-08',
    })
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Facturas generadas: 4'))
    expect(facturasApi.list).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('heading', { name: 'Generar facturas mensuales' })).toBeNull()
  })

  it('consulta nuevamente al seleccionar el estado de facturas', async () => {
    render(<Facturas />)
    fireEvent.change(screen.getByRole('option', { name: 'PARCIAL' }).closest('select')!, {
      target: { value: 'PARCIAL' },
    })
    await waitFor(() => expect(facturasApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'PARCIAL' })))
  })
})

describe('Pantalla de pagos', () => {
  it('impide guardar un pago incompleto', async () => {
    render(<Pagos />)
    click('Nuevo pago')
    await waitFor(() => expect(pagosApi.formas).toHaveBeenCalled())
    expect(button('Guardar').disabled).toBe(true)
    expect(pagosApi.create).not.toHaveBeenCalled()
  })

  it('formatea a dos decimales el monto y el saldo no aplicado', async () => {
    vi.mocked(pagosApi.list).mockResolvedValue({
      ...empty, total: 1, items: [{
        id: 7, contrato_id: 11, forma_pago_id: 2, fecha_pago: '2026-11-04', monto: 200, saldo_no_aplicado: 25.5,
      }],
    })
    render(<Pagos />)
    expect(await screen.findByRole('cell', { name: '200.00' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: '25.50' })).toBeTruthy()
    expect(screen.getByText('Total: 1')).toBeTruthy()
  })

  it('propaga a la lista la fecha inicial del filtro', async () => {
    const { container } = render(<Pagos />)
    fireEvent.change(container.querySelector('input[type=date]')!, { target: { value: '2026-11-01' } })
    await waitFor(() => expect(pagosApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ fecha_desde: '2026-11-01' })))
  })
})

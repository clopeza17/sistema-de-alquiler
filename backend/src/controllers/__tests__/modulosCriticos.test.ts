import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createContrato, finalizarContrato, getContratoById, getContratos, renovarContrato, updateContrato } from '../contratosController.js';
import { anularFactura, catalogoEstadosFacturas, generarFacturasMensuales, listarFacturas, obtenerFactura } from '../facturacionController.js';
import { aplicarPago, revertirAplicacion } from '../aplicacionesPagoController.js';
import { actualizarPago, eliminarPago, obtenerPago } from '../pagosController.js';

const { connection, pool, audit } = vi.hoisted(() => ({
  connection: {
    execute: vi.fn(),
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  },
  pool: { execute: vi.fn(), getConnection: vi.fn() },
  audit: vi.fn(),
}));

vi.mock('../../config/db.js', () => ({ pool }));
vi.mock('../../middlewares/audit.js', () => ({ auditAction: audit }));

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

async function invoke(handler: Handler, input: Partial<Request> = {}) {
  const req = { body: {}, query: {}, params: { id: '7' }, user: { userId: 42 }, ...input } as Request;
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const next = vi.fn();
  await handler(req, { json, status } as unknown as Response, next);
  return { json, status, next };
}

beforeEach(() => {
  vi.resetAllMocks();
  pool.getConnection.mockResolvedValue(connection);
});

describe('Contratos', () => {
  const body = {
    propiedad_id: 2,
    inquilino_id: 3,
    monto_mensual: 1200,
    fecha_inicio: '2026-11-01',
    fecha_fin: '2027-10-31',
  };
  const available = [{ id: 2, estado: 'DISPONIBLE' }];
  const tenant = [{ id: 3, activo: 1 }];
  const active = { id: 7, estado: 'ACTIVO', propiedad_id: 2, ...body };

  it.each([
    ['propiedad ausente', [[]], 404],
    ['propiedad ocupada', [[{ id: 2, estado: 'OCUPADA' }]], 409],
    ['inquilino ausente', [available, []], 404],
    ['inquilino inactivo', [available, [{ id: 3, activo: 0 }]], 409],
    ['contrato previo activo', [available, tenant, [{ id: 6 }]], 409],
  ] as const)('rechaza creación con %s y revierte la transacción', async (_case, rows, statusCode) => {
    for (const result of rows) connection.execute.mockResolvedValueOnce([result]);
    const { next, status } = await invoke(createContrato, { body });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode }));
    expect(status).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('rechaza fechas iguales antes de consultar propiedades', async () => {
    const { next } = await invoke(createContrato, { body: { ...body, fecha_fin: body.fecha_inicio } });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(connection.execute).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledOnce();
  });

  it('confirma la creación y la ocupación de la propiedad', async () => {
    for (const rows of [available, tenant, [], { insertId: 7 }]) {
      connection.execute.mockResolvedValueOnce([rows]);
    }
    const { status, json, next } = await invoke(createContrato, { body });
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ data: { id: 7 } }));
    expect(connection.execute).toHaveBeenCalledWith(expect.stringContaining('OCUPADA'), [2]);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('revierte el alta si falla el cambio de estado de la propiedad', async () => {
    for (const rows of [available, tenant, [], { insertId: 7 }]) {
      connection.execute.mockResolvedValueOnce([rows]);
    }
    const failure = new Error('Error al actualizar la propiedad');
    connection.execute.mockRejectedValueOnce(failure);
    const { next, json } = await invoke(createContrato, { body });
    expect(next).toHaveBeenCalledWith(failure);
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it('devuelve paginación y traduce el filtro histórico RESCINDIDO', async () => {
    pool.execute.mockResolvedValueOnce([[{ total: 6 }]]).mockResolvedValueOnce([[{ id: 7 }]]);
    const { json } = await invoke(getContratos, {
      query: { page: '2', limit: '5', estado: 'RESCINDIDO', propiedad_id: '2', inquilino_id: '3' },
    });
    expect(pool.execute).toHaveBeenLastCalledWith(expect.stringContaining('LIMIT 5 OFFSET 5'), ['CANCELADO', '2', '3']);
    expect(json).toHaveBeenCalledWith({
      data: [{ id: 7 }],
      pagination: { page: 2, limit: 5, total: 6, totalPages: 2, hasNext: false, hasPrev: true },
    });
  });

  it('devuelve 404 al consultar un contrato inexistente', async () => {
    pool.execute.mockResolvedValueOnce([[]]);
    const { next } = await invoke(getContratoById);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('modifica renta y depósito cero sin cambiar la vigencia', async () => {
    connection.execute.mockResolvedValueOnce([[active]]);
    const { json } = await invoke(updateContrato, { body: { monto_mensual: 1400, deposito: 0 } });
    expect(connection.execute).toHaveBeenLastCalledWith(expect.stringContaining('renta_mensual = ?, deposito = ?'), [1400, 0, 7]);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(json).toHaveBeenCalledWith({ message: 'Contrato actualizado exitosamente' });
  });

  it('rechaza la edición de un contrato finalizado', async () => {
    connection.execute.mockResolvedValueOnce([[{ ...active, estado: 'FINALIZADO' }]]);
    const { next } = await invoke(updateContrato, { body: { monto_mensual: 1400 } });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(connection.rollback).toHaveBeenCalledOnce();
  });

  it('finaliza un contrato y libera su propiedad', async () => {
    connection.execute.mockResolvedValueOnce([[active]]);
    const { json } = await invoke(finalizarContrato, { body: { fecha_finalizacion: '2027-01-01' } });
    expect(connection.execute).toHaveBeenLastCalledWith(expect.stringContaining('DISPONIBLE'), [2]);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(json).toHaveBeenCalledWith({ message: 'Contrato finalizado exitosamente' });
  });

  it('rechaza finalizar con fecha anterior al inicio', async () => {
    connection.execute.mockResolvedValueOnce([[active]]);
    const { next } = await invoke(finalizarContrato, { body: { fecha_finalizacion: '2026-10-31' } });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('renueva la fecha y la renta solicitadas', async () => {
    connection.execute.mockResolvedValueOnce([[active]]);
    const { json } = await invoke(renovarContrato, { body: { nueva_fecha_fin: '2028-10-31', nuevo_monto: 1350 } });
    expect(connection.execute).toHaveBeenLastCalledWith(expect.stringContaining('renta_mensual = ?'), ['2028-10-31', 1350, 7]);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(json).toHaveBeenCalledWith({ message: 'Contrato renovado exitosamente' });
  });

  it('rechaza renovación que deja la fecha sin extender', async () => {
    connection.execute.mockResolvedValueOnce([[active]]);
    const { next } = await invoke(renovarContrato, { body: { nueva_fecha_fin: active.fecha_fin } });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(connection.rollback).toHaveBeenCalledOnce();
  });
});

describe('Facturación', () => {
  it('mide generación repetida sin nuevas facturas', async () => {
    connection.execute
      .mockResolvedValueOnce([[{ total: 2 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ total: 2 }]]);
    const { json, status } = await invoke(generarFacturasMensuales, {
      body: { anio: 2026, mes: 11, fecha_emision: '2026-11-01', fecha_vencimiento: '2026-11-08' },
    });
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ data: { anio: 2026, mes: 11, generadas: 0 } }));
  });

  it('propaga un fallo del procedimiento y libera la conexión', async () => {
    const failure = new Error('Fallo del procedimiento');
    connection.execute.mockResolvedValueOnce([[{ total: 2 }]]).mockRejectedValueOnce(failure);
    const { next, json } = await invoke(generarFacturasMensuales, {
      body: { anio: 2026, mes: 11, fecha_emision: '2026-11-01', fecha_vencimiento: '2026-11-08' },
    });
    expect(next).toHaveBeenCalledWith(failure);
    expect(connection.release).toHaveBeenCalledOnce();
    expect(json).not.toHaveBeenCalled();
  });

  it('conserva filtros y metadatos al listar una página', async () => {
    pool.execute.mockResolvedValueOnce([[{ total: 12 }]]).mockResolvedValueOnce([[{ id: 8 }]]);
    const { json } = await invoke(listarFacturas, {
      query: { page: '2', limit: '10', estado: 'PARCIAL', contrato_id: '7', fecha_desde: '2026-11-01', fecha_hasta: '2026-11-30' },
    });
    expect(pool.execute).toHaveBeenLastCalledWith(expect.stringContaining('LIMIT 10 OFFSET 10'), ['PARCIAL', 7, '2026-11-01', '2026-11-30']);
    expect(json).toHaveBeenCalledWith({ data: [{ id: 8 }], meta: {
      pagination: { page: 2, limit: 10, total: 12, totalPages: 2, hasNext: false, hasPrev: true },
    } });
  });

  it('devuelve la factura vinculada al contrato y a la propiedad', async () => {
    const invoice = { id: 7, contrato_id: 3, propiedad_codigo: 'QA-02' };
    pool.execute.mockResolvedValueOnce([[invoice]]);
    const { json } = await invoke(obtenerFactura);
    expect(json).toHaveBeenCalledWith({ data: invoice });
  });

  it('impide anular una factura pagada', async () => {
    connection.execute.mockResolvedValueOnce([[{ id: 7, estado: 'PAGADA' }]]);
    const { next } = await invoke(anularFactura);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    expect(connection.execute).toHaveBeenCalledTimes(1);
  });

  it('al anular una factura abierta pone el saldo pendiente en cero', async () => {
    connection.execute.mockResolvedValueOnce([[{ id: 7, estado: 'ABIERTA' }]]);
    const { json } = await invoke(anularFactura);
    expect(connection.execute).toHaveBeenLastCalledWith(expect.stringContaining('saldo_pendiente = 0'), [7]);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ data: { id: 7, estado: 'ANULADA' } }));
  });

  it('expone los estados admitidos para el filtro', async () => {
    const { json } = await invoke(catalogoEstadosFacturas);
    expect(json).toHaveBeenCalledWith({ data: ['ABIERTA', 'PARCIAL', 'PAGADA', 'VENCIDA', 'ANULADA'] });
  });
});

describe('Pagos', () => {
  it.each([
    ['saldo del pago insuficiente', 99, 200, 'ABIERTA'],
    ['saldo de la factura insuficiente', 200, 99, 'ABIERTA'],
    ['factura anulada', 200, 200, 'ANULADA'],
  ])('rechaza aplicar un pago por %s', async (_case, balance, pending, state) => {
    connection.execute
      .mockResolvedValueOnce([[{ id: 7, saldo_no_aplicado: balance }]])
      .mockResolvedValueOnce([[{ id: 8, saldo_pendiente: pending, estado: state }]]);
    const { next } = await invoke(aplicarPago, { body: { factura_id: 8, monto_aplicado: 100 } });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    expect(connection.execute).toHaveBeenCalledTimes(2);
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('deja la factura en PARCIAL cuando queda saldo', async () => {
    connection.execute
      .mockResolvedValueOnce([[{ id: 7, saldo_no_aplicado: 130 }]])
      .mockResolvedValueOnce([[{ id: 8, saldo_pendiente: 500, estado: 'ABIERTA' }]]);
    const { status } = await invoke(aplicarPago, { body: { factura_id: 8, monto_aplicado: 100 } });
    expect(connection.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE pagos'), [30, 7]);
    expect(connection.execute).toHaveBeenLastCalledWith(expect.stringContaining('UPDATE facturas'), [400, 'PARCIAL', 8]);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(status).toHaveBeenCalledWith(201);
  });

  it('devuelve ambos saldos al revertir una aplicación', async () => {
    connection.execute
      .mockResolvedValueOnce([[{ factura_id: 8, monto_aplicado: 100 }]])
      .mockResolvedValueOnce([[{ id: 7, saldo_no_aplicado: 30 }]])
      .mockResolvedValueOnce([[{ id: 8, saldo_pendiente: 400, estado: 'PARCIAL' }]]);
    const { json } = await invoke(revertirAplicacion, { params: { id: '7', aplId: '9' } });
    expect(connection.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE pagos'), [130, 7]);
    expect(connection.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE facturas'), [500, 'PARCIAL', 8]);
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(json).toHaveBeenCalledWith({ message: 'Aplicación revertida' });
  });

  it('impide eliminar pagos aplicados', async () => {
    connection.execute.mockResolvedValueOnce([[{ total: 1 }]]);
    const { next } = await invoke(eliminarPago);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    expect(connection.execute).toHaveBeenCalledTimes(1);
  });

  it('actualiza la referencia de un pago sin modificar su monto', async () => {
    connection.execute.mockResolvedValueOnce([[{ id: 7 }]]).mockResolvedValueOnce([[{ total: 1 }]]);
    const { json } = await invoke(actualizarPago, { body: { referencia: 'QA-27' } });
    expect(connection.execute).toHaveBeenLastCalledWith('UPDATE pagos SET referencia = ? WHERE id = ?', ['QA-27', 7]);
    expect(json).toHaveBeenCalledWith({ message: 'Pago actualizado' });
  });

  it('devuelve 404 al consultar un pago inexistente', async () => {
    pool.execute.mockResolvedValueOnce([[]]);
    const { next } = await invoke(obtenerPago);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});

import { describe, expect, beforeEach, it, vi } from 'vitest';

import { crearPago } from '../pagosController.js';
import { aplicarPago } from '../aplicacionesPagoController.js';
import { ConflictError } from '../../common/errors.js';

const auditActionMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../../middlewares/audit.js', () => ({
  auditAction: auditActionMock,
}));

const loggerMock = { info: vi.fn(), error: vi.fn() };
vi.mock('../../config/logger.js', async () => {
  const actual = await vi.importActual<any>('../../config/logger.js');
  return { ...actual, createDbLogger: () => loggerMock };
});

const poolExecuteMock = vi.fn();
const getConnectionMock = vi.fn();
const connectionExecuteMock = vi.fn();
const beginMock = vi.fn();
const commitMock = vi.fn();
const rollbackMock = vi.fn();
const releaseMock = vi.fn();

vi.mock('../../config/db.js', () => ({
  pool: {
    execute: poolExecuteMock,
    getConnection: getConnectionMock,
  },
}));

function resMock() {
  const res: any = {};
  res.status = vi.fn().mockImplementation(function (this: any) { return this; });
  res.json = vi.fn();
  return res;
}

beforeEach(() => {
  auditActionMock.mockClear();
  loggerMock.info.mockClear();
  loggerMock.error.mockClear();
  poolExecuteMock.mockReset();
  getConnectionMock.mockReset();
  connectionExecuteMock.mockReset();
  beginMock.mockReset();
  commitMock.mockReset();
  rollbackMock.mockReset();
  releaseMock.mockReset();
});

describe('Pagos - crearPago', () => {
  it('crea un pago con saldo_no_aplicado = monto', async () => {
    getConnectionMock.mockResolvedValue({
      execute: connectionExecuteMock,
      release: releaseMock,
    });

    // Contrato OK
    connectionExecuteMock
      .mockResolvedValueOnce([[{ id: 1, estado: 'ACTIVO' }]] as any)
      .mockResolvedValueOnce([{ insertId: 5 }] as any);

    const req: any = {
      body: {
        contrato_id: 1,
        forma_pago_id: 1,
        fecha_pago: '2025-09-01',
        monto: 1000,
      },
      user: { userId: 99 },
    };
    const res = resMock();
    const next = vi.fn();

    await crearPago(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ saldo_no_aplicado: 1000 }),
    }));
  });
});

describe('Aplicaciones - aplicarPago', () => {
  it('falla si monto excede saldo_no_aplicado', async () => {
    getConnectionMock.mockResolvedValue({
      execute: connectionExecuteMock,
      beginTransaction: beginMock,
      commit: commitMock,
      rollback: rollbackMock,
      release: releaseMock,
    });

    // Pago (saldo 100), Factura (saldo 200)
    connectionExecuteMock
      .mockResolvedValueOnce([[{ id: 10, saldo_no_aplicado: 100 }]] as any) // pago
      .mockResolvedValueOnce([[{ id: 20, saldo_pendiente: 200, estado: 'ABIERTA' }]] as any); // factura

    const req: any = {
      params: { id: '10' },
      body: { factura_id: 20, monto_aplicado: 150 },
    };
    const res = resMock();
    const next = vi.fn();

    await aplicarPago(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
    expect(rollbackMock).toHaveBeenCalled();
  });
});


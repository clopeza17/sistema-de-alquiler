import { describe, expect, beforeEach, it, vi } from 'vitest';

import {
  generarFacturasMensuales,
  anularFactura,
} from '../facturacionController.js';
import { ConflictError } from '../../common/errors.js';

const auditActionMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../../middlewares/audit.js', () => ({
  auditAction: auditActionMock,
}));

const loggerMock = {
  info: vi.fn(),
  error: vi.fn(),
};

vi.mock('../../config/logger.js', async () => {
  const actual = await vi.importActual<any>('../../config/logger.js');
  return {
    ...actual,
    createDbLogger: () => loggerMock,
  };
});

const poolExecuteMock = vi.fn();
const connectionExecuteMock = vi.fn();
const releaseMock = vi.fn();
const getConnectionMock = vi.fn();

vi.mock('../../config/db.js', () => ({
  pool: {
    execute: poolExecuteMock,
    getConnection: getConnectionMock,
  },
}));

function createMockResponse() {
  const res: any = {};
  res.status = vi.fn().mockImplementation(function (this: any) {
    return this;
  });
  res.json = vi.fn();
  return res;
}

beforeEach(() => {
  auditActionMock.mockClear();
  loggerMock.info.mockClear();
  loggerMock.error.mockClear();
  poolExecuteMock.mockReset();
  connectionExecuteMock.mockReset();
  releaseMock.mockReset();
  getConnectionMock.mockReset();
});

describe('generarFacturasMensuales', () => {
  it('genera facturas y responde con conteo cuando los datos son válidos', async () => {
    connectionExecuteMock
      .mockResolvedValueOnce([[{ total: 1 }]] as any) // Conteo inicial
      .mockResolvedValueOnce([[]] as any) // Llamada al SP
      .mockResolvedValueOnce([[{ total: 3 }]] as any); // Conteo final

    getConnectionMock.mockResolvedValue({
      execute: connectionExecuteMock,
      release: releaseMock,
    });

    const req: any = {
      body: {
        anio: 2025,
        mes: 9,
        fecha_emision: '2025-09-01',
        fecha_vencimiento: '2025-09-10',
      },
      user: {
        userId: 10,
      },
    };

    const res = createMockResponse();
    const next = vi.fn();

    await generarFacturasMensuales(req, res, next);

    expect(connectionExecuteMock.mock.calls[0]).toMatchObject([
      'SELECT COUNT(*) AS total FROM facturas WHERE anio_periodo = ? AND mes_periodo = ?',
      [2025, 9],
    ]);
    expect(connectionExecuteMock.mock.calls[1]).toMatchObject([
      'CALL sp_generar_facturas_mensuales(?, ?, ?, ?, ?)',
      [2025, 9, '2025-09-01', '2025-09-10', 10],
    ]);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Facturas generadas exitosamente',
      data: {
        anio: 2025,
        mes: 9,
        generadas: 2,
      },
    });
    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('propaga error de validación cuando fecha de vencimiento es anterior', async () => {
    getConnectionMock.mockResolvedValue({
      execute: connectionExecuteMock,
      release: releaseMock,
    });

    const req: any = {
      body: {
        anio: 2025,
        mes: 9,
        fecha_emision: '2025-09-10',
        fecha_vencimiento: '2025-09-01',
      },
      user: {
        userId: 10,
      },
    };

    const res = createMockResponse();
    const next = vi.fn();

    await generarFacturasMensuales(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    const error = next.mock.calls[0][0];
    expect(error?.name).toBe('ZodError');
    expect(connectionExecuteMock).not.toHaveBeenCalled();
  });
});

describe('anularFactura', () => {
  it('lanza conflicto cuando la factura ya está anulada', async () => {
    getConnectionMock.mockResolvedValue({
      execute: connectionExecuteMock,
      release: releaseMock,
    });

    connectionExecuteMock.mockResolvedValueOnce([[{ id: 8, estado: 'ANULADA', saldo_pendiente: 0 }]] as any);

    const req: any = {
      params: { id: '8' },
    };

    const res = createMockResponse();
    const next = vi.fn();

    await anularFactura(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
    expect(connectionExecuteMock).toHaveBeenCalledTimes(1);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});

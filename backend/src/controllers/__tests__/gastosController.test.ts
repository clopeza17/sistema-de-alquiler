import { describe, it, expect, beforeEach, vi } from 'vitest';

import { crearGasto } from '../gastosController.js';
import { NotFoundError } from '../../common/errors.js';

const auditActionMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../../middlewares/audit.js', () => ({
  auditAction: auditActionMock,
}));

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../config/logger.js', async () => {
  const actual = await vi.importActual<any>('../../config/logger.js');
  return {
    ...actual,
    createDbLogger: () => loggerMock,
  };
});

const poolExecuteMock = vi.hoisted(() => vi.fn());

vi.mock('../../config/db.js', () => ({
  pool: {
    execute: poolExecuteMock,
  },
}));

function createMockResponse() {
  const res: any = {};
  res.status = vi.fn().mockImplementation(function (this: any) { return this; });
  res.json = vi.fn();
  return res;
}

describe('GastosController', () => {
  beforeEach(() => {
    poolExecuteMock.mockReset();
    auditActionMock.mockReset();
    loggerMock.info.mockClear();
    loggerMock.error.mockClear();
  });

  it('lanza NotFoundError cuando la propiedad no existe al crear gasto', async () => {
    poolExecuteMock.mockResolvedValueOnce([[]] as any); // Propiedad no encontrada

    const req: any = {
      body: {
        propiedad_id: 99,
        tipo_gasto_id: 1,
        fecha_gasto: '2025-01-01',
        monto: 1500,
      },
      user: { userId: 10 },
    };
    const res = createMockResponse();
    const next = vi.fn();

    await crearGasto(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect(poolExecuteMock).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

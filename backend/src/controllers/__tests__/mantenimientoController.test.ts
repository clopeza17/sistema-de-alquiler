import { describe, it, expect, beforeEach, vi } from 'vitest';

import { actualizarSolicitud } from '../mantenimientoController.js';
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

describe('MantenimientoController', () => {
  beforeEach(() => {
    poolExecuteMock.mockReset();
    auditActionMock.mockReset();
    loggerMock.info.mockClear();
    loggerMock.error.mockClear();
  });

  it('lanza NotFoundError cuando no existe la solicitud a actualizar', async () => {
    poolExecuteMock.mockResolvedValueOnce([[]] as any);

    const req: any = {
      params: { id: '123' },
      body: { estado: 'RESUELTA' },
    };
    const res = createMockResponse();
    const next = vi.fn();

    await actualizarSolicitud(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect(poolExecuteMock).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

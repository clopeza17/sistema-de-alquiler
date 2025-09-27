import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { z } from 'zod';

import { pool } from '../config/db.js';
import { createDbLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../common/errors.js';
import {
  idSchema,
  paginationSchema,
  dbDateSchema,
  amountSchema,
} from '../common/validators.js';

const logger = createDbLogger();

// Schemas
const pagoCreateSchema = z.object({
  contrato_id: z.coerce.number().int().positive('Contrato inválido'),
  forma_pago_id: z.coerce.number().int().positive('Forma de pago inválida'),
  fecha_pago: dbDateSchema,
  monto: amountSchema.refine((v) => v > 0, 'Monto debe ser mayor a 0'),
  referencia: z.string().max(80).optional(),
  notas: z.string().max(255).optional(),
});

const pagoUpdateSchema = z.object({
  forma_pago_id: z.coerce.number().int().positive('Forma de pago inválida').optional(),
  fecha_pago: dbDateSchema.optional(),
  referencia: z.string().max(80).optional(),
  notas: z.string().max(255).optional(),
});

interface PagoRow extends RowDataPacket {
  id: number;
  contrato_id: number;
  forma_pago_id: number;
  fecha_pago: string;
  referencia: string | null;
  monto: number;
  saldo_no_aplicado: number;
  notas: string | null;
  creado_por: number;
  creado_el: string;
}

export const crearPago = asyncHandler(async (req: Request, res: Response) => {
  const payload = pagoCreateSchema.parse(req.body);

  if (!req.user?.userId) {
    throw new BadRequestError('Usuario requerido');
  }

  const connection = await pool.getConnection();
  try {
    // Verificar contrato
    const [contratoRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id, estado FROM contratos WHERE id = ?',
      [payload.contrato_id],
    );
    const contrato = (contratoRows as any[])[0];
    if (!contrato) throw new NotFoundError('Contrato no encontrado');
    if (contrato.estado === 'CANCELADO') {
      throw new ConflictError('No se puede registrar pago para un contrato cancelado');
    }

    // Insertar pago con saldo_no_aplicado inicial = monto
    const [result] = await connection.execute(
      `INSERT INTO pagos (contrato_id, forma_pago_id, fecha_pago, referencia, monto, saldo_no_aplicado, notas, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.contrato_id,
        payload.forma_pago_id,
        payload.fecha_pago,
        payload.referencia ?? null,
        payload.monto,
        payload.monto,
        payload.notas ?? null,
        req.user.userId,
      ],
    );

    const id = (result as any).insertId as number;

    await auditAction(req, 'CREATE', 'PAYMENT', id, payload);

    res.status(201).json({
      message: 'Pago registrado exitosamente',
      data: {
        id,
        ...payload,
        saldo_no_aplicado: payload.monto,
      },
    });

    logger.info({ pago_id: id, payload }, 'Pago creado');
  } catch (error) {
    logger.error({ error, payload }, 'Error al crear pago');
    throw error;
  } finally {
    connection.release();
  }
});

export const listarPagos = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const offset = (page - 1) * limit;

  const filters = {
    contrato_id: req.query.contrato_id ? Number(req.query.contrato_id) : undefined,
    fecha_desde: req.query.fecha_desde as string | undefined,
    fecha_hasta: req.query.fecha_hasta as string | undefined,
    forma_pago_id: req.query.forma_pago_id ? Number(req.query.forma_pago_id) : undefined,
  };

  const condiciones: string[] = [];
  const params: Array<string | number> = [];

  if (filters.contrato_id) { condiciones.push('p.contrato_id = ?'); params.push(filters.contrato_id); }
  if (filters.forma_pago_id) { condiciones.push('p.forma_pago_id = ?'); params.push(filters.forma_pago_id); }
  if (filters.fecha_desde) { condiciones.push('p.fecha_pago >= ?'); params.push(filters.fecha_desde); }
  if (filters.fecha_hasta) { condiciones.push('p.fecha_pago <= ?'); params.push(filters.fecha_hasta); }

  const whereClause = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM pagos p ${whereClause}`,
      params,
    );
    const total = Number((countRows as any[])[0]?.total ?? 0);

    const safeLimit = Number.isFinite(limit) ? limit : 10;
    const safeOffset = Number.isFinite(offset) ? offset : 0;

    const [rows] = await pool.execute<PagoRow[]>(
      `SELECT p.* FROM pagos p ${whereClause} ORDER BY p.fecha_pago DESC, p.id DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params,
    );

    const items = (rows as PagoRow[]).map((row) => ({
      ...row,
      monto: Number(row.monto),
      saldo_no_aplicado: Number(row.saldo_no_aplicado),
    }));

    await auditAction(req, 'READ', 'PAYMENT', undefined, { filters, page, limit, total });

    res.json({
      data: items,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error({ error, filters }, 'Error al listar pagos');
    throw error;
  }
});

export const obtenerPago = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);
  const [rows] = await pool.execute<PagoRow[]>(
    'SELECT * FROM pagos WHERE id = ?',
    [id],
  );
  const pago = rows[0];
  if (!pago) throw new NotFoundError('Pago no encontrado');

  await auditAction(req, 'READ', 'PAYMENT', id);
  res.json({ data: pago });
});

export const actualizarPago = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);
  const payload = pagoUpdateSchema.parse(req.body);

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute<PagoRow[]>(
      'SELECT * FROM pagos WHERE id = ?',
      [id],
    );
    const pago = rows[0];
    if (!pago) throw new NotFoundError('Pago no encontrado');

    // No permitir cambios si tiene aplicaciones (excepto notas/referencia/fecha/forma)
    const [appsRows] = await connection.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM aplicaciones_pago WHERE pago_id = ?',
      [id],
    );
    const tieneApps = Number((appsRows as any[])[0]?.total ?? 0) > 0;

    if (tieneApps && ('monto' in payload)) {
      throw new ConflictError('No se puede cambiar el monto de un pago con aplicaciones');
    }

    const fields: string[] = [];
    const params: any[] = [];
    if (payload.forma_pago_id) { fields.push('forma_pago_id = ?'); params.push(payload.forma_pago_id); }
    if (payload.fecha_pago) { fields.push('fecha_pago = ?'); params.push(payload.fecha_pago); }
    if (payload.referencia !== undefined) { fields.push('referencia = ?'); params.push(payload.referencia ?? null); }
    if (payload.notas !== undefined) { fields.push('notas = ?'); params.push(payload.notas ?? null); }

    if (!fields.length) {
      res.json({ message: 'Sin cambios' });
      return;
    }

    await connection.execute(
      `UPDATE pagos SET ${fields.join(', ')} WHERE id = ?`,
      [...params, id],
    );

    await auditAction(req, 'UPDATE', 'PAYMENT', id, payload);
    res.json({ message: 'Pago actualizado' });
  } catch (error) {
    logger.error({ error, id, payload }, 'Error al actualizar pago');
    throw error;
  } finally {
    connection.release();
  }
});

export const eliminarPago = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);
  const connection = await pool.getConnection();
  try {
    const [appsRows] = await connection.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM aplicaciones_pago WHERE pago_id = ?',
      [id],
    );
    const tieneApps = Number((appsRows as any[])[0]?.total ?? 0) > 0;
    if (tieneApps) {
      throw new ConflictError('No se puede eliminar un pago con aplicaciones');
    }

    const [result] = await connection.execute(
      'DELETE FROM pagos WHERE id = ?',
      [id],
    );

    if ((result as any).affectedRows === 0) {
      throw new NotFoundError('Pago no encontrado');
    }

    await auditAction(req, 'DELETE', 'PAYMENT', id);
    res.json({ message: 'Pago eliminado' });
  } catch (error) {
    logger.error({ error, id }, 'Error al eliminar pago');
    throw error;
  } finally {
    connection.release();
  }
});

export const catalogoFormasPago = asyncHandler(async (_req: Request, res: Response) => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, codigo, nombre FROM formas_pago ORDER BY nombre ASC'
  );
  res.json({ data: rows });
});

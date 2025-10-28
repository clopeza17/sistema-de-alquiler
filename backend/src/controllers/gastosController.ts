import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

import { pool } from '../config/db.js';
import { createDbLogger } from '../config/logger.js';
import {
  BadRequestError,
  NotFoundError,
} from '../common/errors.js';
import {
  idSchema,
  paginationSchema,
  gastoCreateSchema,
  gastoUpdateSchema,
  gastoFiltersSchema,
} from '../common/validators.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';

const logger = createDbLogger();

interface GastoRow extends RowDataPacket {
  id: number;
  propiedad_id: number;
  tipo_gasto_id: number;
  fecha_gasto: string;
  detalle: string | null;
  monto: number;
  creado_por: number;
  creado_el: string;
  propiedad_codigo?: string;
  propiedad_titulo?: string;
  tipo_gasto_nombre?: string;
  creado_nombre?: string;
}

interface CatalogoTipoGastoRow extends RowDataPacket {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export const listarGastos = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const filters = gastoFiltersSchema.parse({
    propiedad_id: req.query.propiedad_id,
    tipo_gasto_id: req.query.tipo_gasto_id,
    fecha_desde: req.query.fecha_desde,
    fecha_hasta: req.query.fecha_hasta,
  });

  const condiciones: string[] = [];
  const params: Array<string | number> = [];

  if (filters.propiedad_id) {
    condiciones.push('gf.propiedad_id = ?');
    params.push(filters.propiedad_id);
  }

  if (filters.tipo_gasto_id) {
    condiciones.push('gf.tipo_gasto_id = ?');
    params.push(filters.tipo_gasto_id);
  }

  if (filters.fecha_desde) {
    condiciones.push('gf.fecha_gasto >= ?');
    params.push(filters.fecha_desde);
  }

  if (filters.fecha_hasta) {
    condiciones.push('gf.fecha_gasto <= ?');
    params.push(filters.fecha_hasta);
  }

  const whereClause = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM gastos_fijos gf ${whereClause}`,
    params,
  );
  const total = Number((countRows as any[])[0]?.total ?? 0);

  const offset = (page - 1) * limit;
  const safeLimit = Number.isFinite(limit) ? limit : 20;
  const safeOffset = Number.isFinite(offset) ? offset : 0;

  const [rows] = await pool.execute<GastoRow[]>(
    `SELECT 
      gf.id,
      gf.propiedad_id,
      gf.tipo_gasto_id,
      gf.fecha_gasto,
      gf.detalle,
      gf.monto,
      gf.creado_por,
      gf.creado_el,
      p.codigo AS propiedad_codigo,
      p.titulo AS propiedad_titulo,
      tg.nombre AS tipo_gasto_nombre,
      u.nombre_completo AS creado_nombre
    FROM gastos_fijos gf
    JOIN propiedades p ON p.id = gf.propiedad_id
    JOIN tipos_gasto tg ON tg.id = gf.tipo_gasto_id
    LEFT JOIN usuarios u ON u.id = gf.creado_por
    ${whereClause}
    ORDER BY gf.fecha_gasto DESC, gf.id DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params,
  );

  const items = rows.map(row => ({
    id: row.id,
    propiedad_id: row.propiedad_id,
    propiedad_codigo: row.propiedad_codigo,
    propiedad_titulo: row.propiedad_titulo,
    tipo_gasto_id: row.tipo_gasto_id,
    tipo_gasto_nombre: row.tipo_gasto_nombre,
    fecha_gasto: row.fecha_gasto,
    detalle: row.detalle,
    monto: Number(row.monto),
    creado_por: row.creado_por,
    creado_por_nombre: row.creado_nombre,
    creado_el: row.creado_el,
  }));

  await auditAction(req, 'READ', 'EXPENSE', undefined, {
    filters,
    total,
    page,
    limit,
  });

  res.json({
    data: items,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    },
  });

  logger.info({ total, page, filters }, 'Gastos listados');
});

export const obtenerGasto = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);

  const [rows] = await pool.execute<GastoRow[]>(
    `SELECT 
      gf.id,
      gf.propiedad_id,
      gf.tipo_gasto_id,
      gf.fecha_gasto,
      gf.detalle,
      gf.monto,
      gf.creado_por,
      gf.creado_el,
      p.codigo AS propiedad_codigo,
      p.titulo AS propiedad_titulo,
      tg.nombre AS tipo_gasto_nombre,
      u.nombre_completo AS creado_nombre
    FROM gastos_fijos gf
    JOIN propiedades p ON p.id = gf.propiedad_id
    JOIN tipos_gasto tg ON tg.id = gf.tipo_gasto_id
    LEFT JOIN usuarios u ON u.id = gf.creado_por
    WHERE gf.id = ?`,
    [id],
  );

  const gasto = rows[0];
  if (!gasto) {
    throw new NotFoundError('Gasto no encontrado');
  }

  await auditAction(req, 'READ', 'EXPENSE', id);

  res.json({
    data: {
      id: gasto.id,
      propiedad_id: gasto.propiedad_id,
      propiedad_codigo: gasto.propiedad_codigo,
      propiedad_titulo: gasto.propiedad_titulo,
      tipo_gasto_id: gasto.tipo_gasto_id,
      tipo_gasto_nombre: gasto.tipo_gasto_nombre,
      fecha_gasto: gasto.fecha_gasto,
      detalle: gasto.detalle,
      monto: Number(gasto.monto),
      creado_por: gasto.creado_por,
      creado_por_nombre: gasto.creado_nombre,
      creado_el: gasto.creado_el,
    },
  });
});

export const crearGasto = asyncHandler(async (req: Request, res: Response) => {
  const payload = gastoCreateSchema.parse(req.body);

  if (!req.user?.userId) {
    throw new BadRequestError('Usuario autenticado requerido');
  }

  const [propRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM propiedades WHERE id = ?',
    [payload.propiedad_id],
  );
  if ((propRows as any[]).length === 0) {
    throw new NotFoundError('Propiedad no encontrada');
  }

  const [tipoRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM tipos_gasto WHERE id = ?',
    [payload.tipo_gasto_id],
  );
  if ((tipoRows as any[]).length === 0) {
    throw new NotFoundError('Tipo de gasto no encontrado');
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO gastos_fijos (
      propiedad_id,
      tipo_gasto_id,
      fecha_gasto,
      detalle,
      monto,
      creado_por
    ) VALUES (?, ?, ?, ?, ?, ?)`
    , [
      payload.propiedad_id,
      payload.tipo_gasto_id,
      payload.fecha_gasto,
      payload.detalle ?? null,
      payload.monto,
      req.user.userId,
    ],
  );

  const id = (result as ResultSetHeader).insertId;

  await auditAction(req, 'CREATE', 'EXPENSE', id, payload);

  res.status(201).json({
    message: 'Gasto registrado exitosamente',
    data: { id },
  });

  logger.info({ gasto_id: id, payload }, 'Gasto creado');
});

export const actualizarGasto = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);
  const payload = gastoUpdateSchema.parse(req.body);

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM gastos_fijos WHERE id = ?',
    [id],
  );
  if ((rows as any[]).length === 0) {
    throw new NotFoundError('Gasto no encontrado');
  }

  if (payload.tipo_gasto_id) {
    const [tipoRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM tipos_gasto WHERE id = ?',
      [payload.tipo_gasto_id],
    );
    if ((tipoRows as any[]).length === 0) {
      throw new NotFoundError('Tipo de gasto no encontrado');
    }
  }

  const campos: string[] = [];
  const valores: Array<string | number | null> = [];

  if (payload.tipo_gasto_id !== undefined) {
    campos.push('tipo_gasto_id = ?');
    valores.push(payload.tipo_gasto_id);
  }
  if (payload.fecha_gasto !== undefined) {
    campos.push('fecha_gasto = ?');
    valores.push(payload.fecha_gasto);
  }
  if (payload.monto !== undefined) {
    campos.push('monto = ?');
    valores.push(payload.monto);
  }
  if (payload.detalle !== undefined) {
    campos.push('detalle = ?');
    valores.push(payload.detalle ?? null);
  }

  if (!campos.length) {
    throw new BadRequestError('No hay cambios para actualizar');
  }

  valores.push(id);

  await pool.execute(
    `UPDATE gastos_fijos SET ${campos.join(', ')} WHERE id = ?`,
    valores,
  );

  await auditAction(req, 'UPDATE', 'EXPENSE', id, payload);

  res.json({ message: 'Gasto actualizado' });

  logger.info({ gasto_id: id, campos: Object.keys(payload) }, 'Gasto actualizado');
});

export const eliminarGasto = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);

  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM gastos_fijos WHERE id = ?',
    [id],
  );

  if ((result as ResultSetHeader).affectedRows === 0) {
    throw new NotFoundError('Gasto no encontrado');
  }

  await auditAction(req, 'DELETE', 'EXPENSE', id);

  res.json({ message: 'Gasto eliminado' });

  logger.info({ gasto_id: id }, 'Gasto eliminado');
});

export const catalogoTiposGasto = asyncHandler(async (req: Request, res: Response) => {
  const [rows] = await pool.execute<CatalogoTipoGastoRow[]>(
    'SELECT id, nombre, descripcion FROM tipos_gasto ORDER BY nombre ASC',
  );

  await auditAction(req, 'READ', 'EXPENSE', undefined, { catalogo: 'tipos_gasto' });

  res.json({
    data: rows.map(row => ({
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion ?? undefined,
    })),
  });
});

export default {
  listarGastos,
  obtenerGasto,
  crearGasto,
  actualizarGasto,
  eliminarGasto,
  catalogoTiposGasto,
};

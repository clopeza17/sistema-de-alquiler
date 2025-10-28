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
  mantenimientoCreateSchema,
  mantenimientoUpdateSchema,
  mantenimientoFiltersSchema,
} from '../common/validators.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';

const logger = createDbLogger();

interface MantenimientoRow extends RowDataPacket {
  id: number;
  propiedad_id: number;
  contrato_id: number | null;
  reportado_por: string | null;
  asunto: string;
  descripcion: string | null;
  estado: 'ABIERTA' | 'EN_PROCESO' | 'EN_ESPERA' | 'RESUELTA' | 'CANCELADA';
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  abierta_el: string;
  cerrada_el: string | null;
  creado_por: number;
  actualizado_el: string;
  propiedad_codigo?: string;
  propiedad_titulo?: string;
  contrato_codigo?: number;
  inquilino_nombre?: string;
  creado_nombre?: string;
}

export const listarSolicitudes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const filters = mantenimientoFiltersSchema.parse({
    propiedad_id: req.query.propiedad_id,
    estado: req.query.estado,
    prioridad: req.query.prioridad,
    fecha_desde: req.query.fecha_desde,
    fecha_hasta: req.query.fecha_hasta,
  });

  const condiciones: string[] = [];
  const params: Array<string | number> = [];

  if (filters.propiedad_id) {
    condiciones.push('sm.propiedad_id = ?');
    params.push(filters.propiedad_id);
  }

  if (filters.estado) {
    condiciones.push('sm.estado = ?');
    params.push(filters.estado);
  }

  if (filters.prioridad) {
    condiciones.push('sm.prioridad = ?');
    params.push(filters.prioridad);
  }

  if (filters.fecha_desde) {
    condiciones.push('DATE(sm.abierta_el) >= ?');
    params.push(filters.fecha_desde);
  }

  if (filters.fecha_hasta) {
    condiciones.push('DATE(sm.abierta_el) <= ?');
    params.push(filters.fecha_hasta);
  }

  const whereClause = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM solicitudes_mantenimiento sm ${whereClause}`,
    params,
  );
  const total = Number((countRows as any[])[0]?.total ?? 0);

  const offset = (page - 1) * limit;
  const safeLimit = Number.isFinite(limit) ? limit : 20;
  const safeOffset = Number.isFinite(offset) ? offset : 0;

  const [rows] = await pool.execute<MantenimientoRow[]>(
    `SELECT 
      sm.id,
      sm.propiedad_id,
      sm.contrato_id,
      sm.reportado_por,
      sm.asunto,
      sm.descripcion,
      sm.estado,
      sm.prioridad,
      sm.abierta_el,
      sm.cerrada_el,
      sm.creado_por,
      sm.actualizado_el,
      p.codigo AS propiedad_codigo,
      p.titulo AS propiedad_titulo,
      c.id AS contrato_codigo,
      i.nombre_completo AS inquilino_nombre,
      u.nombre_completo AS creado_nombre
    FROM solicitudes_mantenimiento sm
    JOIN propiedades p ON p.id = sm.propiedad_id
    LEFT JOIN contratos c ON c.id = sm.contrato_id
    LEFT JOIN inquilinos i ON i.id = c.inquilino_id
    LEFT JOIN usuarios u ON u.id = sm.creado_por
    ${whereClause}
    ORDER BY sm.abierta_el DESC, sm.id DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params,
  );

  const items = rows.map(row => ({
    id: row.id,
    propiedad_id: row.propiedad_id,
    propiedad_codigo: row.propiedad_codigo,
    propiedad_titulo: row.propiedad_titulo,
    contrato_id: row.contrato_id,
    inquilino_nombre: row.inquilino_nombre,
    reportado_por: row.reportado_por,
    asunto: row.asunto,
    descripcion: row.descripcion,
    estado: row.estado,
    prioridad: row.prioridad,
    abierta_el: row.abierta_el,
    cerrada_el: row.cerrada_el,
    creado_por: row.creado_por,
    creado_por_nombre: row.creado_nombre,
    actualizado_el: row.actualizado_el,
  }));

  await auditAction(req, 'READ', 'MAINTENANCE', undefined, {
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

  logger.info({ total, page, filters }, 'Solicitudes de mantenimiento listadas');
});

export const obtenerSolicitud = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);

  const [rows] = await pool.execute<MantenimientoRow[]>(
    `SELECT 
      sm.id,
      sm.propiedad_id,
      sm.contrato_id,
      sm.reportado_por,
      sm.asunto,
      sm.descripcion,
      sm.estado,
      sm.prioridad,
      sm.abierta_el,
      sm.cerrada_el,
      sm.creado_por,
      sm.actualizado_el,
      p.codigo AS propiedad_codigo,
      p.titulo AS propiedad_titulo,
      c.id AS contrato_codigo,
      i.nombre_completo AS inquilino_nombre,
      u.nombre_completo AS creado_nombre
    FROM solicitudes_mantenimiento sm
    JOIN propiedades p ON p.id = sm.propiedad_id
    LEFT JOIN contratos c ON c.id = sm.contrato_id
    LEFT JOIN inquilinos i ON i.id = c.inquilino_id
    LEFT JOIN usuarios u ON u.id = sm.creado_por
    WHERE sm.id = ?`,
    [id],
  );

  const solicitud = rows[0];
  if (!solicitud) {
    throw new NotFoundError('Solicitud no encontrada');
  }

  await auditAction(req, 'READ', 'MAINTENANCE', id);

  res.json({
    data: {
      id: solicitud.id,
      propiedad_id: solicitud.propiedad_id,
      propiedad_codigo: solicitud.propiedad_codigo,
      propiedad_titulo: solicitud.propiedad_titulo,
      contrato_id: solicitud.contrato_id,
      inquilino_nombre: solicitud.inquilino_nombre,
      reportado_por: solicitud.reportado_por,
      asunto: solicitud.asunto,
      descripcion: solicitud.descripcion,
      estado: solicitud.estado,
      prioridad: solicitud.prioridad,
      abierta_el: solicitud.abierta_el,
      cerrada_el: solicitud.cerrada_el,
      creado_por: solicitud.creado_por,
      creado_por_nombre: solicitud.creado_nombre,
      actualizado_el: solicitud.actualizado_el,
    },
  });
});

export const crearSolicitud = asyncHandler(async (req: Request, res: Response) => {
  const payload = mantenimientoCreateSchema.parse(req.body);

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

  if (payload.contrato_id) {
    const [contratoRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, propiedad_id FROM contratos WHERE id = ?',
      [payload.contrato_id],
    );
    const contrato = (contratoRows as any[])[0];
    if (!contrato) {
      throw new NotFoundError('Contrato no encontrado');
    }
    if (Number(contrato.propiedad_id) !== payload.propiedad_id) {
      throw new BadRequestError('El contrato no pertenece a la propiedad seleccionada');
    }
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO solicitudes_mantenimiento (
      propiedad_id,
      contrato_id,
      reportado_por,
      asunto,
      descripcion,
      estado,
      prioridad,
      creado_por
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.propiedad_id,
      payload.contrato_id ?? null,
      payload.reportado_por ?? null,
      payload.asunto,
      payload.descripcion ?? null,
      payload.estado ?? 'ABIERTA',
      payload.prioridad ?? 'MEDIA',
      req.user.userId,
    ],
  );

  const id = (result as ResultSetHeader).insertId;

  await auditAction(req, 'CREATE', 'MAINTENANCE', id, payload);

  res.status(201).json({
    message: 'Solicitud de mantenimiento registrada',
    data: { id },
  });

  logger.info({ solicitud_id: id, payload }, 'Solicitud de mantenimiento creada');
});

export const actualizarSolicitud = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);
  const payload = mantenimientoUpdateSchema.parse(req.body);

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT estado FROM solicitudes_mantenimiento WHERE id = ?',
    [id],
  );
  const solicitud = (rows as any[])[0];
  if (!solicitud) {
    throw new NotFoundError('Solicitud no encontrada');
  }

  const campos: string[] = [];
  const valores: Array<string | number | null> = [];
  let cerrar = false;
  let reabrir = false;

  if (payload.estado) {
    campos.push('estado = ?');
    valores.push(payload.estado);
    if (payload.estado === 'RESUELTA' || payload.estado === 'CANCELADA') {
      cerrar = true;
    } else if (solicitud.estado === 'RESUELTA' || solicitud.estado === 'CANCELADA') {
      reabrir = true;
    }
  }

  if (payload.prioridad) {
    campos.push('prioridad = ?');
    valores.push(payload.prioridad);
  }

  if (payload.descripcion !== undefined) {
    campos.push('descripcion = ?');
    valores.push(payload.descripcion ?? null);
  }

  if (payload.reportado_por !== undefined) {
    campos.push('reportado_por = ?');
    valores.push(payload.reportado_por ?? null);
  }

  if (!campos.length && !cerrar && !reabrir) {
    throw new BadRequestError('No hay cambios para actualizar');
  }

  if (cerrar) {
    campos.push('cerrada_el = NOW()');
  } else if (reabrir) {
    campos.push('cerrada_el = NULL');
  }

  campos.push('actualizado_el = NOW()');
  valores.push(id);

  await pool.execute(
    `UPDATE solicitudes_mantenimiento SET ${campos.join(', ')} WHERE id = ?`,
    valores,
  );

  await auditAction(req, 'UPDATE', 'MAINTENANCE', id, payload);

  res.json({ message: 'Solicitud actualizada' });

  logger.info({ solicitud_id: id, campos: Object.keys(payload) }, 'Solicitud de mantenimiento actualizada');
});

export const cancelarSolicitud = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE solicitudes_mantenimiento 
     SET estado = 'CANCELADA', cerrada_el = NOW(), actualizado_el = NOW()
     WHERE id = ?`,
    [id],
  );

  if ((result as ResultSetHeader).affectedRows === 0) {
    throw new NotFoundError('Solicitud no encontrada');
  }

  await auditAction(req, 'DELETE', 'MAINTENANCE', id, { cancelada: true });

  res.json({ message: 'Solicitud cancelada' });

  logger.info({ solicitud_id: id }, 'Solicitud de mantenimiento cancelada');
});

export default {
  listarSolicitudes,
  obtenerSolicitud,
  crearSolicitud,
  actualizarSolicitud,
  cancelarSolicitud,
};

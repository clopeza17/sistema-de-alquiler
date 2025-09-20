import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { z } from 'zod';

import { pool } from '../config/db.js';
import { createDbLogger } from '../config/logger.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../common/errors.js';
import {
  idSchema,
  paginationSchema,
  dbDateSchema,
} from '../common/validators.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';

const logger = createDbLogger();

const FACTURA_ESTADOS = ['ABIERTA', 'PARCIAL', 'PAGADA', 'VENCIDA', 'ANULADA'] as const;

const facturaEstadoSchema = z.enum(FACTURA_ESTADOS);

const generarFacturasSchema = z.object({
  anio: z.coerce.number().int().min(2000, 'Año inválido').max(2100, 'Año inválido'),
  mes: z.coerce.number().int().min(1, 'Mes inválido').max(12, 'Mes inválido'),
  fecha_emision: dbDateSchema,
  fecha_vencimiento: dbDateSchema,
}).refine((data) => data.fecha_emision <= data.fecha_vencimiento, {
  message: 'Fecha de vencimiento debe ser igual o posterior a la fecha de emisión',
  path: ['fecha_vencimiento'],
});

const facturasListFiltersSchema = z.object({
  estado: facturaEstadoSchema.optional(),
  contrato_id: z.coerce.number().int().positive('ID de contrato inválido').optional(),
  fecha_desde: dbDateSchema.optional(),
  fecha_hasta: dbDateSchema.optional(),
}).refine((data) => {
  if (data.fecha_desde && data.fecha_hasta) {
    return data.fecha_desde <= data.fecha_hasta;
  }
  return true;
}, {
  message: 'Fecha hasta debe ser posterior o igual a fecha desde',
  path: ['fecha_hasta'],
});

interface FacturaRow extends RowDataPacket {
  id: number;
  contrato_id: number;
  anio_periodo: number;
  mes_periodo: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  numero_factura: string | null;
  nit: string | null;
  detalle: string;
  monto_total: number;
  saldo_pendiente: number;
  estado: (typeof FACTURA_ESTADOS)[number];
  creado_el: string;
  actualizado_el: string;
  propiedad_codigo?: string;
  propiedad_titulo?: string;
  inquilino_nombre?: string;
}

export const generarFacturasMensuales = asyncHandler(async (req: Request, res: Response) => {
  const payload = generarFacturasSchema.parse(req.body);

  if (!req.user?.userId) {
    throw new BadRequestError('Usuario autenticado requerido para generar facturas');
  }

  const connection = await pool.getConnection();

  try {
    const [conteoInicialRows] = await connection.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM facturas WHERE anio_periodo = ? AND mes_periodo = ?',
      [payload.anio, payload.mes],
    );
    const conteoInicial = Number((conteoInicialRows as any[])[0]?.total ?? 0);

    await connection.execute('CALL sp_generar_facturas_mensuales(?, ?, ?, ?, ?)', [
      payload.anio,
      payload.mes,
      payload.fecha_emision,
      payload.fecha_vencimiento,
      req.user.userId,
    ]);

    const [conteoFinalRows] = await connection.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM facturas WHERE anio_periodo = ? AND mes_periodo = ?',
      [payload.anio, payload.mes],
    );
    const conteoFinal = Number((conteoFinalRows as any[])[0]?.total ?? 0);
    const generadas = Math.max(conteoFinal - conteoInicial, 0);

    await auditAction(req, 'CREATE', 'INVOICE', undefined, {
      anio: payload.anio,
      mes: payload.mes,
      fecha_emision: payload.fecha_emision,
      fecha_vencimiento: payload.fecha_vencimiento,
      generadas,
    });

    res.status(201).json({
      message: 'Facturas generadas exitosamente',
      data: {
        anio: payload.anio,
        mes: payload.mes,
        generadas,
      },
    });

    logger.info({
      usuario_id: req.user.userId,
      ...payload,
      generadas,
    }, 'Facturas mensuales generadas');
  } catch (error) {
    logger.error({
      error,
      payload,
      usuario_id: req.user?.userId,
    }, 'Error al generar facturas mensuales');
    throw error;
  } finally {
    connection.release();
  }
});

export const listarFacturas = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const filters = facturasListFiltersSchema.parse({
    estado: req.query.estado,
    contrato_id: req.query.contrato_id,
    fecha_desde: req.query.fecha_desde,
    fecha_hasta: req.query.fecha_hasta,
  });

  const condiciones: string[] = [];
  const params: Array<string | number> = [];

  if (filters.estado) {
    condiciones.push('f.estado = ?');
    params.push(filters.estado);
  }

  if (filters.contrato_id) {
    condiciones.push('f.contrato_id = ?');
    params.push(filters.contrato_id);
  }

  if (filters.fecha_desde) {
    condiciones.push('f.fecha_vencimiento >= ?');
    params.push(filters.fecha_desde);
  }

  if (filters.fecha_hasta) {
    condiciones.push('f.fecha_vencimiento <= ?');
    params.push(filters.fecha_hasta);
  }

  const whereClause = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const [countRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM facturas f ${whereClause}`,
      params,
    );
    const total = Number((countRows as any[])[0]?.total ?? 0);

    const offset = (page - 1) * limit;
    const safeLimit = Number.isFinite(limit) ? limit : 10;
    const safeOffset = Number.isFinite(offset) ? offset : 0;

    const [rows] = await pool.execute<FacturaRow[]>(
      `SELECT 
        f.id,
        f.contrato_id,
        f.anio_periodo,
        f.mes_periodo,
        f.fecha_emision,
        f.fecha_vencimiento,
        f.numero_factura,
        f.nit,
        f.detalle,
        f.monto_total,
        f.saldo_pendiente,
        f.estado,
        f.creado_el,
        f.actualizado_el,
        p.codigo AS propiedad_codigo,
        p.titulo AS propiedad_titulo,
        i.nombre_completo AS inquilino_nombre
      FROM facturas f
      INNER JOIN contratos c ON c.id = f.contrato_id
      LEFT JOIN propiedades p ON p.id = c.propiedad_id
      LEFT JOIN inquilinos i ON i.id = c.inquilino_id
      ${whereClause}
      ORDER BY f.fecha_vencimiento DESC, f.id DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params,
    );

    await auditAction(req, 'READ', 'INVOICE', undefined, {
      filters,
      page,
      limit,
      total,
    });

    res.json({
      data: rows,
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

    logger.info({
      page,
      limit,
      total,
      filters,
    }, 'Listado de facturas obtenido');
  } catch (error) {
    logger.error({
      error,
      filters,
    }, 'Error al listar facturas');
    throw error;
  }
});

export const obtenerFactura = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);

  try {
    const [rows] = await pool.execute<FacturaRow[]>(
      `SELECT 
        f.id,
        f.contrato_id,
        f.anio_periodo,
        f.mes_periodo,
        f.fecha_emision,
        f.fecha_vencimiento,
        f.numero_factura,
        f.nit,
        f.detalle,
        f.monto_total,
        f.saldo_pendiente,
        f.estado,
        f.creado_el,
        f.actualizado_el,
        p.codigo AS propiedad_codigo,
        p.titulo AS propiedad_titulo,
        i.nombre_completo AS inquilino_nombre
      FROM facturas f
      INNER JOIN contratos c ON c.id = f.contrato_id
      LEFT JOIN propiedades p ON p.id = c.propiedad_id
      LEFT JOIN inquilinos i ON i.id = c.inquilino_id
      WHERE f.id = ?`,
      [id],
    );

    const factura = rows[0];

    if (!factura) {
      throw new NotFoundError('Factura no encontrada');
    }

    await auditAction(req, 'READ', 'INVOICE', id);

    res.json({ data: factura });

    logger.info({ factura_id: id }, 'Factura obtenida');
  } catch (error) {
    logger.error({ error, factura_id: id }, 'Error al obtener factura');
    throw error;
  }
});

export const anularFactura = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);

  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute<FacturaRow[]>(
      'SELECT id, estado, saldo_pendiente FROM facturas WHERE id = ?',
      [id],
    );

    const factura = rows[0];

    if (!factura) {
      throw new NotFoundError('Factura no encontrada');
    }

    if (factura.estado === 'ANULADA') {
      throw new ConflictError('La factura ya se encuentra anulada');
    }

    if (factura.estado === 'PAGADA') {
      throw new ConflictError('No es posible anular una factura pagada');
    }

    await connection.execute(
      `UPDATE facturas 
       SET estado = 'ANULADA', saldo_pendiente = 0, actualizado_el = NOW()
       WHERE id = ?`,
      [id],
    );

    await auditAction(req, 'UPDATE', 'INVOICE', id, {
      estado_anterior: factura.estado,
    });

    res.json({
      message: 'Factura anulada exitosamente',
      data: {
        id,
        estado: 'ANULADA',
      },
    });

    logger.info({ factura_id: id }, 'Factura anulada');
  } catch (error) {
    logger.error({ error, factura_id: id }, 'Error al anular factura');
    throw error;
  } finally {
    connection.release();
  }
});

export const catalogoEstadosFacturas = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    data: FACTURA_ESTADOS,
  });
});

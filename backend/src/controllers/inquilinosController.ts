import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { 
  NotFoundError, 
  ConflictError, 
  BadRequestError 
} from '../common/errors.js';
import { 
  inquilinoCreateSchema,
  inquilinoUpdateSchema,
  paginationSchema,
  idSchema 
} from '../common/validators.js';
import { createBusinessLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';

const logger = createBusinessLogger('inquilinos');

/**
 * Interfaz para inquilino de la base de datos
 */
interface InquilinoRow extends RowDataPacket {
  id: number;
  doc_identidad: string | null;
  nombre_completo: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  activo: boolean;
  creado_el: Date;
  actualizado_el: Date;
}

/**
 * GET /api/inquilinos
 * Obtener lista de inquilinos con paginación y filtros
 */
export const getInquilinos = asyncHandler(async (req: Request, res: Response) => {
  // Validar parámetros de paginación
  const { page, limit } = paginationSchema.parse(req.query);
  const offset = (page - 1) * limit;

  // Parámetros de filtrado
  const { search, activo } = req.query;

  // Construir condiciones WHERE
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push('(nombre_completo LIKE ? OR doc_identidad LIKE ? OR correo LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (activo !== undefined) {
    conditions.push('activo = ?');
    params.push(activo === 'true' ? 1 : 0);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Obtener total de registros
  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM inquilinos ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  // Obtener inquilinos
  const [inquilinos] = await pool.execute<InquilinoRow[]>(
    `SELECT 
       id, doc_identidad, nombre_completo, telefono, correo, 
       direccion, activo, creado_el, actualizado_el
     FROM inquilinos 
     ${whereClause}
     ORDER BY nombre_completo ASC
     LIMIT ? OFFSET ?`,
    [...params, String(limit), String(offset)]
  );

  logger.info({ 
    page, 
    limit, 
    total, 
    filters: { search, activo } 
  }, 'Lista de inquilinos obtenida');

  res.json({
    message: 'Inquilinos obtenidos exitosamente',
    data: {
      inquilinos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * GET /api/inquilinos/:id
 * Obtener un inquilino por ID
 */
export const getInquilino = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);

  const [inquilinos] = await pool.execute<InquilinoRow[]>(
    `SELECT 
       id, doc_identidad, nombre_completo, telefono, correo, 
       direccion, activo, creado_el, actualizado_el
     FROM inquilinos 
     WHERE id = ?`,
    [id]
  );

  if (inquilinos.length === 0) {
    throw new NotFoundError('Inquilino no encontrado');
  }

  const inquilino = inquilinos[0];

  logger.info({ inquilinoId: id }, 'Inquilino obtenido');

  res.json({
    message: 'Inquilino obtenido exitosamente',
    data: {
      inquilino,
    },
  });
});

/**
 * POST /api/inquilinos
 * Crear nuevo inquilino
 */
export const createInquilino = asyncHandler(async (req: Request, res: Response) => {
  const inquilinoData = inquilinoCreateSchema.parse(req.body);

  // Verificar si el documento de identidad ya existe (si se proporciona)
  if (inquilinoData.doc_identidad) {
    const [existingDocs] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM inquilinos WHERE doc_identidad = ?',
      [inquilinoData.doc_identidad]
    );

    if (existingDocs.length > 0) {
      throw new ConflictError('Ya existe un inquilino con ese documento de identidad');
    }
  }

  // Verificar si el correo ya existe (si se proporciona)
  if (inquilinoData.correo) {
    const [existingEmails] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM inquilinos WHERE correo = ?',
      [inquilinoData.correo]
    );

    if (existingEmails.length > 0) {
      throw new ConflictError('Ya existe un inquilino con ese correo electrónico');
    }
  }

  // Crear inquilino
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO inquilinos (
       doc_identidad, nombre_completo, telefono, correo, direccion, 
       activo, creado_el, actualizado_el
     ) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [
      inquilinoData.doc_identidad || null,
      inquilinoData.nombre_completo,
      inquilinoData.telefono || null,
      inquilinoData.correo || null,
      inquilinoData.direccion || null,
    ]
  );

  const inquilinoId = result.insertId;

  // Auditar creación
  await auditAction(req, 'CREATE', 'INQUILINO', inquilinoId, inquilinoData, true);

  logger.info({ 
    inquilinoId, 
    nombre: inquilinoData.nombre_completo 
  }, 'Inquilino creado exitosamente');

  // Obtener el inquilino creado
  const [newInquilino] = await pool.execute<InquilinoRow[]>(
    `SELECT 
       id, doc_identidad, nombre_completo, telefono, correo, 
       direccion, activo, creado_el, actualizado_el
     FROM inquilinos 
     WHERE id = ?`,
    [inquilinoId]
  );

  res.status(201).json({
    message: 'Inquilino creado exitosamente',
    data: {
      inquilino: newInquilino[0],
    },
  });
});

/**
 * PUT /api/inquilinos/:id
 * Actualizar inquilino existente
 */
export const updateInquilino = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);
  const inquilinoData = inquilinoUpdateSchema.parse(req.body);

  // Verificar que el inquilino existe
  const [existingInquilinos] = await pool.execute<InquilinoRow[]>(
    'SELECT * FROM inquilinos WHERE id = ?',
    [id]
  );

  if (existingInquilinos.length === 0) {
    throw new NotFoundError('Inquilino no encontrado');
  }

  const existingInquilino = existingInquilinos[0];

  // Verificar conflictos si se actualiza el documento de identidad
  if (inquilinoData.doc_identidad && inquilinoData.doc_identidad !== existingInquilino.doc_identidad) {
    const [existingDocs] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM inquilinos WHERE doc_identidad = ? AND id != ?',
      [inquilinoData.doc_identidad, id]
    );

    if (existingDocs.length > 0) {
      throw new ConflictError('Ya existe un inquilino con ese documento de identidad');
    }
  }

  // Verificar conflictos si se actualiza el correo
  if (inquilinoData.correo && inquilinoData.correo !== existingInquilino.correo) {
    const [existingEmails] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM inquilinos WHERE correo = ? AND id != ?',
      [inquilinoData.correo, id]
    );

    if (existingEmails.length > 0) {
      throw new ConflictError('Ya existe un inquilino con ese correo electrónico');
    }
  }

  // Construir la consulta de actualización dinámicamente
  const updates: string[] = [];
  const params: any[] = [];

  Object.entries(inquilinoData).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      params.push(value);
    }
  });

  if (updates.length === 0) {
    throw new BadRequestError('No se proporcionaron datos para actualizar');
  }

  // Agregar timestamp de actualización
  updates.push('actualizado_el = NOW()');
  params.push(id);

  await pool.execute(
    `UPDATE inquilinos SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  // Auditar actualización
  await auditAction(req, 'UPDATE', 'INQUILINO', id, {
    original: existingInquilino,
    changes: inquilinoData
  }, true);

  logger.info({ 
    inquilinoId: id, 
    changes: inquilinoData 
  }, 'Inquilino actualizado exitosamente');

  // Obtener el inquilino actualizado
  const [updatedInquilino] = await pool.execute<InquilinoRow[]>(
    `SELECT 
       id, doc_identidad, nombre_completo, telefono, correo, 
       direccion, activo, creado_el, actualizado_el
     FROM inquilinos 
     WHERE id = ?`,
    [id]
  );

  res.json({
    message: 'Inquilino actualizado exitosamente',
    data: {
      inquilino: updatedInquilino[0],
    },
  });
});

/**
 * DELETE /api/inquilinos/:id
 * Eliminar inquilino (soft delete)
 */
export const deleteInquilino = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);

  // Verificar que el inquilino existe
  const [existingInquilinos] = await pool.execute<InquilinoRow[]>(
    'SELECT * FROM inquilinos WHERE id = ?',
    [id]
  );

  if (existingInquilinos.length === 0) {
    throw new NotFoundError('Inquilino no encontrado');
  }

  // Verificar si el inquilino tiene contratos activos
  const [activeContracts] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM contratos WHERE inquilino_id = ? AND estado = "ACTIVO"',
    [id]
  );

  if (activeContracts[0].count > 0) {
    throw new ConflictError('No se puede eliminar el inquilino porque tiene contratos activos');
  }

  // Realizar soft delete
  await pool.execute(
    'UPDATE inquilinos SET activo = 0, actualizado_el = NOW() WHERE id = ?',
    [id]
  );

  // Auditar eliminación
  await auditAction(req, 'DELETE', 'INQUILINO', id, {
    inquilino: existingInquilinos[0]
  }, true);

  logger.info({ inquilinoId: id }, 'Inquilino eliminado exitosamente');

  res.json({
    message: 'Inquilino eliminado exitosamente',
  });
});

/**
 * POST /api/inquilinos/:id/reactivar
 * Reactivar inquilino eliminado
 */
export const reactivateInquilino = asyncHandler(async (req: Request, res: Response) => {
  const id = idSchema.parse(req.params.id);

  // Verificar que el inquilino existe
  const [existingInquilinos] = await pool.execute<InquilinoRow[]>(
    'SELECT * FROM inquilinos WHERE id = ?',
    [id]
  );

  if (existingInquilinos.length === 0) {
    throw new NotFoundError('Inquilino no encontrado');
  }

  const inquilino = existingInquilinos[0];

  if (inquilino.activo) {
    throw new BadRequestError('El inquilino ya está activo');
  }

  // Reactivar inquilino
  await pool.execute(
    'UPDATE inquilinos SET activo = 1, actualizado_el = NOW() WHERE id = ?',
    [id]
  );

  // Auditar reactivación
  await auditAction(req, 'UPDATE', 'INQUILINO', id, {
    action: 'reactivate'
  }, true);

  logger.info({ inquilinoId: id }, 'Inquilino reactivado exitosamente');

  res.json({
    message: 'Inquilino reactivado exitosamente',
  });
});

export default {
  getInquilinos,
  getInquilino,
  createInquilino,
  updateInquilino,
  deleteInquilino,
  reactivateInquilino,
};

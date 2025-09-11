import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { RowDataPacket } from 'mysql2';
import { 
  NotFoundError,
  ConflictError,
  BadRequestError
} from '../common/errors.js';
import { 
  paginationSchema,
  codeSchema
} from '../common/validators.js';
import { createBusinessLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';
import { z } from 'zod';

const logger = createBusinessLogger('propiedades');

/**
 * Interfaz para propiedad de la base de datos
 */
interface PropiedadRow extends RowDataPacket {
  id: number;
  codigo: string;
  tipo: 'APARTAMENTO' | 'CASA' | 'ESTUDIO' | 'OTRO';
  titulo: string;
  direccion: string;
  dormitorios: number;
  banos: number;
  area_m2: number | null;
  renta_mensual: number;
  deposito: number;
  estado: 'DISPONIBLE' | 'OCUPADA' | 'MANTENIMIENTO' | 'INACTIVA';
  notas: string | null;
  creado_el: Date;
  actualizado_el: Date;
}

/**
 * Interfaz para imagen de propiedad
 */
interface ImagenPropiedadRow extends RowDataPacket {
  id: number;
  propiedad_id: number;
  url: string;
  principal: boolean;
  creado_el: Date;
}

/**
 * Schema de validación para crear/actualizar propiedad
 */
const propiedadSchema = z.object({
  codigo: codeSchema.optional(),
  tipo: z.enum(['APARTAMENTO', 'CASA', 'ESTUDIO', 'OTRO']).default('APARTAMENTO'),
  titulo: z.string()
    .min(1, 'Título es requerido')
    .max(160, 'Título muy largo (máximo 160 caracteres)'),
  direccion: z.string()
    .min(1, 'Dirección es requerida')
    .max(255, 'Dirección muy larga (máximo 255 caracteres)'),
  dormitorios: z.number()
    .int('Dormitorios debe ser un número entero')
    .min(0, 'Dormitorios no puede ser negativo')
    .max(255, 'Dormitorios muy alto'),
  banos: z.number()
    .int('Baños debe ser un número entero')
    .min(0, 'Baños no puede ser negativo')
    .max(255, 'Baños muy alto'),
  area_m2: z.number()
    .positive('Área debe ser positiva')
    .max(99999999.99, 'Área muy grande')
    .optional(),
  renta_mensual: z.number()
    .positive('Renta mensual debe ser positiva')
    .max(9999999999.99, 'Renta muy alta'),
  deposito: z.number()
    .min(0, 'Depósito no puede ser negativo')
    .max(9999999999.99, 'Depósito muy alto')
    .default(0),
  estado: z.enum(['DISPONIBLE', 'OCUPADA', 'MANTENIMIENTO', 'INACTIVA']).default('DISPONIBLE'),
  notas: z.string().max(1000, 'Notas muy largas (máximo 1000 caracteres)').optional()
});

/**
 * Schema para actualización de propiedad
 */
const actualizarPropiedadSchema = propiedadSchema.partial();

/**
 * Schema para imagen de propiedad
 */
const imagenSchema = z.object({
  url: z.string()
    .url('URL inválida')
    .max(400, 'URL muy larga (máximo 400 caracteres)'),
  principal: z.boolean().default(false)
});

/**
 * GET /api/v1/propiedades
 * Obtener lista de propiedades con paginación y filtros
 */
export const getPropiedades = asyncHandler(async (req: Request, res: Response) => {
  // Validar parámetros de paginación
  const { page, limit } = paginationSchema.parse(req.query);
  const offset = (page - 1) * limit;

  // Parámetros de filtrado
  const { search, tipo, estado, min_renta, max_renta } = req.query;

  // Construir condiciones WHERE
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push('(titulo LIKE ? OR codigo LIKE ? OR direccion LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (tipo) {
    conditions.push('tipo = ?');
    params.push(tipo);
  }

  if (estado) {
    conditions.push('estado = ?');
    params.push(estado);
  }

  if (min_renta) {
    conditions.push('renta_mensual >= ?');
    params.push(Number(min_renta));
  }

  if (max_renta) {
    conditions.push('renta_mensual <= ?');
    params.push(Number(max_renta));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Obtener total de registros
  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM propiedades ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  // Obtener propiedades
  const [propiedades] = await pool.execute<PropiedadRow[]>(
    `SELECT 
       id, codigo, tipo, titulo, direccion, dormitorios, banos, 
       area_m2, renta_mensual, deposito, estado, notas, 
       creado_el, actualizado_el
     FROM propiedades 
     ${whereClause}
     ORDER BY titulo ASC
     LIMIT ? OFFSET ?`,
    [...params, String(limit), String(offset)]
  );

  // Obtener imagen principal para cada propiedad
  const propiedadesConImagenes = await Promise.all(
    propiedades.map(async (propiedad) => {
      const [imagenes] = await pool.execute<ImagenPropiedadRow[]>(
        'SELECT id, url, principal FROM imagenes_propiedad WHERE propiedad_id = ? ORDER BY principal DESC, id ASC LIMIT 1',
        [propiedad.id]
      );

      return {
        ...propiedad,
        imagen_principal: imagenes.length > 0 ? imagenes[0].url : null
      };
    })
  );

  logger.info({ 
    page, 
    limit, 
    total, 
    filters: { search, tipo, estado, min_renta, max_renta } 
  }, 'Lista de propiedades obtenida');

  res.json({
    message: 'Propiedades obtenidas exitosamente',
    data: {
      propiedades: propiedadesConImagenes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * GET /api/v1/propiedades/:id
 * Obtener una propiedad específica
 */
export const getPropiedadById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Buscar propiedad
  const [propiedadRows] = await pool.execute<PropiedadRow[]>(
    `SELECT 
       id, codigo, tipo, titulo, direccion, dormitorios, banos, 
       area_m2, renta_mensual, deposito, estado, notas, 
       creado_el, actualizado_el
     FROM propiedades 
     WHERE id = ?`,
    [id]
  );

  if (propiedadRows.length === 0) {
    throw new NotFoundError('Propiedad no encontrada');
  }

  const propiedad = propiedadRows[0];

  // Obtener todas las imágenes
  const [imagenes] = await pool.execute<ImagenPropiedadRow[]>(
    'SELECT id, url, principal, creado_el FROM imagenes_propiedad WHERE propiedad_id = ? ORDER BY principal DESC, id ASC',
    [id]
  );

  logger.info({ propiedadId: id }, 'Propiedad obtenida');

  res.json({
    message: 'Propiedad obtenida exitosamente',
    data: {
      ...propiedad,
      imagenes
    }
  });
});

/**
 * POST /api/v1/propiedades
 * Crear una nueva propiedad
 */
export const createPropiedad = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = propiedadSchema.parse(req.body);

  // Generar código único si no se proporciona
  let codigo = validatedData.codigo;
  if (!codigo) {
    // Generar código automático basado en tipo y timestamp
    const timestamp = Date.now().toString().slice(-6);
    const prefijo = (validatedData.tipo as string).charAt(0);
    codigo = `${prefijo}${timestamp}`;
  }

  // Verificar que el código no exista
  const [existingRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM propiedades WHERE codigo = ?',
    [codigo]
  );

  if (existingRows.length > 0) {
    throw new ConflictError('Ya existe una propiedad con ese código');
  }

  // Crear propiedad
  const [result] = await pool.execute(
    `INSERT INTO propiedades (
       codigo, tipo, titulo, direccion, dormitorios, banos, 
       area_m2, renta_mensual, deposito, estado, notas
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      codigo,
      validatedData.tipo,
      validatedData.titulo,
      validatedData.direccion,
      validatedData.dormitorios,
      validatedData.banos,
      validatedData.area_m2,
      validatedData.renta_mensual,
      validatedData.deposito,
      validatedData.estado,
      validatedData.notas
    ]
  );

  const propiedadId = (result as any).insertId;

  // Obtener propiedad creada
  const [newPropiedadRows] = await pool.execute<PropiedadRow[]>(
    `SELECT 
       id, codigo, tipo, titulo, direccion, dormitorios, banos, 
       area_m2, renta_mensual, deposito, estado, notas, 
       creado_el, actualizado_el
     FROM propiedades 
     WHERE id = ?`,
    [propiedadId]
  );

  const nuevaPropiedad = newPropiedadRows[0];

  // Auditoría
  await auditAction(
    req, 
    'CREATE', 
    'PROPERTY', 
    propiedadId, 
    nuevaPropiedad, 
    true, 
    'Propiedad creada exitosamente'
  );

  logger.info({ 
    propiedadId, 
    codigo: nuevaPropiedad.codigo,
    titulo: nuevaPropiedad.titulo 
  }, 'Propiedad creada exitosamente');

  res.status(201).json({
    message: 'Propiedad creada exitosamente',
    data: {
      ...nuevaPropiedad,
      imagenes: []
    }
  });
});

/**
 * PUT /api/v1/propiedades/:id
 * Actualizar una propiedad existente
 */
export const updatePropiedad = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = actualizarPropiedadSchema.parse(req.body);

  // Verificar que la propiedad existe
  const [propiedadRows] = await pool.execute<PropiedadRow[]>(
    'SELECT * FROM propiedades WHERE id = ?',
    [id]
  );

  if (propiedadRows.length === 0) {
    throw new NotFoundError('Propiedad no encontrada');
  }

  const propiedadActual = propiedadRows[0];

  // Si se está actualizando el código, verificar que no exista
  if (validatedData.codigo && validatedData.codigo !== propiedadActual.codigo) {
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM propiedades WHERE codigo = ? AND id != ?',
      [validatedData.codigo, id]
    );

    if (existingRows.length > 0) {
      throw new ConflictError('Ya existe una propiedad con ese código');
    }
  }

  // Construir query de actualización dinámicamente
  const updates: string[] = [];
  const values: any[] = [];

  Object.entries(validatedData).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (updates.length === 0) {
    throw new BadRequestError('No se proporcionaron datos para actualizar');
  }

  values.push(id);

  // Actualizar propiedad
  await pool.execute(
    `UPDATE propiedades SET ${updates.join(', ')}, actualizado_el = NOW() WHERE id = ?`,
    values
  );

  // Obtener propiedad actualizada
  const [updatedRows] = await pool.execute<PropiedadRow[]>(
    `SELECT 
       id, codigo, tipo, titulo, direccion, dormitorios, banos, 
       area_m2, renta_mensual, deposito, estado, notas, 
       creado_el, actualizado_el
     FROM propiedades 
     WHERE id = ?`,
    [id]
  );

  const propiedadActualizada = updatedRows[0];

  // Obtener imágenes
  const [imagenes] = await pool.execute<ImagenPropiedadRow[]>(
    'SELECT id, url, principal, creado_el FROM imagenes_propiedad WHERE propiedad_id = ? ORDER BY principal DESC, id ASC',
    [id]
  );

  // Auditoría
  await auditAction(
    req, 
    'UPDATE', 
    'PROPERTY', 
    Number(id), 
    validatedData, 
    true, 
    'Propiedad actualizada exitosamente'
  );

  logger.info({ 
    propiedadId: id, 
    changes: validatedData 
  }, 'Propiedad actualizada exitosamente');

  res.json({
    message: 'Propiedad actualizada exitosamente',
    data: {
      ...propiedadActualizada,
      imagenes
    }
  });
});

/**
 * DELETE /api/v1/propiedades/:id
 * Eliminar una propiedad (solo si no tiene contratos activos)
 */
export const deletePropiedad = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Verificar que la propiedad existe
  const [propiedadRows] = await pool.execute<PropiedadRow[]>(
    'SELECT * FROM propiedades WHERE id = ?',
    [id]
  );

  if (propiedadRows.length === 0) {
    throw new NotFoundError('Propiedad no encontrada');
  }

  // Verificar que no tenga contratos activos
  const [contratosRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) as total FROM contratos WHERE propiedad_id = ? AND estado = "ACTIVO"',
    [id]
  );

  if (contratosRows[0].total > 0) {
    throw new ConflictError('No se puede eliminar la propiedad porque tiene contratos activos');
  }

  const propiedad = propiedadRows[0];

  // Eliminar imágenes asociadas
  await pool.execute(
    'DELETE FROM imagenes_propiedad WHERE propiedad_id = ?',
    [id]
  );

  // Eliminar propiedad
  await pool.execute(
    'DELETE FROM propiedades WHERE id = ?',
    [id]
  );

  // Auditoría
  await auditAction(
    req, 
    'DELETE', 
    'PROPERTY', 
    Number(id), 
    propiedad, 
    true, 
    'Propiedad eliminada exitosamente'
  );

  logger.info({ propiedadId: id }, 'Propiedad eliminada exitosamente');

  res.json({
    message: 'Propiedad eliminada exitosamente'
  });
});

/**
 * GET /api/v1/propiedades/:id/imagenes
 * Obtener imágenes de una propiedad
 */
export const getImagenesPropiedad = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Verificar que la propiedad existe
  const [propiedadRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM propiedades WHERE id = ?',
    [id]
  );

  if (propiedadRows.length === 0) {
    throw new NotFoundError('Propiedad no encontrada');
  }

  // Obtener imágenes
  const [imagenes] = await pool.execute<ImagenPropiedadRow[]>(
    'SELECT id, url, principal, creado_el FROM imagenes_propiedad WHERE propiedad_id = ? ORDER BY principal DESC, id ASC',
    [id]
  );

  res.json({
    message: 'Imágenes obtenidas exitosamente',
    data: {
      imagenes
    }
  });
});

/**
 * POST /api/v1/propiedades/:id/imagenes
 * Agregar imagen a una propiedad
 */
export const addImagenPropiedad = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = imagenSchema.parse(req.body);

  // Verificar que la propiedad existe
  const [propiedadRows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM propiedades WHERE id = ?',
    [id]
  );

  if (propiedadRows.length === 0) {
    throw new NotFoundError('Propiedad no encontrada');
  }

  // Si esta imagen va a ser principal, quitar principal de las demás
  if (validatedData.principal) {
    await pool.execute(
      'UPDATE imagenes_propiedad SET principal = 0 WHERE propiedad_id = ?',
      [id]
    );
  }

  // Agregar imagen
  const [result] = await pool.execute(
    'INSERT INTO imagenes_propiedad (propiedad_id, url, principal) VALUES (?, ?, ?)',
    [id, validatedData.url, validatedData.principal]
  );

  const imagenId = (result as any).insertId;

  // Obtener imagen creada
  const [newImagenRows] = await pool.execute<ImagenPropiedadRow[]>(
    'SELECT id, url, principal, creado_el FROM imagenes_propiedad WHERE id = ?',
    [imagenId]
  );

  const nuevaImagen = newImagenRows[0];

  // Auditoría
  await auditAction(
    req, 
    'CREATE', 
    'IMAGEN_PROPERTY', 
    imagenId, 
    { propiedad_id: id, ...validatedData }, 
    true, 
    'Imagen agregada a propiedad'
  );

  logger.info({ 
    propiedadId: id, 
    imagenId, 
    principal: validatedData.principal 
  }, 'Imagen agregada a propiedad');

  res.status(201).json({
    message: 'Imagen agregada exitosamente',
    data: nuevaImagen
  });
});

/**
 * DELETE /api/v1/propiedades/:id/imagenes/:imagenId
 * Eliminar imagen de una propiedad
 */
export const deleteImagenPropiedad = asyncHandler(async (req: Request, res: Response) => {
  const { id, imagenId } = req.params;

  // Verificar que la imagen existe y pertenece a la propiedad
  const [imagenRows] = await pool.execute<ImagenPropiedadRow[]>(
    'SELECT * FROM imagenes_propiedad WHERE id = ? AND propiedad_id = ?',
    [imagenId, id]
  );

  if (imagenRows.length === 0) {
    throw new NotFoundError('Imagen no encontrada');
  }

  const imagen = imagenRows[0];

  // Eliminar imagen
  await pool.execute(
    'DELETE FROM imagenes_propiedad WHERE id = ?',
    [imagenId]
  );

  // Auditoría
  await auditAction(
    req, 
    'DELETE', 
    'IMAGEN_PROPERTY', 
    Number(imagenId), 
    imagen, 
    true, 
    'Imagen eliminada de propiedad'
  );

  logger.info({ 
    propiedadId: id, 
    imagenId 
  }, 'Imagen eliminada de propiedad');

  res.json({
    message: 'Imagen eliminada exitosamente'
  });
});

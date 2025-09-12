import { pool } from '../config/db.js';
import { NotFoundError, ConflictError, BadRequestError, } from '../common/errors.js';
import { idSchema, } from '../common/validators.js';
import { createDbLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';
import { z } from 'zod';
const logger = createDbLogger();
const contratoCreateSchema = z.object({
    propiedad_id: z.number().int().positive('ID de propiedad inválido'),
    inquilino_id: z.number().int().positive('ID de inquilino inválido'),
    monto_mensual: z.number().positive('El monto mensual debe ser positivo'),
    fecha_inicio: z.string().date('Fecha de inicio inválida'),
    fecha_fin: z.string().date('Fecha de fin inválida'),
    deposito: z.number().min(0, 'El depósito no puede ser negativo').optional(),
    condiciones_especiales: z.string().max(1000, 'Las condiciones especiales no pueden exceder 1000 caracteres').optional()
});
const contratoUpdateSchema = z.object({
    monto_mensual: z.number().positive('El monto mensual debe ser positivo').optional(),
    fecha_fin: z.string().date('Fecha de fin inválida').optional(),
    deposito: z.number().min(0, 'El depósito no puede ser negativo').optional(),
    condiciones_especiales: z.string().max(1000, 'Las condiciones especiales no pueden exceder 1000 caracteres').optional()
});
const paginationSchema = z.object({
    page: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(1)).default('1'),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(1).max(100)).default('10')
});
const paramsIdSchema = z.object({
    id: z.string().transform(val => parseInt(val)).pipe(z.number().int().positive('ID debe ser un número positivo'))
});
export const getContratos = async (_req, res) => {
    try {
        const { page, limit } = paginationSchema.parse(req.query);
        const offset = (page - 1) * limit;
        const { estado, propiedad_id, inquilino_id, fecha_desde, fecha_hasta } = req.query;
        const conditions = [];
        const params = [];
        if (estado) {
            conditions.push('c.estado = ?');
            params.push(estado);
        }
        if (propiedad_id) {
            conditions.push('c.propiedad_id = ?');
            params.push(propiedad_id);
        }
        if (inquilino_id) {
            conditions.push('c.inquilino_id = ?');
            params.push(inquilino_id);
        }
        if (fecha_desde) {
            conditions.push('c.fecha_inicio >= ?');
            params.push(fecha_desde);
        }
        if (fecha_hasta) {
            conditions.push('c.fecha_fin <= ?');
            params.push(fecha_hasta);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const [countRows] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM contratos c
      ${whereClause}
    `, params);
        const total = countRows[0].total;
        const [contratos] = await pool.execute(`
      SELECT 
        c.id, c.propiedad_id, c.inquilino_id, c.monto_mensual,
        c.fecha_inicio, c.fecha_fin, c.deposito, c.condiciones_especiales,
        c.estado, c.creado_el, c.actualizado_el,
        p.direccion as propiedad_direccion,
        i.nombre_completo as inquilino_nombre
      FROM contratos c
      LEFT JOIN propiedades p ON c.propiedad_id = p.id
      LEFT JOIN inquilinos i ON c.inquilino_id = i.id
      ${whereClause}
      ORDER BY c.creado_el DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
        await auditAction(req, 'READ', 'contratos', null, {
            filters: req.query,
            total_results: total
        });
        res.json({
            data: contratos,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        });
        logger.info('Contratos listados exitosamente', {
            total,
            page,
            filters: req.query
        });
    }
    catch (error) {
        logger.error('Error al listar contratos', { error });
        throw error;
    }
};
export const getContratoById = asyncHandler(async (req, res) => {
    try {
        const { id } = paramsIdSchema.parse(req.params);
        const [rows] = await pool.execute(`
      SELECT 
        c.id, c.propiedad_id, c.inquilino_id, c.monto_mensual,
        c.fecha_inicio, c.fecha_fin, c.deposito, c.condiciones_especiales,
        c.estado, c.creado_el, c.actualizado_el,
        p.direccion as propiedad_direccion, p.tipo as propiedad_tipo,
        i.nombre_completo as inquilino_nombre, i.telefono as inquilino_telefono,
        i.correo as inquilino_correo
      FROM contratos c
      LEFT JOIN propiedades p ON c.propiedad_id = p.id
      LEFT JOIN inquilinos i ON c.inquilino_id = i.id
      WHERE c.id = ?
    `, [id]);
        const contrato = rows[0];
        if (!contrato) {
            throw new NotFoundError('Contrato no encontrado');
        }
        await auditAction(req, 'READ', 'contratos', id);
        res.json({
            data: contrato
        });
        logger.info('Contrato obtenido exitosamente', { contrato_id: id });
    }
    catch (error) {
        logger.error('Error al obtener contrato', {
            contrato_id: req.params.id,
            error
        });
        throw error;
    }
});
export const createContrato = asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const contratoData = contratoCreateSchema.parse(req.body);
        if (new Date(contratoData.fecha_inicio) >= new Date(contratoData.fecha_fin)) {
            throw new BadRequestError('La fecha de inicio debe ser anterior a la fecha de fin');
        }
        const [propiedadRows] = await connection.execute('SELECT id, estado FROM propiedades WHERE id = ?', [contratoData.propiedad_id]);
        const propiedad = propiedadRows[0];
        if (!propiedad) {
            throw new NotFoundError('Propiedad no encontrada');
        }
        if (propiedad.estado !== 'DISPONIBLE') {
            throw new ConflictError('La propiedad no está disponible para alquiler');
        }
        const [inquilinoRows] = await connection.execute('SELECT id, activo FROM inquilinos WHERE id = ?', [contratoData.inquilino_id]);
        const inquilino = inquilinoRows[0];
        if (!inquilino) {
            throw new NotFoundError('Inquilino no encontrado');
        }
        if (!inquilino.activo) {
            throw new ConflictError('El inquilino no está activo');
        }
        const [contratosActivos] = await connection.execute('SELECT id FROM contratos WHERE propiedad_id = ? AND estado = "ACTIVO"', [contratoData.propiedad_id]);
        if (contratosActivos.length > 0) {
            throw new ConflictError('Ya existe un contrato activo para esta propiedad');
        }
        const [result] = await connection.execute(`
      INSERT INTO contratos (
        propiedad_id, inquilino_id, monto_mensual, fecha_inicio, fecha_fin,
        deposito, condiciones_especiales, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVO')
    `, [
            contratoData.propiedad_id,
            contratoData.inquilino_id,
            contratoData.monto_mensual,
            contratoData.fecha_inicio,
            contratoData.fecha_fin,
            contratoData.deposito || 0,
            contratoData.condiciones_especiales || null
        ]);
        const contratoId = result.insertId;
        await connection.execute('UPDATE propiedades SET estado = "OCUPADA" WHERE id = ?', [contratoData.propiedad_id]);
        await connection.commit();
        await auditAction(req, 'CREATE', 'contratos', contratoId, contratoData);
        res.status(201).json({
            message: 'Contrato creado exitosamente',
            data: { id: contratoId }
        });
        logger.info('Contrato creado exitosamente', {
            contrato_id: contratoId,
            propiedad_id: contratoData.propiedad_id,
            inquilino_id: contratoData.inquilino_id
        });
    }
    catch (error) {
        await connection.rollback();
        logger.error('Error al crear contrato', {
            contrato_data: req.body,
            error
        });
        throw error;
    }
    finally {
        connection.release();
    }
});
export const updateContrato = asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = idSchema.parse(req.params);
        const updateData = contratoUpdateSchema.parse(req.body);
        const [contratoRows] = await connection.execute('SELECT * FROM contratos WHERE id = ?', [id]);
        const contrato = contratoRows[0];
        if (!contrato) {
            throw new NotFoundError('Contrato no encontrado');
        }
        if (contrato.estado !== 'ACTIVO') {
            throw new BadRequestError('Solo se pueden actualizar contratos activos');
        }
        if (updateData.fecha_fin) {
            if (new Date(updateData.fecha_fin) <= new Date(contrato.fecha_inicio)) {
                throw new BadRequestError('La fecha de fin debe ser posterior a la fecha de inicio');
            }
        }
        const updateFields = [];
        const updateParams = [];
        if (updateData.monto_mensual !== undefined) {
            updateFields.push('monto_mensual = ?');
            updateParams.push(updateData.monto_mensual);
        }
        if (updateData.fecha_fin !== undefined) {
            updateFields.push('fecha_fin = ?');
            updateParams.push(updateData.fecha_fin);
        }
        if (updateData.deposito !== undefined) {
            updateFields.push('deposito = ?');
            updateParams.push(updateData.deposito);
        }
        if (updateData.condiciones_especiales !== undefined) {
            updateFields.push('condiciones_especiales = ?');
            updateParams.push(updateData.condiciones_especiales);
        }
        if (updateFields.length === 0) {
            throw new BadRequestError('No se proporcionaron campos para actualizar');
        }
        updateFields.push('actualizado_el = NOW()');
        updateParams.push(id);
        await connection.execute(`
      UPDATE contratos 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateParams);
        await connection.commit();
        await auditAction(req, 'UPDATE', 'contratos', id, updateData);
        res.json({
            message: 'Contrato actualizado exitosamente'
        });
        logger.info('Contrato actualizado exitosamente', {
            contrato_id: id,
            updated_fields: Object.keys(updateData)
        });
    }
    catch (error) {
        await connection.rollback();
        logger.error('Error al actualizar contrato', {
            contrato_id: req.params.id,
            update_data: req.body,
            error
        });
        throw error;
    }
    finally {
        connection.release();
    }
});
export const finalizarContrato = asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = idSchema.parse(req.params);
        const { fecha_finalizacion, motivo } = req.body;
        const [contratoRows] = await connection.execute('SELECT * FROM contratos WHERE id = ?', [id]);
        const contrato = contratoRows[0];
        if (!contrato) {
            throw new NotFoundError('Contrato no encontrado');
        }
        if (contrato.estado !== 'ACTIVO') {
            throw new BadRequestError('Solo se pueden finalizar contratos activos');
        }
        const fechaFinalizacion = fecha_finalizacion ? new Date(fecha_finalizacion) : new Date();
        if (fechaFinalizacion < new Date(contrato.fecha_inicio)) {
            throw new BadRequestError('La fecha de finalización no puede ser anterior al inicio del contrato');
        }
        await connection.execute(`
      UPDATE contratos 
      SET estado = 'FINALIZADO', actualizado_el = NOW()
      WHERE id = ?
    `, [id]);
        await connection.execute('UPDATE propiedades SET estado = "DISPONIBLE" WHERE id = ?', [contrato.propiedad_id]);
        await connection.commit();
        await auditAction(req, 'FINALIZE', 'contratos', id, {
            fecha_finalizacion: fechaFinalizacion,
            motivo
        });
        res.json({
            message: 'Contrato finalizado exitosamente'
        });
        logger.info('Contrato finalizado exitosamente', {
            contrato_id: id,
            fecha_finalizacion: fechaFinalizacion,
            motivo
        });
    }
    catch (error) {
        await connection.rollback();
        logger.error('Error al finalizar contrato', {
            contrato_id: req.params.id,
            error
        });
        throw error;
    }
    finally {
        connection.release();
    }
});
export const renovarContrato = asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = idSchema.parse(req.params);
        const { nueva_fecha_fin, nuevo_monto } = req.body;
        if (!nueva_fecha_fin) {
            throw new BadRequestError('La nueva fecha de fin es requerida');
        }
        const [contratoRows] = await connection.execute('SELECT * FROM contratos WHERE id = ?', [id]);
        const contrato = contratoRows[0];
        if (!contrato) {
            throw new NotFoundError('Contrato no encontrado');
        }
        if (contrato.estado !== 'ACTIVO') {
            throw new BadRequestError('Solo se pueden renovar contratos activos');
        }
        if (new Date(nueva_fecha_fin) <= new Date(contrato.fecha_fin)) {
            throw new BadRequestError('La nueva fecha de fin debe ser posterior a la fecha actual de finalización');
        }
        const updateFields = ['fecha_fin = ?', 'actualizado_el = NOW()'];
        const updateParams = [nueva_fecha_fin];
        if (nuevo_monto !== undefined) {
            updateFields.push('monto_mensual = ?');
            updateParams.push(nuevo_monto);
        }
        updateParams.push(id);
        await connection.execute(`
      UPDATE contratos 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateParams);
        await connection.commit();
        await auditAction(req, 'RENEW', 'contratos', id, {
            nueva_fecha_fin,
            nuevo_monto
        });
        res.json({
            message: 'Contrato renovado exitosamente'
        });
        logger.info('Contrato renovado exitosamente', {
            contrato_id: id,
            nueva_fecha_fin,
            nuevo_monto
        });
    }
    catch (error) {
        await connection.rollback();
        logger.error('Error al renovar contrato', {
            contrato_id: req.params.id,
            error
        });
        throw error;
    }
    finally {
        connection.release();
    }
});
export const getFacturasContrato = asyncHandler(async (req, res) => {
    try {
        const { id } = idSchema.parse(req.params);
        const [contratoRows] = await pool.execute('SELECT id FROM contratos WHERE id = ?', [id]);
        if (contratoRows.length === 0) {
            throw new NotFoundError('Contrato no encontrado');
        }
        const [facturas] = await pool.execute(`
      SELECT 
        id, contrato_id, numero_factura, fecha_emision, fecha_vencimiento,
        monto_total, saldo_pendiente, estado, creado_el
      FROM facturas 
      WHERE contrato_id = ?
      ORDER BY fecha_emision DESC
    `, [id]);
        await auditAction(req, 'READ', 'facturas', null, { contrato_id: id });
        res.json({
            data: facturas,
            message: `Facturas del contrato ${id}`
        });
        logger.info('Facturas de contrato obtenidas exitosamente', {
            contrato_id: id,
            total_facturas: facturas.length
        });
    }
    catch (error) {
        logger.error('Error al obtener facturas del contrato', {
            contrato_id: req.params.id,
            error
        });
        throw error;
    }
});
export const deleteContrato = asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = idSchema.parse(req.params);
        const [contratoRows] = await connection.execute('SELECT * FROM contratos WHERE id = ?', [id]);
        const contrato = contratoRows[0];
        if (!contrato) {
            throw new NotFoundError('Contrato no encontrado');
        }
        const [facturasRows] = await connection.execute('SELECT COUNT(*) as total FROM facturas WHERE contrato_id = ?', [id]);
        const totalFacturas = facturasRows[0].total;
        if (totalFacturas > 0) {
            throw new ConflictError('No se puede eliminar un contrato que tiene facturas asociadas');
        }
        if (contrato.estado === 'ACTIVO') {
            await connection.execute('UPDATE propiedades SET estado = "DISPONIBLE" WHERE id = ?', [contrato.propiedad_id]);
        }
        await connection.execute('DELETE FROM contratos WHERE id = ?', [id]);
        await connection.commit();
        await auditAction(req, 'DELETE', 'contratos', id);
        res.json({
            message: 'Contrato eliminado exitosamente'
        });
        logger.info('Contrato eliminado exitosamente', { contrato_id: id });
    }
    catch (error) {
        await connection.rollback();
        logger.error('Error al eliminar contrato', {
            contrato_id: req.params.id,
            error
        });
        throw error;
    }
    finally {
        connection.release();
    }
});
//# sourceMappingURL=contratosController_backup.js.map
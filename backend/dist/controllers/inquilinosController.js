import { pool } from '../config/db.js';
import { NotFoundError, ConflictError, BadRequestError } from '../common/errors.js';
import { inquilinoCreateSchema, inquilinoUpdateSchema, paginationSchema, idSchema } from '../common/validators.js';
import { createBusinessLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';
const logger = createBusinessLogger('inquilinos');
export const getInquilinos = asyncHandler(async (req, res) => {
    const { page, limit } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;
    const { search, activo } = req.query;
    const conditions = [];
    const params = [];
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
    const [countRows] = await pool.execute(`SELECT COUNT(*) as total FROM inquilinos ${whereClause}`, params);
    const total = countRows[0].total;
    const [inquilinos] = await pool.execute(`SELECT 
       id, doc_identidad, nombre_completo, telefono, correo, 
       direccion, activo, creado_el, actualizado_el
     FROM inquilinos 
     ${whereClause}
     ORDER BY nombre_completo ASC
     LIMIT ? OFFSET ?`, [...params, limit, offset]);
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
export const getInquilino = asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const [inquilinos] = await pool.execute(`SELECT 
       id, doc_identidad, nombre_completo, telefono, correo, 
       direccion, activo, creado_el, actualizado_el
     FROM inquilinos 
     WHERE id = ?`, [id]);
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
export const createInquilino = asyncHandler(async (req, res) => {
    const inquilinoData = inquilinoCreateSchema.parse(req.body);
    if (inquilinoData.doc_identidad) {
        const [existingDocs] = await pool.execute('SELECT id FROM inquilinos WHERE doc_identidad = ?', [inquilinoData.doc_identidad]);
        if (existingDocs.length > 0) {
            throw new ConflictError('Ya existe un inquilino con ese documento de identidad');
        }
    }
    if (inquilinoData.correo) {
        const [existingEmails] = await pool.execute('SELECT id FROM inquilinos WHERE correo = ?', [inquilinoData.correo]);
        if (existingEmails.length > 0) {
            throw new ConflictError('Ya existe un inquilino con ese correo electrónico');
        }
    }
    const [result] = await pool.execute(`INSERT INTO inquilinos (
       doc_identidad, nombre_completo, telefono, correo, direccion, 
       activo, creado_el, actualizado_el
     ) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`, [
        inquilinoData.doc_identidad || null,
        inquilinoData.nombre_completo,
        inquilinoData.telefono || null,
        inquilinoData.correo || null,
        inquilinoData.direccion || null,
    ]);
    const inquilinoId = result.insertId;
    await auditAction(req, 'CREATE', 'INQUILINO', inquilinoId, inquilinoData, true);
    logger.info({
        inquilinoId,
        nombre: inquilinoData.nombre_completo
    }, 'Inquilino creado exitosamente');
    const [newInquilino] = await pool.execute(`SELECT 
       id, doc_identidad, nombre_completo, telefono, correo, 
       direccion, activo, creado_el, actualizado_el
     FROM inquilinos 
     WHERE id = ?`, [inquilinoId]);
    res.status(201).json({
        message: 'Inquilino creado exitosamente',
        data: {
            inquilino: newInquilino[0],
        },
    });
});
export const updateInquilino = asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const inquilinoData = inquilinoUpdateSchema.parse(req.body);
    const [existingInquilinos] = await pool.execute('SELECT * FROM inquilinos WHERE id = ?', [id]);
    if (existingInquilinos.length === 0) {
        throw new NotFoundError('Inquilino no encontrado');
    }
    const existingInquilino = existingInquilinos[0];
    if (inquilinoData.doc_identidad && inquilinoData.doc_identidad !== existingInquilino.doc_identidad) {
        const [existingDocs] = await pool.execute('SELECT id FROM inquilinos WHERE doc_identidad = ? AND id != ?', [inquilinoData.doc_identidad, id]);
        if (existingDocs.length > 0) {
            throw new ConflictError('Ya existe un inquilino con ese documento de identidad');
        }
    }
    if (inquilinoData.correo && inquilinoData.correo !== existingInquilino.correo) {
        const [existingEmails] = await pool.execute('SELECT id FROM inquilinos WHERE correo = ? AND id != ?', [inquilinoData.correo, id]);
        if (existingEmails.length > 0) {
            throw new ConflictError('Ya existe un inquilino con ese correo electrónico');
        }
    }
    const updates = [];
    const params = [];
    Object.entries(inquilinoData).forEach(([key, value]) => {
        if (value !== undefined) {
            updates.push(`${key} = ?`);
            params.push(value);
        }
    });
    if (updates.length === 0) {
        throw new BadRequestError('No se proporcionaron datos para actualizar');
    }
    updates.push('actualizado_el = NOW()');
    params.push(id);
    await pool.execute(`UPDATE inquilinos SET ${updates.join(', ')} WHERE id = ?`, params);
    await auditAction(req, 'UPDATE', 'INQUILINO', id, {
        original: existingInquilino,
        changes: inquilinoData
    }, true);
    logger.info({
        inquilinoId: id,
        changes: inquilinoData
    }, 'Inquilino actualizado exitosamente');
    const [updatedInquilino] = await pool.execute(`SELECT 
       id, doc_identidad, nombre_completo, telefono, correo, 
       direccion, activo, creado_el, actualizado_el
     FROM inquilinos 
     WHERE id = ?`, [id]);
    res.json({
        message: 'Inquilino actualizado exitosamente',
        data: {
            inquilino: updatedInquilino[0],
        },
    });
});
export const deleteInquilino = asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const [existingInquilinos] = await pool.execute('SELECT * FROM inquilinos WHERE id = ?', [id]);
    if (existingInquilinos.length === 0) {
        throw new NotFoundError('Inquilino no encontrado');
    }
    const [activeContracts] = await pool.execute('SELECT COUNT(*) as count FROM contratos WHERE inquilino_id = ? AND estado = "ACTIVO"', [id]);
    if (activeContracts[0].count > 0) {
        throw new ConflictError('No se puede eliminar el inquilino porque tiene contratos activos');
    }
    await pool.execute('UPDATE inquilinos SET activo = 0, actualizado_el = NOW() WHERE id = ?', [id]);
    await auditAction(req, 'DELETE', 'INQUILINO', id, {
        inquilino: existingInquilinos[0]
    }, true);
    logger.info({ inquilinoId: id }, 'Inquilino eliminado exitosamente');
    res.json({
        message: 'Inquilino eliminado exitosamente',
    });
});
export const reactivateInquilino = asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const [existingInquilinos] = await pool.execute('SELECT * FROM inquilinos WHERE id = ?', [id]);
    if (existingInquilinos.length === 0) {
        throw new NotFoundError('Inquilino no encontrado');
    }
    const inquilino = existingInquilinos[0];
    if (inquilino.activo) {
        throw new BadRequestError('El inquilino ya está activo');
    }
    await pool.execute('UPDATE inquilinos SET activo = 1, actualizado_el = NOW() WHERE id = ?', [id]);
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
//# sourceMappingURL=inquilinosController.js.map
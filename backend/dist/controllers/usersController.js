import { pool } from '../config/db.js';
import { hashPassword } from '../auth/password.js';
import { NotFoundError, ConflictError, BadRequestError, } from '../common/errors.js';
import { idSchema, emailSchema, nameSchema, phoneSchema, passwordSchema, } from '../common/validators.js';
import { createDbLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';
import { z } from 'zod';
const logger = createDbLogger();
const createUserSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    nombres: nameSchema,
    apellidos: nameSchema,
    telefono: phoneSchema,
    roles: z.array(idSchema).min(1, 'Usuario debe tener al menos un rol'),
});
const updateUserSchema = z.object({
    email: emailSchema.optional(),
    nombres: nameSchema.optional(),
    apellidos: nameSchema.optional(),
    telefono: phoneSchema.optional(),
    roles: z.array(idSchema).min(1, 'Usuario debe tener al menos un rol').optional(),
});
const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().optional(),
    estado: z.enum(['ACTIVO', 'INACTIVO', 'BLOQUEADO']).optional(),
    role: z.string().optional(),
});
export const getUsers = asyncHandler(async (req, res) => {
    const { page, limit, search, estado, role } = paginationSchema.parse(req.query);
    const offset = (page - 1) * limit;
    let whereConditions = ['1=1'];
    let queryParams = [];
    if (search) {
        whereConditions.push('(u.nombres LIKE ? OR u.apellidos LIKE ? OR u.email LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
    }
    if (estado) {
        whereConditions.push('u.estado = ?');
        queryParams.push(estado);
    }
    if (role) {
        whereConditions.push('EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = u.id AND r.nombre = ?)');
        queryParams.push(role);
    }
    const whereClause = whereConditions.join(' AND ');
    const countQuery = `
    SELECT COUNT(DISTINCT u.id) as total
    FROM usuarios u
    WHERE ${whereClause}
  `;
    const dataQuery = `
    SELECT 
      u.id,
      u.email,
      u.nombres,
      u.apellidos,
      u.telefono,
      u.estado,
      u.ultimo_login,
      u.created_at,
      u.updated_at,
      GROUP_CONCAT(r.nombre) as roles
    FROM usuarios u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE ${whereClause}
    GROUP BY u.id, u.email, u.nombres, u.apellidos, u.telefono, u.estado, u.ultimo_login, u.created_at, u.updated_at
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `;
    const [countResult] = await pool.execute(countQuery, queryParams);
    const total = countResult[0].total;
    const [users] = await pool.execute(dataQuery, [...queryParams, limit, offset]);
    const formattedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        nombres: user.nombres,
        apellidos: user.apellidos,
        telefono: user.telefono,
        estado: user.estado,
        ultimoLogin: user.ultimo_login,
        roles: user.roles ? user.roles.split(',') : [],
        createdAt: user.created_at,
        updatedAt: user.updated_at,
    }));
    const totalPages = Math.ceil(total / limit);
    logger.info({
        userId: req.user?.userId,
        total,
        page,
        filters: { search, estado, role },
    }, 'Usuarios listados');
    res.json({
        message: 'Usuarios obtenidos exitosamente',
        data: {
            users: formattedUsers,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        },
    });
});
export const createUser = asyncHandler(async (req, res) => {
    const userData = createUserSchema.parse(req.body);
    const [existingUsers] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [userData.email]);
    if (existingUsers.length > 0) {
        throw new ConflictError('El email ya está registrado');
    }
    const roleIds = userData.roles;
    const [roles] = await pool.execute(`SELECT id, nombre FROM roles WHERE id IN (${roleIds.map(() => '?').join(',')})`, roleIds);
    if (roles.length !== roleIds.length) {
        throw new BadRequestError('Uno o más roles especificados no existen');
    }
    const hashedPassword = await hashPassword(userData.password);
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
        const [userResult] = await connection.execute(`INSERT INTO usuarios (email, password, nombres, apellidos, telefono, estado, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'ACTIVO', NOW(), NOW())`, [
            userData.email,
            hashedPassword,
            userData.nombres,
            userData.apellidos,
            userData.telefono || null,
        ]);
        const userId = userResult.insertId;
        for (const roleId of roleIds) {
            await connection.execute('INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, NOW())', [userId, roleId]);
        }
        await connection.commit();
        await auditAction(req, 'CREATE', 'USER', userId, {
            email: userData.email,
            nombres: userData.nombres,
            roles: roles.map(r => r.nombre),
        }, true);
        logger.info({
            userId: req.user?.userId,
            createdUserId: userId,
            email: userData.email,
            roles: roles.map(r => r.nombre),
        }, 'Usuario creado exitosamente');
        res.status(201).json({
            message: 'Usuario creado exitosamente',
            data: {
                user: {
                    id: userId,
                    email: userData.email,
                    nombres: userData.nombres,
                    apellidos: userData.apellidos,
                    telefono: userData.telefono,
                    estado: 'ACTIVO',
                    roles: roles.map(r => r.nombre),
                },
            },
        });
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
});
export const getUser = asyncHandler(async (req, res) => {
    const userId = idSchema.parse(req.params.id);
    const [users] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [userId]);
    if (users.length === 0) {
        throw new NotFoundError('Usuario no encontrado');
    }
    const user = users[0];
    const [userRoles] = await pool.execute(`SELECT r.id as role_id, r.nombre as role_name
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = ?`, [userId]);
    res.json({
        message: 'Usuario obtenido exitosamente',
        data: {
            user: {
                id: user.id,
                email: user.email,
                nombres: user.nombres,
                apellidos: user.apellidos,
                telefono: user.telefono,
                estado: user.estado,
                ultimoLogin: user.ultimo_login,
                roles: userRoles.map(ur => ({
                    id: ur.role_id,
                    nombre: ur.role_name,
                })),
                createdAt: user.created_at,
                updatedAt: user.updated_at,
            },
        },
    });
});
export const updateUser = asyncHandler(async (req, res) => {
    const userId = idSchema.parse(req.params.id);
    const userData = updateUserSchema.parse(req.body);
    const [users] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [userId]);
    if (users.length === 0) {
        throw new NotFoundError('Usuario no encontrado');
    }
    const currentUser = users[0];
    if (userData.email && userData.email !== currentUser.email) {
        const [existingUsers] = await pool.execute('SELECT id FROM usuarios WHERE email = ? AND id != ?', [userData.email, userId]);
        if (existingUsers.length > 0) {
            throw new ConflictError('El email ya está en uso por otro usuario');
        }
    }
    let roleNames = [];
    if (userData.roles) {
        const [roles] = await pool.execute(`SELECT id, nombre FROM roles WHERE id IN (${userData.roles.map(() => '?').join(',')})`, userData.roles);
        if (roles.length !== userData.roles.length) {
            throw new BadRequestError('Uno o más roles especificados no existen');
        }
        roleNames = roles.map(r => r.nombre);
    }
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
        const updateFields = [];
        const updateValues = [];
        if (userData.email) {
            updateFields.push('email = ?');
            updateValues.push(userData.email);
        }
        if (userData.nombres) {
            updateFields.push('nombres = ?');
            updateValues.push(userData.nombres);
        }
        if (userData.apellidos) {
            updateFields.push('apellidos = ?');
            updateValues.push(userData.apellidos);
        }
        if (userData.telefono !== undefined) {
            updateFields.push('telefono = ?');
            updateValues.push(userData.telefono || null);
        }
        if (updateFields.length > 0) {
            updateFields.push('updated_at = NOW()');
            updateValues.push(userId);
            await connection.execute(`UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);
        }
        if (userData.roles) {
            await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [userId]);
            for (const roleId of userData.roles) {
                await connection.execute('INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, NOW())', [userId, roleId]);
            }
        }
        await connection.commit();
        await auditAction(req, 'UPDATE', 'USER', userId, {
            changes: userData,
            newRoles: roleNames,
        }, true);
        logger.info({
            userId: req.user?.userId,
            updatedUserId: userId,
            changes: userData,
        }, 'Usuario actualizado exitosamente');
        res.json({
            message: 'Usuario actualizado exitosamente',
            data: {
                userId,
                changes: Object.keys(userData),
            },
        });
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
});
export const changeUserStatus = asyncHandler(async (req, res) => {
    const userId = idSchema.parse(req.params.id);
    const { estado } = z.object({
        estado: z.enum(['ACTIVO', 'INACTIVO', 'BLOQUEADO']),
    }).parse(req.body);
    const [users] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [userId]);
    if (users.length === 0) {
        throw new NotFoundError('Usuario no encontrado');
    }
    const currentUser = users[0];
    if (req.user?.userId === userId && estado !== 'ACTIVO') {
        throw new BadRequestError('No puedes desactivar tu propia cuenta');
    }
    await pool.execute('UPDATE usuarios SET estado = ?, updated_at = NOW() WHERE id = ?', [estado, userId]);
    await auditAction(req, 'UPDATE', 'USER', userId, {
        estadoAnterior: currentUser.estado,
        estadoNuevo: estado,
    }, true);
    logger.info({
        userId: req.user?.userId,
        targetUserId: userId,
        estadoAnterior: currentUser.estado,
        estadoNuevo: estado,
    }, 'Estado de usuario cambiado');
    res.json({
        message: 'Estado de usuario actualizado exitosamente',
        data: {
            userId,
            estadoAnterior: currentUser.estado,
            estadoNuevo: estado,
        },
    });
});
export const deleteUser = asyncHandler(async (req, res) => {
    const userId = idSchema.parse(req.params.id);
    const [users] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [userId]);
    if (users.length === 0) {
        throw new NotFoundError('Usuario no encontrado');
    }
    if (req.user?.userId === userId) {
        throw new BadRequestError('No puedes eliminar tu propia cuenta');
    }
    await pool.execute('UPDATE usuarios SET estado = ?, updated_at = NOW() WHERE id = ?', ['INACTIVO', userId]);
    await auditAction(req, 'DELETE', 'USER', userId, {
        email: users[0].email,
        nombres: users[0].nombres,
    }, true);
    logger.info({
        userId: req.user?.userId,
        deletedUserId: userId,
        email: users[0].email,
    }, 'Usuario eliminado (soft delete)');
    res.json({
        message: 'Usuario eliminado exitosamente',
        data: {
            userId,
        },
    });
});
export default {
    getUsers,
    createUser,
    getUser,
    updateUser,
    changeUserStatus,
    deleteUser,
};
//# sourceMappingURL=usersController.js.map
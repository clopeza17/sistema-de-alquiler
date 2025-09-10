import { pool } from '../config/db.js';
import { generateToken, verifyToken } from '../auth/jwt.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { UnauthorizedError, NotFoundError, ConflictError } from '../common/errors.js';
import { loginSchema, registerSchema, refreshTokenSchema } from '../common/validators.js';
import { createAuthLogger } from '../config/logger.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { auditAction } from '../middlewares/audit.js';
const logger = createAuthLogger();
export const login = asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    logger.info({ email }, 'Intento de login');
    const [userRows] = await pool.execute('SELECT * FROM usuarios WHERE correo = ? AND activo = 1', [email]);
    if (userRows.length === 0) {
        await auditAction(req, 'LOGIN', 'SESSION', undefined, { email }, false, 'Usuario no encontrado');
        throw new UnauthorizedError('Credenciales inválidas');
    }
    const user = userRows[0];
    const isPasswordValid = await verifyPassword(password, user.contrasena_hash);
    if (!isPasswordValid) {
        await auditAction(req, 'LOGIN', 'SESSION', user.id, { email }, false, 'Contraseña incorrecta');
        throw new UnauthorizedError('Credenciales inválidas');
    }
    const [roleRows] = await pool.execute(`SELECT r.nombre 
     FROM usuarios_roles ur 
     JOIN roles r ON ur.rol_id = r.id 
     WHERE ur.usuario_id = ?`, [user.id]);
    const roles = roleRows.map(row => row.nombre);
    const accessToken = generateToken({
        userId: user.id,
        email: user.correo,
        roles,
    });
    const refreshToken = generateToken({
        userId: user.id,
        type: 'refresh',
    }, '7d');
    await pool.execute('UPDATE usuarios SET ultimo_acceso_el = NOW() WHERE id = ?', [user.id]);
    await auditAction(req, 'LOGIN', 'SESSION', user.id, { email, roles }, true);
    logger.info({
        userId: user.id,
        email: user.correo,
        roles
    }, 'Login exitoso');
    res.json({
        message: 'Login exitoso',
        data: {
            user: {
                id: user.id,
                email: user.correo,
                nombre: user.nombre_completo,
                roles,
                ultimoLogin: new Date(),
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: '1h',
            },
        },
    });
});
export const refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    try {
        const payload = verifyToken(refreshToken);
        if (payload.type !== 'refresh') {
            throw new UnauthorizedError('Token de refresh inválido');
        }
        const [userRows] = await pool.execute('SELECT * FROM usuarios WHERE id = ? AND activo = 1', [payload.userId]);
        if (userRows.length === 0) {
            throw new UnauthorizedError('Usuario no encontrado o inactivo');
        }
        const user = userRows[0];
        const [roleRows] = await pool.execute(`SELECT r.nombre 
       FROM usuarios_roles ur 
       JOIN roles r ON ur.rol_id = r.id 
       WHERE ur.usuario_id = ?`, [user.id]);
        const roles = roleRows.map(row => row.nombre);
        const newAccessToken = generateToken({
            userId: user.id,
            email: user.correo,
            roles,
        });
        logger.info({ userId: user.id }, 'Token renovado exitosamente');
        res.json({
            message: 'Token renovado exitosamente',
            data: {
                accessToken: newAccessToken,
                expiresIn: '1h',
            },
        });
    }
    catch (error) {
        logger.warn({ error: error instanceof Error ? error.message : 'Error desconocido' }, 'Error renovando token');
        throw new UnauthorizedError('Token de refresh inválido o expirado');
    }
});
export const logout = asyncHandler(async (req, res) => {
    const userId = req.user?.userId;
    if (userId) {
        await auditAction(req, 'LOGOUT', 'SESSION', userId, {}, true);
        logger.info({ userId }, 'Logout exitoso');
    }
    res.json({
        message: 'Logout exitoso'
    });
});
export const register = asyncHandler(async (req, res) => {
    const userData = registerSchema.parse(req.body);
    const [existingUsers] = await pool.execute('SELECT id FROM usuarios WHERE correo = ?', [userData.email]);
    if (existingUsers.length > 0) {
        throw new ConflictError('El email ya está registrado');
    }
    const hashedPassword = await hashPassword(userData.password);
    const [result] = await pool.execute(`INSERT INTO usuarios (correo, contrasena_hash, nombre_completo, activo, created_at, updated_at)
     VALUES (?, ?, ?, 1, NOW(), NOW())`, [
        userData.email,
        hashedPassword,
        `${userData.nombres} ${userData.apellidos}`,
    ]);
    const userId = result.insertId;
    const [roleRows] = await pool.execute('SELECT id FROM roles WHERE codigo = ?', ['INQUILINO']);
    if (roleRows.length > 0) {
        await pool.execute('INSERT INTO usuarios_roles (usuario_id, rol_id, created_at) VALUES (?, ?, NOW())', [userId, roleRows[0].id]);
    }
    await auditAction(req, 'CREATE', 'USER', userId, {
        email: userData.email,
        nombres: userData.nombres
    }, true);
    logger.info({
        userId,
        email: userData.email
    }, 'Usuario registrado exitosamente');
    res.status(201).json({
        message: 'Usuario registrado exitosamente',
        data: {
            user: {
                id: userId,
                email: userData.email,
                nombre: `${userData.nombres} ${userData.apellidos}`,
                roles: ['INQUILINO'],
            },
        },
    });
});
export const getProfile = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const [userRows] = await pool.execute('SELECT id, correo, nombre_completo, activo, ultimo_acceso_el FROM usuarios WHERE id = ?', [userId]);
    if (userRows.length === 0) {
        throw new NotFoundError('Usuario no encontrado');
    }
    const user = userRows[0];
    const [roleRows] = await pool.execute(`SELECT r.nombre 
     FROM usuarios_roles ur 
     JOIN roles r ON ur.rol_id = r.id 
     WHERE ur.usuario_id = ?`, [userId]);
    const roles = roleRows.map(row => row.nombre);
    res.json({
        message: 'Perfil obtenido exitosamente',
        data: {
            user: {
                id: user.id,
                email: user.correo,
                nombre: user.nombre_completo,
                activo: user.activo,
                roles,
                ultimoLogin: user.ultimo_acceso_el,
            },
        },
    });
});
export default {
    login,
    refresh,
    logout,
    register,
    getProfile,
};
//# sourceMappingURL=authController.js.map
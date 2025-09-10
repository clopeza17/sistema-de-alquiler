import express from 'express';
import {
  login,
  refresh,
  logout,
  register,
  getProfile,
} from '../controllers/authController.js';
import { 
  requireAuth,
  addUserContext,
} from '../auth/middlewareAuth.js';
import { auditAuth } from '../middlewares/audit.js';
import { authRateLimit } from '../middlewares/security.js';

const router = express.Router();

/**
 * POST /auth/login
 * Iniciar sesión
 */
router.post('/login', 
  authRateLimit,                    // Rate limiting específico para auth
  auditAuth('LOGIN'),               // Auditoría específica para login
  login
);

/**
 * POST /auth/refresh
 * Renovar token de acceso
 */
router.post('/refresh', 
  authRateLimit,                    // Rate limiting específico para auth
  refresh
);

/**
 * POST /auth/logout
 * Cerrar sesión
 */
router.post('/logout', 
  requireAuth,                      // Requiere estar autenticado
  addUserContext,                   // Agregar contexto de usuario
  auditAuth('LOGOUT'),              // Auditoría específica para logout
  logout
);

/**
 * POST /auth/register
 * Registrar nuevo usuario
 * Nota: En producción, esto podría requerir permisos de admin
 */
router.post('/register', 
  authRateLimit,                    // Rate limiting específico para auth
  register
);

/**
 * GET /auth/me
 * Obtener perfil del usuario autenticado
 */
router.get('/me', 
  requireAuth,                      // Requiere estar autenticado
  addUserContext,                   // Agregar contexto de usuario
  getProfile
);

export default router;

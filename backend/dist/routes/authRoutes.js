import express from 'express';
import { login, refresh, logout, register, getProfile, } from '../controllers/authController.js';
import { requireAuth, addUserContext, } from '../auth/middlewareAuth.js';
import { auditAuth } from '../middlewares/audit.js';
import { authRateLimit } from '../middlewares/security.js';
const router = express.Router();
router.post('/login', authRateLimit, auditAuth('LOGIN'), login);
router.post('/refresh', authRateLimit, refresh);
router.post('/logout', requireAuth, addUserContext, auditAuth('LOGOUT'), logout);
router.post('/register', authRateLimit, register);
router.get('/me', requireAuth, addUserContext, getProfile);
export default router;
//# sourceMappingURL=authRoutes.js.map
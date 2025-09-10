import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { corsOptions, generalRateLimit, helmetConfig, sanitizeInput, securityLogger, ipBlocker, } from './middlewares/security.js';
import { errorHandler, notFoundHandler, requestLogger, } from './middlewares/errorHandler.js';
import { auditMiddleware } from './middlewares/audit.js';
import authRoutes from './routes/authRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
const app = express();
app.use(ipBlocker);
app.use(securityLogger);
app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(generalRateLimit);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);
app.use(requestLogger);
app.use(auditMiddleware);
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        version: '1.0.0',
        uptime: process.uptime(),
    });
});
app.get('/', (_req, res) => {
    res.json({
        message: 'Sistema de Gestión de Alquiler - API',
        version: '1.0.0',
        environment: env.NODE_ENV,
        documentation: '/api/v1/docs',
        health: '/health',
    });
});
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/usuarios', usersRoutes);
app.use('/api/v1', (_req, res, _next) => {
    res.status(404).json({
        error: {
            code: 'ENDPOINT_NOT_IMPLEMENTED',
            message: 'Endpoint en desarrollo'
        }
    });
});
app.use(notFoundHandler);
app.use(errorHandler);
export default app;
//# sourceMappingURL=app.js.map
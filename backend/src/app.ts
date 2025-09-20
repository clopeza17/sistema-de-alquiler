import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';

// Importar middlewares de seguridad
import {
  corsOptions,
  generalRateLimit,
  helmetConfig,
  sanitizeInput,
  securityLogger,
  ipBlocker,
} from './middlewares/security.js';

// Importar middlewares de manejo de errores
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
} from './middlewares/errorHandler.js';

// Importar middleware de auditoría
import { auditMiddleware } from './middlewares/audit.js';

// Importar rutas
import authRoutes from './routes/authRoutes.js';
import usersRoutes from './routes/usersRoutes.js';
import contratosRoutes from './routes/contratosRoutes.js';
import inquilinosRoutes from './routes/inquilinosRoutes.js';
import propiedadesRoutes from './routes/propiedadesRoutes.js';
import facturacionRoutes from './routes/facturacionRoutes.js';
import facturasRoutes from './routes/facturasRoutes.js';
import pagosRoutes from './routes/pagosRoutes.js';
import reportesRoutes from './routes/reportesRoutes.js';

// Crear aplicación Express
const app = express();

// ========== MIDDLEWARES DE SEGURIDAD (orden importante) ==========

// 1. Bloqueo de IPs (primero)
app.use(ipBlocker);

// 2. Logging de seguridad
app.use(securityLogger);

// 3. Headers de seguridad
app.use(helmetConfig);

// 4. CORS
app.use(cors(corsOptions));

// 5. Rate limiting general
app.use(generalRateLimit);

// 6. Parsers de body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 7. Sanitización de entrada
app.use(sanitizeInput);

// 8. Logging de requests
app.use(requestLogger);

// 9. Auditoría de acciones
app.use(auditMiddleware);

// ========== RUTAS ==========

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Sistema de Gestión de Alquiler - API',
    version: '1.0.0',
    environment: env.NODE_ENV,
    documentation: '/api/v1/docs',
    health: '/health',
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/usuarios', usersRoutes);
app.use('/api/v1/contratos', contratosRoutes);
app.use('/api/v1/inquilinos', inquilinosRoutes);
app.use('/api/v1/propiedades', propiedadesRoutes);
app.use('/api/v1/facturacion', facturacionRoutes);
app.use('/api/v1/facturas', facturasRoutes);
app.use('/api/v1/pagos', pagosRoutes);
app.use('/api/v1/reportes', reportesRoutes);

// API routes prefix - TODO: agregar rutas de módulos
app.use('/api/v1', (_req, res, _next) => {
  res.status(404).json({
    error: {
      code: 'ENDPOINT_NOT_IMPLEMENTED',
      message: 'Endpoint en desarrollo'
    }
  });
});

// ========== MANEJO DE ERRORES (al final) ==========

// Manejar rutas no encontradas
app.use(notFoundHandler);

// Middleware global de manejo de errores
app.use(errorHandler);

export default app;

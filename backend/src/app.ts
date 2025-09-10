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

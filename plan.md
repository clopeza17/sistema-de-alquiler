# 📋 Plan de Implementación Detallado - Sistema de Alquiler

> **Stack**: React.js + Node.js/Express + MySQL | **Zona**: Guatemala (-06:00) | **Moneda**: GTQ | **Fechas**: dd/mm/aaaa

---

## 🏗️ **FASE 1: PREPARACIÓN E INFRAESTRUCTURA**

### 1.1 Configuración Base
- [x] ✅ Configurar Docker + MySQL (ARM64 optimizado)
- [x] ✅ Crear esquema de base de datos completo
- [x] ✅ Configurar variables de entorno (.env)
- [ ] 📋 Crear repositorio Git con estructura inicial
- [ ] 📋 Configurar .gitignore completo
- [ ] 📋 Documentar instalación y despliegue local

### 1.2 Estructura de Proyectos
- [x] ✅ Crear estructura del backend (`backend/`)
- [ ] 📋 Crear estructura del frontend (`frontend/`)
- [x] ✅ Configurar TypeScript (opcional pero recomendado)
- [ ] 📋 Configurar ESLint + Prettier
- [x] ✅ Configurar scripts NPM (`dev`, `build`, `test`, `start`)

---

## 🔧 **FASE 2: BACKEND (Node.js + Express)**

### 2.1 Configuración Inicial del Backend
- [x] ✅ Inicializar proyecto Node.js (`npm init`)
- [x] ✅ Instalar dependencias principales:
  - [x] ✅ Express, mysql2, jsonwebtoken, bcrypt
  - [x] ✅ helmet, cors, express-rate-limit
  - [x] ✅ dotenv, zod, pino, dayjs
  - [x] ✅ multer, swagger-ui-express
- [x] ✅ Configurar estructura de carpetas (`src/`, `config/`, `auth/`, etc.)
- [x] ✅ Configurar TypeScript (tsconfig.json)

### 2.2 Base de Datos
- [x] ✅ Configurar conexión MySQL
- [x] ✅ Script de inicialización (tablas principales)
- [x] ✅ Configurar pool de conexiones

### 2.3 Sistema de Autenticación y Autorización
- [x] ✅ Configurar JWT (jsonwebtoken)
- [x] ✅ Middleware de autenticación
- [x] ✅ Middleware RBAC (roles)
- [x] ✅ Hash de contraseñas (bcrypt)
- [x] ✅ Rutas de auth (login, logout)
- [x] ✅ Gestión de roles y permisos

### 2.4 Controladores y Rutas Principales
- [x] ✅ `usersController.ts` - Gestión completa de usuarios (CRUD)
- [x] ✅ `rolesController.ts` - Catálogo de roles
- [x] ✅ `usersRoutes.ts` - Rutas protegidas con RBAC
- [ ] � `inquilinosController.ts` - CRUD inquilinos
- [ ] 🚧 `propiedadesController.ts` - CRUD propiedades  
- [ ] 🚧 `contratosController.ts` - CRUD contratos
- [ ] � `pagosController.ts` - Gestión de pagos
- [ ] � `reportesController.ts` - Reportes y analytics

### 2.5 Middlewares y Seguridad
- [x] ✅ Middleware de auditoría (audit.ts)
- [x] ✅ Manejo de errores (errorHandler.ts)
- [x] ✅ Seguridad (helmet, cors, rate limiting)
- [x] ✅ Validación de datos (Zod schemas)
- [x] ✅ Logging (pino)

### 2.6 Módulos de Negocio - Propiedades
- [ ] 📋 **Propiedades Controller**:
  - [ ] `GET /propiedades` - Listar con filtros (estado, tipo, rango renta)
  - [ ] `POST /propiedades` - Crear propiedad
  - [ ] `GET /propiedades/:id` - Obtener propiedad específica
  - [ ] `PUT /propiedades/:id` - Actualizar propiedad
  - [ ] `DELETE /propiedades/:id` - Eliminar (validar sin contratos activos)
- [ ] 📋 **Imágenes de Propiedades**:
  - [ ] `GET /propiedades/:id/imagenes` - Listar imágenes
  - [ ] `POST /propiedades/:id/imagenes` - Subir imagen (multer)
  - [ ] `DELETE /propiedades/:id/imagenes/:imgId` - Eliminar imagen
- [ ] 📋 Validaciones: código único, renta > 0, estado válido

### 2.7 Módulos de Negocio - Contratos
- [ ] 📋 **Contratos Controller**:
  - [ ] `GET /contratos` - Listar con filtros (estado, propiedad, inquilino, periodo)
  - [ ] `POST /contratos` - Crear contrato (validar propiedad DISPONIBLE)
  - [ ] `GET /contratos/:id` - Obtener contrato específico
  - [ ] `PUT /contratos/:id` - Actualizar contrato (guarda historial)
  - [ ] `POST /contratos/:id/finalizar` - Finalizar contrato
  - [ ] `POST /contratos/:id/renovar` - Renovar contrato
- [ ] 📋 Validaciones críticas:
  - [ ] Propiedad en estado DISPONIBLE
  - [ ] fecha_inicio <= fecha_fin
  - [ ] No múltiples contratos ACTIVO por propiedad
- [ ] 📋 Triggers automáticos (estado propiedad, historial)

### 2.8 Módulos de Negocio - Facturación (CxC)
- [ ] 📋 **Facturación Controller**:
  - [ ] `POST /facturacion/generar` - Generar facturas mensuales (SP)
  - [ ] `GET /contratos/:id/facturas` - Facturas por contrato
  - [ ] `GET /facturas` - Listar con filtros (estado, vencimiento)
  - [ ] `GET /facturas/:id` - Obtener factura específica
  - [ ] `PATCH /facturas/:id/anular` - Anular factura (ADMIN)
- [ ] 📋 Integración con SP `sp_generar_facturas_mensuales`
- [ ] 📋 Manejo de estados automáticos (ABIERTA, PARCIAL, PAGADA, VENCIDA)

### 2.9 Módulos de Negocio - Pagos y Aplicaciones
- [ ] 📋 **Pagos Controller**:
  - [ ] `POST /pagos` - Registrar pago
  - [ ] `GET /pagos` - Listar con filtros (fecha, contrato, forma)
  - [ ] `GET /pagos/:id` - Obtener pago específico
  - [ ] `POST /pagos/:id/aplicar` - Aplicar pago a factura
  - [ ] `DELETE /pagos/:id/aplicaciones/:aplId` - Revertir aplicación
- [ ] 📋 Validaciones transaccionales:
  - [ ] monto > 0
  - [ ] aplicación no supera saldo_pendiente
  - [ ] transacciones con rollback
- [ ] 📋 Triggers automáticos (saldos, estados)

### 2.10 Módulos de Negocio - Gastos Fijos
- [ ] 📋 **Gastos Controller**:
  - [ ] `GET /gastos` - Listar con filtros (propiedad, tipo, fecha)
  - [ ] `POST /gastos` - Crear gasto
  - [ ] `PUT /gastos/:id` - Actualizar gasto
  - [ ] `DELETE /gastos/:id` - Eliminar gasto
- [ ] 📋 Catálogo de tipos de gasto
- [ ] 📋 Validaciones: monto >= 0, tipo_gasto_id válido

### 2.11 Módulos de Negocio - Mantenimiento
- [ ] 📋 **Mantenimiento Controller**:
  - [ ] `GET /mantenimiento` - Listar solicitudes con filtros
  - [ ] `POST /mantenimiento` - Crear ticket
  - [ ] `PATCH /mantenimiento/:id` - Cambiar estado/prioridad
- [ ] 📋 Estados: ABIERTA, EN_PROCESO, EN_ESPERA, RESUELTA, CANCELADA
- [ ] 📋 Prioridades: BAJA, MEDIA, ALTA, CRITICA

### 2.12 Módulos de Reportes
- [ ] 📋 **Reportes Controller**:
  - [ ] `GET /reportes/cxc` - Resumen cuentas por cobrar
  - [ ] `GET /reportes/rentabilidad` - Rentabilidad por propiedad
  - [ ] `GET /reportes/ocupacion` - Estado de ocupación
  - [ ] `GET /reportes/descargar` - Exportar PDF/Excel
- [ ] 📋 Integración con vistas SQL (v_resumen_cxc, v_rentabilidad_propiedad, v_ocupacion)
- [ ] 📋 Exportación con exceljs/pdfmake

### 2.13 Testing Backend
- [ ] 📋 Configurar entorno de testing (vitest/jest)
- [ ] 📋 Tests unitarios - servicios y validadores
- [ ] 📋 Tests de integración - endpoints con supertest
- [ ] 📋 Datos semilla para testing
- [ ] 📋 Cobertura mínima 70%

---

## 🎨 **FASE 3: FRONTEND (React.js)**

### 3.1 Configuración Inicial del Frontend
- [ ] 📋 Crear proyecto React (Vite recomendado)
- [ ] 📋 Instalar dependencias principales:
  - [ ] React Router, Axios, React Hook Form, zod
  - [ ] TanStack Query, Day.js, Tailwind CSS
  - [ ] Recharts, SheetJS, jsPDF, Sonner
- [ ] 📋 Configurar estructura de carpetas
- [ ] 📋 Configurar Tailwind CSS
- [ ] 📋 Configurar TypeScript

### 3.2 Configuración Base Frontend
- [ ] 📋 Cliente HTTP con Axios (`api/http.ts`)
- [ ] 📋 Configurar interceptores JWT
- [ ] 📋 Manejo de errores HTTP (401, 403)
- [ ] 📋 Estado global para autenticación
- [ ] 📋 Utilidades de formato (moneda GTQ, fechas dd/mm/aaaa)

### 3.3 Sistema de Rutas y Autenticación
- [ ] 📋 Configurar React Router
- [ ] 📋 Rutas públicas vs privadas
- [ ] 📋 Guards de autenticación (`RequireAuth`)
- [ ] 📋 Guards de autorización (`RequireRole`)
- [ ] 📋 Página de Login
- [ ] 📋 Manejo de sesiones y logout

### 3.4 Componentes Base Reutilizables
- [ ] 📋 **DataTable** - Tabla con paginación, filtros, ordenamiento
- [ ] 📋 **Form Components** - Input, Select, DatePicker, etc.
- [ ] 📋 **Modal** - Modal genérico reutilizable
- [ ] 📋 **ConfirmDialog** - Confirmación de acciones destructivas
- [ ] 📋 **DateRangePicker** - Selector de rango de fechas
- [ ] 📋 **LoadingSpinner** - Indicadores de carga
- [ ] 📋 **Toast Notifications** - Feedback de acciones

### 3.5 Dashboard y KPIs
- [ ] 📋 **Página Dashboard**:
  - [ ] KPIs de ocupación
  - [ ] Ingresos últimos 30 días
  - [ ] Rentabilidad resumen
  - [ ] Alertas de pagos vencidos
  - [ ] Gráficas con Recharts
- [ ] 📋 Widgets reutilizables
- [ ] 📋 Actualización en tiempo real

### 3.6 Gestión de Propiedades
- [ ] 📋 **Página Propiedades**:
  - [ ] Lista con filtros (estado, tipo, rango renta)
  - [ ] CRUD completo
  - [ ] Vista de detalle
  - [ ] Galería de imágenes
- [ ] 📋 **Formularios**:
  - [ ] Crear/editar propiedad
  - [ ] Validaciones con zod
  - [ ] Upload de imágenes
- [ ] 📋 Búsqueda y filtros avanzados

### 3.7 Gestión de Inquilinos
- [ ] 📋 **Página Inquilinos**:
  - [ ] Lista con búsqueda por nombre/documento
  - [ ] CRUD completo
  - [ ] Vista de detalle con historial
- [ ] 📋 **Formularios**:
  - [ ] Crear/editar inquilino
  - [ ] Validaciones de documento único
- [ ] 📋 Búsqueda en tiempo real

### 3.8 Gestión de Contratos
- [ ] 📋 **Página Contratos**:
  - [ ] Lista con filtros avanzados
  - [ ] Vista de detalle completa
  - [ ] Historial de cambios
- [ ] 📋 **Wizard de Creación**:
  - [ ] Paso 1: Seleccionar propiedad DISPONIBLE
  - [ ] Paso 2: Seleccionar inquilino
  - [ ] Paso 3: Configurar fechas y montos
  - [ ] Validaciones en cada paso
- [ ] 📋 **Acciones de Contrato**:
  - [ ] Renovar contrato
  - [ ] Finalizar contrato
  - [ ] Ver historial de cambios

### 3.9 Gestión de Pagos y Facturación
- [ ] 📋 **Página Facturas**:
  - [ ] Lista con filtros por estado y vencimiento
  - [ ] Generar facturas mensuales
  - [ ] Vista de detalle por factura
- [ ] 📋 **Página Pagos**:
  - [ ] Registrar nuevo pago
  - [ ] Historial de pagos
  - [ ] Aplicar pagos a facturas abiertas
  - [ ] Mostrar saldo no aplicado
- [ ] 📋 **Flujo de Aplicación**:
  - [ ] Seleccionar facturas abiertas
  - [ ] Aplicar montos parciales/totales
  - [ ] Revertir aplicaciones

### 3.10 Gestión de Gastos
- [ ] 📋 **Página Gastos**:
  - [ ] Lista con filtros por propiedad, tipo, fecha
  - [ ] CRUD completo
  - [ ] Categorización por tipos
- [ ] 📋 **Formularios**:
  - [ ] Crear/editar gasto
  - [ ] Selección de propiedad y tipo
  - [ ] Validaciones de monto

### 3.11 Gestión de Mantenimiento
- [ ] 📋 **Página Mantenimiento**:
  - [ ] Lista de tickets con filtros
  - [ ] Crear nueva solicitud
  - [ ] Cambiar estados y prioridades
- [ ] 📋 **Vista de Ticket**:
  - [ ] Detalle completo
  - [ ] Historial de cambios de estado
  - [ ] Comentarios y seguimiento

### 3.12 Gestión de Usuarios (ADMIN)
- [ ] 📋 **Página Usuarios** (solo ADMIN):
  - [ ] Lista de usuarios con roles
  - [ ] CRUD completo
  - [ ] Activar/desactivar usuarios
- [ ] 📋 **Formularios**:
  - [ ] Crear/editar usuario
  - [ ] Asignación de roles
  - [ ] Validaciones de correo único

### 3.13 Reportes y Exportación
- [ ] 📋 **Página Reportes**:
  - [ ] Resumen cuentas por cobrar
  - [ ] Rentabilidad por propiedad
  - [ ] Estado de ocupación
  - [ ] Filtros por fechas
- [ ] 📋 **Exportación**:
  - [ ] Exportar a PDF
  - [ ] Exportar a Excel
  - [ ] Preview antes de exportar

### 3.14 Testing Frontend
- [ ] 📋 Configurar entorno de testing (Vitest + Testing Library)
- [ ] 📋 Tests unitarios - componentes y utils
- [ ] 📋 Tests de integración - flujos principales
- [ ] 📋 Tests E2E opcionales (Playwright/Cypress)

---

## 🔒 **FASE 4: SEGURIDAD Y CALIDAD**

### 4.1 Seguridad
- [ ] 📋 Validar RBAC en todos los endpoints
- [ ] 📋 Rate limiting por rutas sensibles
- [ ] 📋 Validaciones de entrada exhaustivas
- [ ] 📋 Sanitización de datos
- [ ] 📋 Headers de seguridad (Helmet)
- [ ] 📋 CORS configurado correctamente
- [ ] 📋 Auditoría completa funcionando

### 4.2 Testing Integral
- [ ] 📋 Tests de integración completos
- [ ] 📋 Tests de casos de error (401, 403, 404, 409)
- [ ] 📋 Tests de flujos de negocio críticos
- [ ] 📋 Cobertura de código ≥70%
- [ ] 📋 Tests de carga básicos

### 4.3 Documentación
- [ ] 📋 Documentación de API (Swagger/OpenAPI)
- [ ] 📋 Colección Postman/Insomnia
- [ ] 📋 README completo con instalación
- [ ] 📋 Documentación de despliegue
- [ ] 📋 Guía de usuario básica

---

## 🚀 **FASE 5: DESPLIEGUE Y OPTIMIZACIÓN**

### 5.1 Preparación para Producción
- [ ] 📋 Variables de entorno para producción
- [ ] 📋 Build optimizado de frontend
- [ ] 📋 Minificación y compresión
- [ ] 📋 Configuración de HTTPS
- [ ] 📋 Backup automático de BD

### 5.2 Monitoreo y Observabilidad
- [ ] 📋 Logs estructurados
- [ ] 📋 Endpoint /health
- [ ] 📋 Métricas básicas (opcional)
- [ ] 📋 Alertas de errores críticos

### 5.3 Optimización de Rendimiento
- [ ] 📋 Cache en consultas frecuentes
- [ ] 📋 Paginación optimizada
- [ ] 📋 Lazy loading de imágenes
- [ ] 📋 Compresión de respuestas
- [ ] 📋 CDN para assets estáticos

---

## ✅ **CHECKLIST FINAL DE ENTREGA**

### Documentación
- [ ] 📋 `.env.example` completos (frontend y backend)
- [ ] 📋 README con pasos de instalación local
- [ ] 📋 Documentación de Docker
- [ ] 📋 Colección Postman/Insomnia
- [ ] 📋 Scripts NPM configurados

### Funcionalidad
- [ ] 📋 CRUD completo de todas las entidades
- [ ] 📋 Autenticación JWT funcionando
- [ ] 📋 RBAC validado en todos los endpoints
- [ ] 📋 Exportación PDF/Excel funcionando
- [ ] 📋 Auditoría activa en operaciones críticas
- [ ] 📋 Triggers y SPs funcionando correctamente

### Calidad
- [ ] 📋 Tests con cobertura ≥70%
- [ ] 📋 Linting y formatting configurados
- [ ] 📋 Manejo de errores completo
- [ ] 📋 Validaciones client-side y server-side
- [ ] 📋 UI responsive y accesible

### Datos
- [ ] 📋 Usuario admin creado
- [ ] 📋 Datos semilla para demo
- [ ] 📋 Credenciales de demo documentadas

---

## 📊 **MÉTRICAS DE PROGRESO**

- **Total de tareas**: 200+ elementos
- **Backend**: ~80 elementos
- **Frontend**: ~90 elementos  
- **Calidad/Testing**: ~30 elementos

**Estado actual**: ✅ 6/200+ completadas (~3%)

> **Próximo milestone**: Completar Fase 1 y 2.1-2.3 (configuración base del backend)

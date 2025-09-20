# 📋 Plan de Implementación Detallado - Sistema de Alquiler

### 📊 **ESTADO ACTUAL DE IMPLEMENTACIÓN**
- [x] ✅ **Usuarios**: 100% funcional con lógica completa de negocio
- [x] ✅ **Inquilinos**: 100% funcional con lógica completa de negocio  
- [x] ✅ **Propiedades**: 100% funcional con lógica completa de negocio
- [x] ✅ **Contratos**: 100% - Lógica completa de negocio implementada (fix columnas + LIMIT/OFFSET)
- [x] ✅ **Facturación**: 100% - CRUD completo + generación por SP
- [x] ✅ **Pagos**: 100% - Registro, catálogo y validaciones
- [x] ✅ **Aplicaciones de Pago**: 100% - Aplicar/Revertir pagos
- [ ] ⏳ **Gastos Fijos**: 0% - Pendiente
- [ ] ⏳ **Mantenimiento**: 0% - Pendiente
- [x] ✅ **Reportes**: 100% - Resumen CxC y KPIs iniciales

### 🚀 **PROGRESO BACKEND: 50% COMPLETADO**

> **Stack**: React.js + Node.js/Express + MySQL | **Zona**: Guatemala (-06:00) | **Moneda**: GTQ | **Fechas**: dd/mm/aaaa

---
### 2.6 Endpoints y Ajustes Generales
- [x] ✅ Auth y RBAC activos en rutas sensibles.
- [x] ✅ Validaciones Zod en controladores (correcciones de fechas ISO en Contratos).
- [x] ✅ Auditoría: creación/lectura/actualización/eliminación con `auditAction`.

### 2.7 Módulos de Negocio - Contratos
- [x] ✅ **Contratos Controller**:
  - [x] ✅ `GET /contratos` - Listar con filtros (estado, propiedad, inquilino, periodo)
  - [x] ✅ `POST /contratos` - Crear contrato (validar propiedad DISPONIBLE)
  - [x] ✅ `GET /contratos/:id` - Obtener contrato específico
  - [x] ✅ `PUT /contratos/:id` - Actualizar contrato (guarda historial)
  - [x] ✅ `PUT /contratos/:id/finalizar` - Finalizar contrato
  - [x] ✅ `PUT /contratos/:id/renovar` - Renovar contrato
  - [x] ✅ `GET /contratos/:id/facturas` - Facturas por contrato
  - [x] ✅ `DELETE /contratos/:id` - Eliminar contrato
- [x] ✅ Validaciones críticas:
  - [x] ✅ Propiedad en estado DISPONIBLE
  - [x] ✅ fecha_inicio <= fecha_fin
  - [x] ✅ No múltiples contratos ACTIVO por propiedad
- [x] ✅ Triggers automáticos (estado propiedad, historial)

### 2.8 Módulos de Negocio - Inquilinos y Propiedades
- [x] ✅ Inquilinos Controller y Rutas (/api/v1/inquilinos): listar, crear, actualizar, cambiar estado (activar/desactivar), eliminar (soft).
- [x] ✅ Propiedades Controller y Rutas (/api/v1/propiedades): listar (filtros básicos), crear, actualizar, cambiar estado, eliminar (soft).
- [x] ✅ Columnas y nombres alineados al esquema en español (correo, nombre_completo, renta_mensual, creado_el, actualizado_el, usuarios_roles, etc.).

### 2.9 Módulos de Negocio - Facturación (CxC)
- [x] ✅ **Facturación Controller**:
  - [x] ✅ `POST /facturacion/generar` - Generar facturas mensuales (SP)
  - [x] ✅ `GET /facturas` - Listar con filtros (estado, vencimiento, contrato)
  - [x] ✅ `GET /facturas/:id` - Obtener factura específica
  - [x] ✅ `PATCH /facturas/:id/anular` - Anular factura (ADMIN)
- [x] ✅ Integración con SP `sp_generar_facturas_mensuales`
- [x] ✅ Manejo de estados automáticos (ABIERTA, PARCIAL, PAGADA, VENCIDA)

### 2.10 Módulos de Negocio - Pagos
- [x] ✅ **Pagos Controller**:
  - [x] ✅ `POST /pagos` - Registrar pago
  - [x] ✅ `GET /pagos` - Listar con filtros (fecha, contrato, forma)
  - [x] ✅ `GET /pagos/:id` - Obtener pago específico
  - [x] ✅ `PATCH /pagos/:id` - Actualizar pago
  - [x] ✅ `DELETE /pagos/:id` - Eliminar pago (validar sin aplicaciones)
- [x] ✅ Validaciones: monto > 0, forma_pago_id válido
- [x] ✅ Estados: PENDIENTE, APLICADO, ANULADO
- [x] ✅ Catálogo de formas de pago habilitado

### 2.11 Módulos de Negocio - Aplicaciones de Pago
- [x] ✅ **Aplicaciones Controller**:
  - [x] ✅ `POST /pagos/:id/aplicar` - Aplicar pago a factura
  - [x] ✅ `GET /pagos/:id/aplicaciones` - Listar aplicaciones de un pago
  - [x] ✅ `DELETE /pagos/:id/aplicaciones/:aplId` - Revertir aplicación
- [x] ✅ Validaciones transaccionales:
  - [x] ✅ monto > 0
  - [x] ✅ aplicación no supera saldo_pendiente
  - [x] ✅ transacciones con rollback y bloqueo optimista
- [x] ✅ Actualización de saldos y estados de facturas/pagos

### 2.12 Módulos de Negocio - Gastos Fijos
- [ ] 📋 **Gastos Controller**:
  - [ ] `GET /gastos` - Listar con filtros (propiedad, tipo, fecha)
  - [ ] `POST /gastos` - Crear gasto
  - [ ] `PUT /gastos/:id` - Actualizar gasto
  - [ ] `DELETE /gastos/:id` - Eliminar gasto
- [ ] 📋 Catálogo de tipos de gasto
- [ ] 📋 Validaciones: monto >= 0, tipo_gasto_id válido

### 2.13 Módulos de Negocio - Mantenimiento
- [ ] 📋 **Mantenimiento Controller**:
  - [ ] `GET /mantenimiento` - Listar solicitudes con filtros
  - [ ] `POST /mantenimiento` - Crear ticket
  - [ ] `PATCH /mantenimiento/:id` - Cambiar estado/prioridad
  - [ ] `GET /mantenimiento/:id` - Obtener ticket específico
- [ ] 📋 Estados: ABIERTA, EN_PROCESO, EN_ESPERA, RESUELTA, CANCELADA
- [ ] 📋 Prioridades: BAJA, MEDIA, ALTA, CRITICA

### 2.14 Módulos de Reportes
- [x] ✅ **Reportes Controller**:
  - [x] ✅ `GET /reportes/cxc` - Resumen cuentas por cobrar (v_resumen_cxc)
  - [x] ✅ `GET /reportes/rentabilidad` - Rentabilidad por propiedad (v_rentabilidad_propiedad)
  - [x] ✅ `GET /reportes/ocupacion` - Estado de ocupación (v_ocupacion)
  - [ ] 📋 `GET /reportes/descargar` - Exportar PDF/Excel (pendiente)
  - [ ] 📋 `GET /reportes/auditoria` - Registro de eventos de auditoría (pendiente)
- [x] ✅ KPIs iniciales (`/reportes/kpis`)
- [ ] 📋 Exportación avanzada (exceljs/pdfmake)

### 2.15 Testing Backend
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

### 3.6 Gestión de Propiedades (Implementado MVP)
- [x] ✅ Lista con filtros + paginación.
- [x] ✅ Modal “Nueva propiedad” y modal “Editar”.
- [x] ✅ Acciones en menú ⋮ (Editar / Eliminar).
  - Backend CRUD en `/api/v1/propiedades`.
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

### 3.7 Gestión de Inquilinos (Implementado MVP)
- [x] ✅ Lista con filtros + paginación.
- [x] ✅ Modal “Nuevo inquilino” con validación Zod (nombre completo, correo, teléfono, dirección).
- [x] ✅ Modal “Editar inquilino” (todos los campos relevantes) + cambio de estado.
- [x] ✅ Acciones en menú ⋮ (Editar / Activar / Desactivar / Eliminar).
- [ ] 📋 **Página Inquilinos**:
  - [ ] Lista con búsqueda por nombre/documento
  - [ ] CRUD completo
  - [ ] Vista de detalle con historial
- [ ] 📋 **Formularios**:
  - [ ] Crear/editar inquilino
  - [ ] Validaciones de documento único
- [ ] 📋 Búsqueda en tiempo real

### 3.8 Gestión de Contratos (Implementado MVP)
- [x] ✅ Lista con filtros (estado, propiedad, inquilino, fechas) + paginación.
- [x] ✅ Modales: “Nuevo contrato”, “Editar”, “Renovar”, “Finalizar”, “Ver facturas”.
- [x] ✅ Acciones en menú ⋮ (Editar / Renovar / Finalizar / Ver Facturas / Eliminar).
- [x] ✅ Mapeos de columnas: renta_mensual, estado CANCELADO (desde RESCINDIDO).
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
- [x] ✅ **Página Facturas**:
  - [x] ✅ Lista con filtros por estado y vencimiento
  - [x] ✅ Generar facturas mensuales
  - [x] ✅ Vista básica de detalle por factura
- [x] ✅ **Página Pagos**:
  - [x] ✅ Registrar nuevo pago
  - [x] ✅ Historial de pagos
  - [x] ✅ Aplicar pagos a facturas abiertas
  - [x] ✅ Mostrar saldo no aplicado
- [x] ✅ **Flujo de Aplicación**:
  - [x] ✅ Seleccionar facturas abiertas
  - [x] ✅ Aplicar montos parciales/totales
  - [x] ✅ Revertir aplicaciones

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

### 3.12 Gestión de Usuarios (ADMIN) (Implementado MVP)
- [x] ✅ Lista con filtros + paginación.
- [x] ✅ Modal “Nuevo usuario” con validación Zod (email, contraseña fuerte, nombre completo, rol único).
- [x] ✅ Modal “Editar usuario” (email, nombre completo, rol, restablecer contraseña).
- [x] ✅ Acciones en menú ⋮ (Editar / Activar / Desactivar / Restablecer / Eliminar).
- [x] ✅ Ajuste: frontend usa “Nombre completo” (un solo campo); backend acepta `nombre_completo` o (`nombres`+`apellidos`).
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

---

## 🧭 Patrones UI y Notas de Implementación
- Modo oscuro por defecto (`<html class="dark">`) y Tailwind `dark:` aplicado en componentes.
- Cabecera “Acciones” simplificada: acciones en menú ⋮ (Usuarios, Inquilinos, Propiedades, Contratos).
- Botón “Nuevo …” en cada módulo abre modal de creación (patrón consistente).
- Validación visual con Zod + React Hook Form en usuarios e inquilinos (propiedades/contratos se pueden extender igual).
- Icono/Logo: usar `frontend/public/edifico.png` (Favicon y login). Hard reload para refrescar cache.

## 🛠 Scripts de desarrollo
- `iniciar-sistema.sh`: levanta MySQL (docker), backend (dev) y frontend (vite), muestra logs en vivo y deja modo seguimiento (Ctrl+C detiene los procesos lanzados por el script).
- `iniciar-sistema-stop.sh`: detiene procesos iniciados por el script; `STOP_DB=1` para parar MySQL también.

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

**Estado actual**: ✅ 40/200+ completadas (~20%)

> **Próximo milestone**: Completar Fase 1 y 2.1-2.3 (configuración base del backend)

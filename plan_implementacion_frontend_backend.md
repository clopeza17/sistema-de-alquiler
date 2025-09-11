# Plan de Implementación — Frontend & Backend (Sistema de Gestión de Alquiler de Apartamentos)

> **Contexto**: La base de datos MySQL ya está montada (Docker) y definida (tablas, vistas, SPs, triggers). El stack **obligatorio** según los documentos es **Frontend: React.js (HTML5, CSS3, JS ES6+)** y **Backend: Node.js + Express.js**, consumiendo **MySQL**. Idioma **Español (Guatemala)**, zona horaria **America/Guatemala (-06:00)**, fechas `dd/mm/aaaa` y moneda **GTQ**.

---

## 1) Especificaciones del Backend (Node.js + Express)

### 1.1 Estructura de proyecto (sugerida)
```
backend/
  src/
    app.ts | app.js                 # instancia de Express
    server.ts | server.js           # arranque HTTP
    config/
      env.ts                        # lectura de variables (.env)
      db.ts                         # pool MySQL (mysql2/promise)
      logger.ts                     # pino/winston
    auth/
      jwt.ts                        # emisión/verificación JWT
      middlewareAuth.ts             # guard de autenticación
      middlewareRBAC.ts             # guard de autorización (roles)
      password.ts                   # hash y verificación (bcrypt)
    common/
      errors.ts                     # clases HttpError y fábrica de respuestas
      validators.ts                 # validaciones comunes (zod/yup)
      pagination.ts                 # helpers de paginación/sort
      dates.ts                      # TZ -06:00 y formateo
    middlewares/
      cors.ts, helmet.ts, rateLimit.ts
      errorHandler.ts               # manejo centralizado de errores
      audit.ts                      # registra en eventos_auditoria
    modules/
      usuarios/roles/...            # cada dominio con controller/service/repo/routes/validators
      propiedades/
      inquilinos/
      contratos/
      facturas/
      pagos/
      aplicacionesPago/
      gastosFijos/
      mantenimiento/
      reportes/
    routes.ts                       # agrega rutas por módulo
  test/                             # unitarias e integración (vitest/jest + supertest)
  package.json
  tsconfig.json (opcional)
  .env.example
```

### 1.2 Dependencias clave
- **Express** (servidor HTTP)
- **mysql2/promise** (pool MySQL)
- **jsonwebtoken** (JWT)
- **bcrypt** (hash de contraseñas)
- **zod** o **yup** (validación de entrada)
- **helmet**, **cors**, **express-rate-limit** (seguridad)
- **pino** o **winston** (logging)
- **morgan** (access log, opcional)
- **dotenv** (config)
- **dayjs**/**luxon** (manejo de fechas con TZ)
- **multer** (si se aceptan uploads)
- **swagger-ui-express** (opcional para docs de API)
- **vitest/jest**, **supertest** (pruebas)

### 1.3 Variables de entorno (`.env`)
```
NODE_ENV=development
PORT=8080
DB_HOST=your-host
DB_PORT=3306
DB_NAME=sistema_alquiler
DB_USER=your-user
DB_PASSWORD=your-pass
DB_TIMEZONE=-06:00
JWT_SECRET=super-secreto
JWT_EXPIRES_IN=8h
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

### 1.4 Principios de integración con la BD existente
- **No** alterar tablas/columnas existentes. Cualquier tabla nueva será prefijada `sys_` o documentada aparte.
- Usar **transacciones** donde corresponda (pagos + aplicaciones, cierres de contrato, etc.).
- Respetar triggers y SPs existentes; exponer endpoints que los utilicen (p.ej. `sp_generar_facturas_mensuales`).
- Lectura de vistas para reportes (`v_resumen_cxc`, `v_rentabilidad_propiedad`, `v_ocupacion`).

### 1.5 Seguridad
- **Auth**: JWT (Bearer), login con correo + contraseña (bcrypt). Refresh opcional.
- **RBAC**: roles mínimos `ADMIN`, `OPER`. Middleware `middlewareRBAC(["ADMIN"])` por ruta crítica.
- **Cabeceras**: `helmet`, CORS restringido por origen.
- **Rate limiting**: global y por rutas sensibles (auth, pagos).
- **Auditoría**: middleware `audit` registra `usuario_id`, `tipo_evento`, `entidad`, `entidad_id`, `datos` JSON en `eventos_auditoria`.

### 1.6 Convenciones de API
- **Base URL**: `/api/v1`
- **Formato**: JSON `{ data, meta, error }`
- **Paginación**: `?page=1&limit=20` → `{ meta: { page, limit, total } }`
- **Orden/filtrado**: `?sort=campo,-otro&filter[estado]=ACTIVO&desde=2025-09-01&hasta=2025-09-30`
- **Fechas**: entrada `YYYY-MM-DD` (zona `-06:00`). UI muestra `dd/mm/aaaa`.
- **Errores**: HTTP + payload
  ```json
  { "error": { "code": "CONFLICT", "message": "Contrato se superpone" } }
  ```

### 1.7 Endpoints por módulo (resumen)

#### Auth / Usuarios / Roles
- `POST /auth/login` → {token}
- `POST /auth/refresh` → {token}
- `POST /auth/logout`
- `GET /usuarios` (ADMIN) — paginado, filtros.
- `POST /usuarios` (ADMIN) — crea con rol/es; hash de contraseña.
- `PUT /usuarios/:id` (ADMIN)
- `PATCH /usuarios/:id/activar` (ADMIN)
- `GET /roles` — catálogo de roles.

#### Inquilinos
- `GET /inquilinos` — search por nombre/doc, paginado.
- `POST /inquilinos` — crear.
- `GET /inquilinos/:id`
- `PUT /inquilinos/:id`
- `DELETE /inquilinos/:id` — si no está vinculado a contrato activo.

#### Propiedades
- `GET /propiedades` — filtros: estado, tipo, rango renta.
- `POST /propiedades` — crear.
- `GET /propiedades/:id`
- `PUT /propiedades/:id`
- `DELETE /propiedades/:id` — bloquea si tiene contrato activo.
- `GET /propiedades/:id/imagenes`
- `POST /propiedades/:id/imagenes` (URL o upload)
- `DELETE /propiedades/:id/imagenes/:imgId`

#### Contratos
- `GET /contratos` — filtros: estado, propiedad, inquilino, periodo.
- `POST /contratos` — validar: propiedad `DISPONIBLE`, fechas válidas.
- `GET /contratos/:id`
- `PUT /contratos/:id` — cambios guardan historial.
- `POST /contratos/:id/finalizar` — libera propiedad si no quedan activos.
- `POST /contratos/:id/renovar` — ajusta fechas, historial.

#### Facturación (Cuentas por Cobrar)
- `POST /facturacion/generar` — body: { anio, mes, emision, vencimiento } → llama SP mensual.
- `GET /contratos/:id/facturas` — listar por contrato.
- `GET /facturas` — filtros: estado, vencimiento.
- `GET /facturas/:id`
- `PATCH /facturas/:id/anular` (ADMIN)

#### Pagos & Aplicaciones de Pago
- `POST /pagos` — { contrato_id, forma_pago_id, fecha_pago, monto, referencia }
- `GET /pagos` — filtros: fecha, contrato, forma.
- `GET /pagos/:id`
- `POST /pagos/:id/aplicar` — { factura_id, monto_aplicado }
- `DELETE /pagos/:id/aplicaciones/:aplId` — revierte (triggers ajustan saldos)

#### Gastos Fijos
- `GET /gastos` — filtros: propiedad, tipo, fecha.
- `POST /gastos` — { propiedad_id, tipo_gasto_id, fecha_gasto, detalle, monto }
- `PUT /gastos/:id`
- `DELETE /gastos/:id`

#### Mantenimiento (Solicitudes)
- `GET /mantenimiento` — filtros: estado, prioridad, propiedad.
- `POST /mantenimiento` — crear ticket.
- `PATCH /mantenimiento/:id` — cambiar estado/prioridad/cierre.

#### Reportes (vistas)
- `GET /reportes/cxc` — `v_resumen_cxc`
- `GET /reportes/rentabilidad` — `v_rentabilidad_propiedad`
- `GET /reportes/ocupacion` — `v_ocupacion`
- `GET /reportes/descargar?tipo=pdf|xlsx&reporte=...` — exporta.

### 1.8 Validaciones críticas
- **Contratos**: propiedad `DISPONIBLE`; `fecha_inicio <= fecha_fin`; no permitir múltiples `ACTIVO` simultáneos por propiedad.
- **Pagos**: `monto > 0`; aplicación no superar `saldo_pendiente` de la factura; transacción con rollback si falla.
- **Gastos**: `monto >= 0` y `tipo_gasto_id` válido.
- **Usuarios**: `correo` único; contraseña fuerte; roles válidos.

### 1.9 Manejo de errores (códigos comunes)
- 400 `BAD_REQUEST` (validación)
- 401 `UNAUTHORIZED` (token inválido/ausente)
- 403 `FORBIDDEN` (RBAC)
- 404 `NOT_FOUND`
- 409 `CONFLICT` (solapamiento, estados inválidos)
- 422 `UNPROCESSABLE_ENTITY` (reglas de negocio)
- 500 `INTERNAL_SERVER_ERROR`

### 1.10 Pruebas
- **Unitarias**: servicios y validadores (mock DB).
- **Integración**: endpoints clave con **supertest** sobre app en memoria.
- **Datos semilla**: usuario admin, 1-2 propiedades, 1 inquilino, 1 contrato.
- **Cobertura**: ≥70% y reporte en CI.

---

## 2) Especificaciones del Frontend (React.js)

### 2.1 Estructura de proyecto (sugerida)
```
frontend/
  src/
    main.tsx | main.jsx
    App.tsx | App.jsx
    router/
      index.tsx                  # React Router (rutas públicas/privadas)
      guards.tsx                 # RequireAuth, RequireRole
    api/
      http.ts                    # axios instance (baseURL, interceptores JWT)
      endpoints.ts               # wrappers por recurso
    state/
      authStore.ts               # sesión (token, usuario)
      uiStore.ts                 # toasts, loaders
    components/
      DataTable.tsx, Form.tsx, Modal.tsx, ConfirmDialog.tsx
      DateRangePicker.tsx
    pages/
      Login/
      Dashboard/
      Propiedades/
      Inquilinos/
      Contratos/
      Pagos/
      Gastos/
      Reportes/
      Mantenimiento/
      Usuarios/
    utils/
      format.ts                  # moneda GTQ, fechas dd/mm/aaaa
      validators.ts
    styles/
      tailwind.css or css modules
```

### 2.2 Dependencias clave
- **React 18**
- **React Router** (rutas protegidas)
- **Axios** (cliente HTTP con interceptores JWT y manejo 401/403)
- **React Hook Form** + **zod** (forms + validaciones)
- **TanStack Query (React Query)** (caché de datos, sincronización, reintentos)
- **Day.js/Luxon** (fechas, TZ -06:00)
- **UI**: Tailwind o Material UI (a elección, consistente)
- **SheetJS/xlsx** y **jsPDF/autoTable** (exportar Excel/PDF)
- **Recharts** (gráficas de KPIs)
- **Sonner/Toastify** (notificaciones)

### 2.3 Rutas y protección
- **Públicas**: `/login`
- **Privadas** (requiere token): `/`, `/propiedades`, `/inquilinos`, `/contratos`, `/pagos`, `/gastos`, `/reportes`, `/mantenimiento`, `/usuarios`
- **RBAC**: componentes `RequireRole(["ADMIN"])` para Usuarios, anulaciones de facturas, etc.

### 2.4 Páginas (funcionalidad mínima)
- **Login**: formulario, recuerda usuario, manejo de errores.
- **Dashboard**: KPIs (ocupación, ingresos últimos 30 días, rentabilidad), alertas (pagos vencidos).
- **Propiedades**: tabla con filtros (estado, tipo), CRUD, gestión de imágenes.
- **Inquilinos**: tabla + CRUD + búsqueda por nombre/doc.
- **Contratos**: wizard (selección propiedad DISPO + inquilino + fechas + renta + depósito), acciones de **Renovar/Finalizar**.
- **Pagos**: registrar pago, ver historial, aplicar a facturas abiertas; mostrar `saldo_no_aplicado` y detalle de aplicaciones.
- **Gastos**: registrar/categorizar por propiedad; filtros por fecha/tipo.
- **Reportes**: vistas sobre `cxc`, `rentabilidad`, `ocupación`; exportar PDF/Excel.
- **Mantenimiento**: tickets, estados, prioridades.
- **Usuarios** (ADMIN): CRUD, asignación de roles, activar/desactivar.

### 2.5 UX/UI — patrones
- **Tablas** con paginación, sort por columnas, búsqueda global y por campo.
- **Formularios** con validación en cliente (zod) + mensajes claros en español.
- **Date pickers** con formato `dd/mm/aaaa` y TZ `-06:00`.
- **Moneda** en **GTQ** con separadores locales.
- **ConfirmDialog** antes de eliminar/anular.
- **Toasts** para feedback de acciones.

### 2.6 Integración con API
- `axios` instance con `baseURL=/api/v1`.
- Interceptor **request**: adjunta `Authorization: Bearer <token>` si existe.
- Interceptor **response**: si 401 → logout o refresh; 403 → toast “No tienes permisos”.
- Hooks con **React Query** por recurso (`usePropiedades`, `useContratos`, etc.), con `select` y `staleTime`.

### 2.7 Internacionalización y formatos
- Todos los textos en **es-GT**.
- Helpers `formatCurrencyGTQ(number)` y `formatDateGT(dd/mm/aaaa)`.
- Envío de fechas al backend en `YYYY-MM-DD` y conversión local en la UI.

### 2.8 Manejo de errores en UI
- Mostrar mensajes del backend `{ error.message }` si existe; fallback genérico.
- Formularios: inline errors bajo cada campo.
- Estados de red: loading, empty, error (retry).

### 2.9 Pruebas Frontend
- **Unitarias**: componentes y utils (Vitest + Testing Library).
- **E2E** (opcional): Playwright o Cypress para flujos principales (login, crear contrato, registrar pago, exportar reporte).

---

## 3) Matriz de permisos (RBAC)

| Módulo                | Acción                          | ADMIN | OPER |
|-----------------------|----------------------------------|:-----:|:----:|
| Usuarios/Roles        | CRUD                             |  ✅   |  ⛔  |
| Propiedades           | CRUD, imágenes                   |  ✅   |  ✅  |
| Inquilinos            | CRUD                             |  ✅   |  ✅  |
| Contratos             | Crear/Renovar/Finalizar          |  ✅   |  ✅  |
| Facturas              | Generar (SP) / Ver               |  ✅   |  ✅  |
| Facturas              | Anular                           |  ✅   |  ⛔  |
| Pagos                 | Registrar/Aplicar/Revertir       |  ✅   |  ✅  |
| Gastos                | CRUD                             |  ✅   |  ✅  |
| Mantenimiento         | CRUD estado/prioridad            |  ✅   |  ✅  |
| Reportes              | Ver/Exportar                     |  ✅   |  ✅  |
| Auditoría             | Ver (consulta)                   |  ✅   |  ⛔  |

*(Ajustable; documentar cualquier cambio)*

---

## 4) Exportación de reportes (PDF/Excel)
- **Backend**: endpoint genérico `/reportes/descargar?tipo=pdf|xlsx&reporte=...&desde&hasta` que consulta vista/consulta SQL y genera stream.
- **Frontend**: botón “Exportar” que invoca el endpoint y dispara descarga (`blob`).
- Librerías sugeridas: **exceljs**/**xlsx** para Excel; **pdfmake**/**puppeteer** o generar en frontend con **jsPDF** (ligero) si el dataset es pequeño.

---

## 5) Observabilidad
- **Logs**: request-id por solicitud, niveles (info/warn/error), captura de stack trace en 5xx.
- **Métricas** (opcional): endpoint `/health` y `/metrics` (Prometheus).
- **Auditoría**: middleware `audit` para eventos clave (login, contratos, pagos, anulación de facturas).

---

## 6) Calidad y CI/CD
- **Lint/Format**: ESLint + Prettier (frontend y backend).
- **Tests** en CI: unitarias + integración (backend) y unitarias (frontend).
- **Build**: verificación de tipos (si TS), empaquetado, imágenes Docker opcionales.

---

## 7) Checklist de entrega
- [ ] `.env.example` completos (frontend y backend)
- [ ] Documentación de instalación local (Docker) y variables
- [ ] Colección Postman/Insomnia
- [ ] Scripts NPM: `dev`, `build`, `test`, `start`
- [ ] Pruebas + reporte de cobertura (≥70%)
- [ ] README con pasos para levantar y credenciales demo
- [ ] Exportación PDF/Excel funcionando
- [ ] RBAC validado (casos de 403)
- [ ] Auditoría activa en operaciones críticas

---

## 8) Anexos — Contratos y CxC (flujos de negocio)

**Alta de contrato**
1) Validar propiedad `DISPONIBLE` y fechas.
2) Crear `contrato` (estado `ACTIVO`).
3) Trigger actualiza `propiedades.estado = OCUPADA`.

**Generar facturas del mes**
1) `POST /facturacion/generar` con {anio, mes, emision, vencimiento}.
2) SP crea facturas `ABIERTA` por contratos activos en ese periodo.

**Registrar pago y aplicar**
1) `POST /pagos` → crea pago con `saldo_no_aplicado = monto`.
2) `POST /pagos/:id/aplicar` a una `factura` (trigger actualiza `saldo_pendiente` y estado).

**Finalizar contrato**
1) Cambiar `estado = FINALIZADO`.
2) Trigger libera propiedad si no quedan contratos activos.

---

> **Listo**: con este plan, puedes asignar tareas al equipo/IA por módulo, asegurar calidad (tests, RBAC, auditoría) y mantener la UI coherente para es-GT.


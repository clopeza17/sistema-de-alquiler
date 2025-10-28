# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: TypeScript + Express API (entry `src/index.ts`, builds to `dist/`).
- `mysql/`: scripts de inicialización (e.g., `mysql/init/01-init.sql`).
- `docker-compose.yml`: MySQL 8 + phpMyAdmin (http://localhost:8080).
- Entorno: `.env.example` (raíz y `backend/`) → copiar a `.env`.
- Pruebas manuales: `validar-*.sh`, `test-endpoints.js`, `test-*.html`.
- Documentos: `README.md`, `flow.md`, `plan.md`, `plan_implementacion_frontend_backend.md`.

## Build, Test, and Development Commands
- Setup: `cd backend && npm install`.
- DB local: `docker compose up -d` (semillas desde `mysql/init/`).
- Dev server: `npm run dev` (watch TS). Crear admin: `backend/create-admin.sh`.
- Build/Run: `npm run build` → `npm start` (ejecuta `dist/index.js`).
- Lint/format: `npm run lint` | `npm run lint:fix` | `npm run format`.
- Tests: `npm test` | `npm run test:coverage` (Vitest + Supertest). Ayuda: `node test-endpoints.js`.

## Coding Style & Naming Conventions
- TypeScript estricto; indentación de 2 espacios.
- Importaciones con alias de `tsconfig.json` (p.ej., `@/config/env`).
- Archivos/controladores en camelCase (`usersController.ts`); endpoints REST en plural y kebab-case (`/api/v1/propiedades`).
- ESLint + Prettier. Textos y mensajes en es-GT.

## Testing Guidelines
- Framework: Vitest + Supertest.
- Ubicación: tests `*.test.ts` junto a `src/` (excluidos del build).
- Cobertura: mínimo ≥70% (ideal 80%) en controladores/middlewares; cubrir auth, validaciones y casos de conflicto.
- Ejecutar: `cd backend && npm test`. Validación manual con `validar-*.sh`.

## Commit & Pull Request Guidelines
- Mensajes: usa Conventional Commits (`feat:`, `fix:`, `chore:`). El historial es mixto; adopta este estándar.
- Ramas: `feature/<scope>`, `fix/<scope>`, `chore/<scope>`.
- PRs: descripción breve, issue enlazado, notas de pruebas (curl/Postman) y logs. Requiere `lint` y `test` verdes.

## Architecture & Security
- Base API: `/api/v1`; respuesta `{ data|error, meta }`; paginación `?page&limit`.
- Módulos: auth/roles/usuarios, inquilinos, propiedades, contratos, facturación, pagos, gastos, mantenimiento, reportes (ver `flow.md` y plan).
- RBAC: roles `ADMIN` y `OPER` vía `middlewareRBAC`. Auditoría activa (`middlewares/audit.ts`).
- Localización: TZ `America/Guatemala (-06:00)`, fechas `dd/mm/aaaa` en UI, `YYYY-MM-DD` en API, moneda GTQ.
- Config: no comprometer secretos; usar `.env`. Alinear `DB_*` con `docker-compose.yml`.
- Seguridad: `helmet`, `cors`, rate limiting, validaciones con Zod; aplica en nuevas rutas.

## Checklist de Entrega
- `.env.example` completos y `.env` locales configurados.
- Base de datos corriendo con `docker compose up -d` y semillas aplicadas.
- Lint y pruebas en verde: `npm run lint` y `npm test` (cobertura ≥70%).
- Usuario admin creado: `backend/create-admin.sh` (documentar credenciales demo).
- RBAC activo en endpoints sensibles; rate limiting y Helmet/CORS habilitados.
- Manejo de errores consistente `{ error: { code, message } }` y logs útiles.
- Colección Postman/Insomnia o Swagger básico disponible.
- Scripts `dev`, `build`, `start`, `test` funcionando.

## Notas de Implementación Reciente (Frontend + Backend)

- Estándar UI aplicado en módulos (Usuarios, Inquilinos, Propiedades, Contratos):
  - Botón “Nuevo …” abre modal de creación (React Hook Form + Zod).
  - Acciones en tabla agrupadas en menú de tres puntos (⋮): Editar / Activar/Desactivar / Eliminar; en Contratos también Renovar/Finalizar/Ver Facturas.
  - Modo oscuro por defecto (`<html class="dark">`) y clases `dark:` en componentes.
  - Icono/Logo: colocar `edifico.png` en `frontend/public/edifico.png` (favicon y login). Realizar hard reload para refrescar cache del navegador.

- Gastos fijos:
  - Endpoint `/api/v1/gastos` con filtros por propiedad, tipo y rango de fechas.
  - Validaciones con Zod, auditoría y RBAC (`ADMIN`, `OPER`).
  - Catálogo de tipos disponible en `/api/v1/gastos/catalogo/tipos`.

- Mantenimiento:
  - Endpoint `/api/v1/mantenimiento` para tickets, filtros y cambio de estado.
  - Estados y prioridades alineados al esquema (`ABIERTA`, `EN_PROCESO`, etc.).
  - Cancelación vía `DELETE /mantenimiento/:id` (marca estado `CANCELADA`).

- Usuarios:
  - Frontend usa “Nombre completo” en formularios (un único campo). Backend acepta `nombre_completo` o (`nombres` + `apellidos`) y almacena en `usuarios.nombre_completo`.
  - Restablecimiento de contraseña desde modal de edición (ADMIN o el propio usuario).

- Inquilinos:
  - CRUD completo con validación Zod (nombre completo obligatorio, correo/teléfono/dirección opcionales).
  - Cambios de estado (activar/desactivar) desde menú ⋮.

- Propiedades:
  - CRUD completo (backend `/api/v1/propiedades`) con modal de edición (código, tipo, título, dirección, dormitorios, baños, m², renta, depósito, notas y estado).

- Contratos:
  - Columnas y nombres alineados a la BD (renta_mensual, estado CANCELADO). Evitar placeholders en LIMIT/OFFSET.
  - Validaciones de fecha con regex ISO (YYYY-MM-DD) en Zod.
  - Frontend con lista, filtros (estado/propiedad/inquilino/fechas), modales de Crear/Editar/Renovar/Finalizar y “Ver facturas”.

## Scripts de utilidad

- `iniciar-sistema.sh`: inicia MySQL (docker), backend (dev) y frontend (vite), hace `npm install` si falta y tail de logs; Ctrl+C detiene solo lo lanzado por el script.
- `iniciar-sistema-stop.sh`: detiene procesos; `STOP_DB=1` para parar contenedor MySQL.

## Convenciones adicionales

- Fechas: UI usa `input type=date`; API recibe `YYYY-MM-DD`.
- Estado visual: chips pastel (verde ACTIVO / rojo INACTIVO) con variantes dark.
- Roles: selección única (listbox); al seleccionar un rol se deshabilitan los demás hasta deseleccionar.


## Próximo Enfoque: Pruebas y Documentación
- Ampliar cobertura de Vitest (usuarios, contratos, reportes y módulos nuevos).
- Documentar endpoints recientes en Postman/Swagger.
- Sincronizar README/plan con las últimas rutas disponibles.

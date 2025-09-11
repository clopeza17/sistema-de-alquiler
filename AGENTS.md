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

## Próximo Módulo: Contratos
- Endpoints: `GET/POST /contratos`, `GET/PUT /contratos/:id`, `POST /contratos/:id/finalizar`, `POST /contratos/:id/renovar`.
- Reglas: propiedad en estado `DISPONIBLE`, `fecha_inicio <= fecha_fin`, un solo `ACTIVO` por propiedad.
- Tareas:
  - Implementar/ajustar `controllers/contratosController.ts` y rutas en `routes/contratosRoutes.ts`.
  - Validaciones con Zod y transacciones en operaciones críticas.
  - Tests con Supertest para flujos feliz y conflictos (409): solapamiento de fechas, propiedad ocupada.
  - Actualizar documentación (flow/plan) y ejemplos de curl/Postman.

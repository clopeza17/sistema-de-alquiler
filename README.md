# Sistema de Alquiler

Aplicación de gestión de alquileres con React, API Express y MySQL.

## Ejecutar todo con Docker

1. Copia `.env.example` a `.env` y reemplaza `JWT_SECRET` con un valor aleatorio de al menos 32 caracteres. Puedes generar uno con `openssl rand -hex 32`.
2. Inicia los servicios:

   ```bash
   docker compose up -d --build
   ```

3. Abre la aplicación en <http://localhost:3000>. La API queda en <http://localhost:3001/health> y phpMyAdmin en <http://localhost:8080>.

4. Crea el usuario administrador desde una terminal. El correo predeterminado es `admin@example.com` y el script pedirá una contraseña:

   ```bash
   ./backend/create-admin.sh
   ```

   Puedes indicar otro correo con `ADMIN_EMAIL`. Si lo ejecutas de nuevo con el mismo correo, actualizará la contraseña y asegurará el rol `ADMIN`.

El frontend envía `/api/` al backend dentro de la red de Docker. MySQL se inicializa desde `mysql/init/` cuando se crea el volumen por primera vez. Los puertos y las credenciales de MySQL se pueden cambiar en `.env` antes del primer inicio.

Para revisar el estado y los registros:

```bash
docker compose ps
docker compose logs -f backend frontend mysql
```

Para detener la aplicación sin borrar los datos:

```bash
docker compose down
```

`docker compose down -v` elimina también el volumen de MySQL y todos los datos guardados allí.

## Servicios y puertos predeterminados

| Servicio | URL o puerto | Uso |
| --- | --- | --- |
| Frontend | <http://localhost:3000> | Aplicación web |
| Backend | <http://localhost:3001/health> | API y verificación de salud |
| MySQL | `localhost:3306` | Base de datos `sistema_alquiler` |
| phpMyAdmin | <http://localhost:8080> | Administración de MySQL |

Los puertos se configuran con `FRONTEND_PORT`, `BACKEND_PORT`, `MYSQL_PORT` y `PHPMYADMIN_PORT` en `.env`. El usuario de MySQL para la aplicación es `app_user`, con la contraseña definida en `MYSQL_PASSWORD`.

La semilla SQL no incluye credenciales de administrador. El script guarda la contraseña como hash bcrypt en MySQL; ninguna contraseña de administrador se guarda en Git.

## Fase 2 · Calidad y promoción

Trabaja desde la raíz de este repositorio con Node.js 22, npm, Docker Compose y Git.
La base inicial de las pruebas se midió sobre el código de `7af7967`. El registro
está en `quality/baseline/unit-coverage.json`.

```sh
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix quality/runner ci
npm --prefix backend run build
npm --prefix frontend run build
npm --prefix backend run test:coverage -- --threads=false
npm --prefix frontend test -- --threads=false
node quality/scripts/check-unit-coverage.mjs
```

El informe del backend queda en `backend/coverage/`. La comprobación exige
al menos 20 puntos porcentuales de aumento y 70 % de líneas en cada uno de
Contratos, Facturación y Pagos. Para SonarQube define `SONAR_HOST_URL` y
`SONAR_TOKEN` para el proyecto `acs-sistema-alquiler`, y ejecuta:

```sh
quality/runner/node_modules/.bin/sonar-scanner-npm
```

El archivo `sonar-project.properties` activa la espera de la puerta de calidad.
Después de aprobarla, ejecuta Newman:

```sh
quality/scripts/test-api-docker.sh
```

El script crea su propio proyecto Compose, genera credenciales de prueba y
elimina al finalizar el volumen temporal de esa ejecución. La colección de
Postman está en `quality/postman/acs-fase2.postman_collection.json`. El resultado
en `quality-results/api.json` incluye códigos y aserciones sin tokens, contraseñas
ni cuerpos de las solicitudes. Importa la colección en Postman con un entorno
que defina `baseUrl`, `adminEmail` y `adminPassword` sobre un esquema limpio de QA.

### Promoción y despliegue

1. Las ramas `feature/*`, `fix/*` y `chore/*` se integran en `dev` mediante PR.
2. La promoción a `qa` se hace mediante PR desde `dev`. El PR de `qa` a
   `main` promueve a producción.
3. En GitHub configura `Calidad ACS` como verificación obligatoria para `qa`
   y `main`, exige actualización con la rama destino y limita los cambios a PR.
   Cuando haya otro integrante, configura una aprobación de su revisión.

El flujo `.github/workflows/quality.yml` compila, ejecuta Vitest, comprueba
SonarQube con una instancia del runner y ejecuta Newman en una base nueva.
En un `push` a `dev`, `qa` o `main`, despliega si las comprobaciones pasaron.
`main` usa el ambiente `prod`. Cada ambiente requiere `ACS_DEPLOY_HOST`
(variable), `ACS_DEPLOY_KEY` y `ACS_KNOWN_HOSTS` (secretos).

Prepara una carpeta `/opt/acs-fase2/<ambiente>` escribible por la cuenta SSH
de despliegue, con un `.env` de permisos restringidos. Usa el nombre de esquema
`sistema_alquiler` requerido por el SQL y define puertos distintos por ambiente,
`ACS_WEB_ORIGIN`, credenciales MySQL y un `JWT_SECRET` aleatorio. En cloud,
MySQL queda en la red interna de Compose. La interfaz y la API se publican en
loopback para acceso por túnel SSH o mediante un proxy TLS del ambiente.

Si vas a desplegar el mismo commit desde una terminal que ya tiene acceso SSH:

```sh
ACS_DEPLOY_HOST=usuario@servidor quality/deploy/publish.sh qa
```

El script sube únicamente el contenido del commit, levanta el proyecto Compose
del ambiente y actualiza el enlace `current` después de los controles de salud.

### Carga de QA

Usa la cuenta sintética `qa-acs@example.invalid` en el QA cloud y prepara los
datos de `quality/load/seed-qa.sql`. Comprueba los cuatro conteos antes de ejecutar.
Abre el túnel a los puertos de QA y exporta las variables
`ACS_LOAD_BASE_URL`, `ACS_LOAD_EMAIL` y `ACS_LOAD_PASSWORD`. Ejecuta:

```sh
mkdir -p quality-results
ACS_LOAD_ENV="QA cloud" k6 run quality/load/acs-load.js
```

El perfil sube de 0 a 50 usuarios en un minuto, mantiene 50 durante cinco
minutos y baja a cero en 30 segundos. Consulta contratos y facturas, registra
p95 por ruta y separa respuestas 5xx y 429. El informe queda en
`quality-results/load.json`.

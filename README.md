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

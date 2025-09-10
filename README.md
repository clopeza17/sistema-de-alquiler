# Sistema de Alquiler

Sistema de gestión de alquileres de propiedades con base de datos MySQL.

## Configuración inicial

1. **Clonar variables de entorno:**
   ```bash
   cp .env.example .env
   ```

2. **Modificar credenciales** en el archivo `.env` si es necesario.

## Ejecutar con Docker

### Iniciar los servicios
```bash
docker-compose up -d
```

### Verificar que los contenedores estén corriendo
```bash
docker-compose ps
```

### Acceder a los servicios

- **MySQL:** `localhost:3306`
  - Usuario: `app_user`
  - Contraseña: `app_password`
  - Base de datos: `sistema_alquiler`

- **phpMyAdmin:** http://localhost:8080
  - Usuario: `root`
  - Contraseña: `root_password`

## Estructura de la base de datos

La base de datos incluye las siguientes tablas:

- **usuarios:** Propietarios, inquilinos y administradores
- **propiedades:** Inmuebles disponibles para alquiler
- **alquileres:** Contratos de alquiler activos
- **pagos:** Registro de pagos mensuales

## Comandos útiles

### Detener los servicios
```bash
docker-compose down
```

### Ver logs
```bash
docker-compose logs mysql
docker-compose logs phpmyadmin
```

### Hacer backup de la base de datos
```bash
docker exec sistema_alquiler_mysql mysqldump -u root -proot_password sistema_alquiler > backup.sql
```

### Restaurar backup
```bash
docker exec -i sistema_alquiler_mysql mysql -u root -proot_password sistema_alquiler < backup.sql
```

## Desarrollo

Para desarrollo, puedes conectarte directamente a MySQL usando las credenciales configuradas en el archivo `.env`.

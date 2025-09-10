#!/bin/bash

# Script para crear usuario administrador inicial

echo "🔄 Creando usuario administrador inicial..."

# Usar el endpoint de register para crear el admin
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sistema.com",
    "password": "Admin123456",
    "nombres": "Administrador",
    "apellidos": "Sistema",
    "telefono": "12345678"
  }' \
  | jq .

echo ""
echo "🔧 Actualizando roles del usuario a ADMIN..."

# Conectar a MySQL y cambiar el rol a ADMIN
docker exec -i sistema_alquiler_mysql mysql -u admin -padmin123 sistema_alquiler << EOF
-- Buscar el ID del usuario admin
SELECT @user_id := id FROM usuarios WHERE email = 'admin@sistema.com';

-- Buscar el ID del rol ADMIN  
SELECT @admin_role_id := id FROM roles WHERE nombre = 'ADMIN';

-- Eliminar rol INQUILINO por defecto
DELETE FROM user_roles WHERE user_id = @user_id;

-- Asignar rol ADMIN
INSERT INTO user_roles (user_id, role_id, created_at) VALUES (@user_id, @admin_role_id, NOW());

-- Verificar
SELECT 
  u.email,
  u.nombres,
  r.nombre as rol
FROM usuarios u
JOIN user_roles ur ON u.id = ur.user_id  
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'admin@sistema.com';
EOF

echo ""
echo "✅ Usuario administrador creado exitosamente"
echo "📧 Email: admin@sistema.com"
echo "🔑 Password: Admin123456"

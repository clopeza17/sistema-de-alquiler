#!/bin/bash

# Script de pruebas para el módulo de inquilinos
# Ejecutar desde la terminal

echo "🧪 Iniciando pruebas del módulo de inquilinos..."

# Variables
API_BASE="http://localhost:3001/api/v1"
TOKEN=""

# 1. Login
echo "1. 🔐 Obteniendo token de autenticación..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sistema.com",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Error obteniendo token"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "✅ Token obtenido: ${TOKEN:0:50}..."

# 2. Listar inquilinos
echo
echo "2. 📋 Listando inquilinos..."
curl -s -X GET "$API_BASE/inquilinos" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 3. Crear nuevo inquilino
echo
echo "3. 📝 Creando nuevo inquilino..."
CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/inquilinos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "doc_identidad": "9999888777666",
    "nombre_completo": "Ana María González",
    "telefono": "99887766",
    "correo": "ana.gonzalez@test.com",
    "direccion": "6ta Calle 15-30, Zona 12, Guatemala"
  }')

echo $CREATE_RESPONSE | jq .

NUEVO_ID=$(echo $CREATE_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

# 4. Obtener inquilino específico
if [ ! -z "$NUEVO_ID" ]; then
  echo
  echo "4. 👁️ Obteniendo inquilino ID $NUEVO_ID..."
  curl -s -X GET "$API_BASE/inquilinos/$NUEVO_ID" \
    -H "Authorization: Bearer $TOKEN" | jq .
fi

# 5. Actualizar inquilino
if [ ! -z "$NUEVO_ID" ]; then
  echo
  echo "5. ✏️ Actualizando inquilino ID $NUEVO_ID..."
  curl -s -X PUT "$API_BASE/inquilinos/$NUEVO_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "telefono": "11223344"
    }' | jq .
fi

# 6. Buscar inquilinos
echo
echo "6. 🔍 Buscando inquilinos por nombre 'Juan'..."
curl -s -X GET "$API_BASE/inquilinos?search=Juan" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo
echo "✅ Pruebas completadas!"

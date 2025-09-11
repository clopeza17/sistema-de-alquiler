#!/bin/bash

echo "🔍 VALIDACIÓN FINAL DEL MÓDULO DE INQUILINOS"
echo "==========================================="

API_BASE="http://localhost:3001/api/v1"
TIMESTAMP=$(date +%s)
UNIQUE_DOC="9999${TIMESTAMP: -9}"
ERRORS=0

# 1. Login
echo "1. 🔐 Autenticación..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sistema.com", "password": "admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    echo "✅ Login exitoso"
else
    echo "❌ Login falló"
    exit 1
fi

# 2. Listar inquilinos
echo "2. 📋 Listar inquilinos..."
LIST_RESPONSE=$(curl -s "$API_BASE/inquilinos" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LIST_RESPONSE" | grep -q '"data"'; then
    echo "✅ Listar inquilinos: OK"
    COUNT=$(echo "$LIST_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo "   Total: $COUNT inquilinos"
else
    echo "❌ Listar inquilinos: FAILED"
    ERRORS=$((ERRORS + 1))
fi

# 3. Crear inquilino
echo "3. 📝 Crear inquilino..."
CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/inquilinos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"doc_identidad\": \"$UNIQUE_DOC\",
    \"nombre_completo\": \"Prueba Validación Sistema\",
    \"telefono\": \"99887766\",
    \"correo\": \"prueba$TIMESTAMP@test.com\",
    \"direccion\": \"Dirección de prueba\"
  }")

if echo "$CREATE_RESPONSE" | grep -q '"data"'; then
    echo "✅ Crear inquilino: OK"
    NEW_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo "   Nuevo ID: $NEW_ID"
    
    # 4. Actualizar inquilino
    echo "4. ✏️ Actualizar inquilino..."
    UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE/inquilinos/$NEW_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"telefono": "11223344"}')
    
    if echo "$UPDATE_RESPONSE" | grep -q '"data"'; then
        echo "✅ Actualizar inquilino: OK"
    else
        echo "❌ Actualizar inquilino: FAILED"
        ERRORS=$((ERRORS + 1))
    fi
    
    # 5. Eliminar inquilino
    echo "5. 🗑️ Eliminar inquilino..."
    DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/inquilinos/$NEW_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$DELETE_RESPONSE" | grep -q '"message"'; then
        echo "✅ Eliminar inquilino: OK"
    else
        echo "❌ Eliminar inquilino: FAILED"
        ERRORS=$((ERRORS + 1))
    fi
    
else
    echo "❌ Crear inquilino: FAILED"
    echo "   Respuesta: $CREATE_RESPONSE"
    ERRORS=$((ERRORS + 1))
fi

# 6. Búsqueda
echo "6. 🔍 Búsqueda de inquilinos..."
SEARCH_RESPONSE=$(curl -s "$API_BASE/inquilinos?search=Juan" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SEARCH_RESPONSE" | grep -q '"data"'; then
    echo "✅ Búsqueda de inquilinos: OK"
    SEARCH_COUNT=$(echo "$SEARCH_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo "   Resultados: $SEARCH_COUNT"
else
    echo "❌ Búsqueda de inquilinos: FAILED"
    ERRORS=$((ERRORS + 1))
fi

echo
echo "==========================================="
if [ $ERRORS -eq 0 ]; then
    echo "🎉 VALIDACIÓN EXITOSA: Todos los tests pasaron"
    echo "✅ El módulo de inquilinos está funcionando correctamente"
else
    echo "⚠️  VALIDACIÓN CON ERRORES: $ERRORS test(s) fallaron"
    echo "❌ Revisar la configuración del módulo de inquilinos"
fi
echo "==========================================="

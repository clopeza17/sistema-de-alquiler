#!/bin/bash

# Validación del Módulo de Inquilinos
echo "🔍 VALIDACIÓN DEL MÓDULO DE INQUILINOS"
echo "======================================"

# Función para verificar respuesta
check_response() {
    local response="$1"
    local description="$2"
    
    if echo "$response" | grep -q '"message"' && echo "$response" | grep -q '"data"'; then
        echo "✅ $description: OK"
        return 0
    else
        echo "❌ $description: FAILED"
        echo "   Respuesta: $response"
        return 1
    fi
}

# Variables
API_BASE="http://localhost:3001/api/v1"
ERRORS=0
TIMESTAMP=$(date +%s)
# Generar DPI único de 13 dígitos: 9999 + últimos 9 dígitos del timestamp
UNIQUE_DOC="9999${TIMESTAMP: -9}"

echo
echo "1. 🔐 Probando autenticación..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sistema.com", "password": "admin123"}' 2>/dev/null)

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    echo "✅ Login exitoso"
    echo "   Token: ${TOKEN:0:50}..."
else
    echo "❌ Login falló"
    echo "   Respuesta: $LOGIN_RESPONSE"
    ERRORS=$((ERRORS + 1))
fi

if [ ! -z "$TOKEN" ]; then
    echo
    echo "2. 📋 Probando listar inquilinos..."
    LIST_RESPONSE=$(curl -s -X GET "$API_BASE/inquilinos" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    if check_response "$LIST_RESPONSE" "Listar inquilinos"; then
        # Contar inquilinos
        COUNT=$(echo "$LIST_RESPONSE" | grep -o '"inquilinos":\[[^]]*\]' | grep -o '{"id"' | wc -l)
        echo "   Inquilinos encontrados: $COUNT"
    else
        ERRORS=$((ERRORS + 1))
    fi

    echo
    echo "3. 👁️ Probando obtener inquilino específico..."
    GET_RESPONSE=$(curl -s -X GET "$API_BASE/inquilinos/1" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    if check_response "$GET_RESPONSE" "Obtener inquilino específico"; then
        NAME=$(echo "$GET_RESPONSE" | grep -o '"nombre_completo":"[^"]*"' | cut -d'"' -f4)
        echo "   Nombre: $NAME"
    else
        ERRORS=$((ERRORS + 1))
    fi

    echo
    echo "4. 📝 Probando crear inquilino..."
    CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/inquilinos" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"doc_identidad\": \"$UNIQUE_DOC\",
        \"nombre_completo\": \"Prueba Validación Sistema\",
        \"telefono\": \"99887766\",
        \"correo\": \"prueba$TIMESTAMP@test.com\",
        \"direccion\": \"Dirección de prueba\"
      }" 2>/dev/null)
    
    if check_response "$CREATE_RESPONSE" "Crear inquilino"; then
        NEW_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        echo "   Nuevo ID: $NEW_ID"
    else
        ERRORS=$((ERRORS + 1))
    fi

    if [ ! -z "$NEW_ID" ]; then
        echo
        echo "5. ✏️ Probando actualizar inquilino..."
        UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE/inquilinos/$NEW_ID" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $TOKEN" \
          -d '{"telefono": "11223344"}' 2>/dev/null)
        
        if check_response "$UPDATE_RESPONSE" "Actualizar inquilino"; then
            NEW_PHONE=$(echo "$UPDATE_RESPONSE" | grep -o '"telefono":"[^"]*"' | cut -d'"' -f4)
            echo "   Nuevo teléfono: $NEW_PHONE"
        else
            ERRORS=$((ERRORS + 1))
        fi

        echo
        echo "6. 🗑️ Probando eliminar inquilino..."
        DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/inquilinos/$NEW_ID" \
          -H "Authorization: Bearer $TOKEN" 2>/dev/null)
        
        if echo "$DELETE_RESPONSE" | grep -q '"message"'; then
            echo "✅ Eliminar inquilino: OK"
        else
            echo "❌ Eliminar inquilino: FAILED"
            echo "   Respuesta: $DELETE_RESPONSE"
            ERRORS=$((ERRORS + 1))
        fi

        echo
        echo "7. 🔄 Probando reactivar inquilino..."
        REACTIVATE_RESPONSE=$(curl -s -X POST "$API_BASE/inquilinos/$NEW_ID/reactivar" \
          -H "Authorization: Bearer $TOKEN" 2>/dev/null)
        
        if echo "$REACTIVATE_RESPONSE" | grep -q '"message"'; then
            echo "✅ Reactivar inquilino: OK"
        else
            echo "❌ Reactivar inquilino: FAILED"
            echo "   Respuesta: $REACTIVATE_RESPONSE"
            ERRORS=$((ERRORS + 1))
        fi
    fi

    echo
    echo "8. 🔍 Probando búsqueda de inquilinos..."
    SEARCH_RESPONSE=$(curl -s -X GET "$API_BASE/inquilinos?search=Juan" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    if check_response "$SEARCH_RESPONSE" "Búsqueda de inquilinos"; then
        SEARCH_COUNT=$(echo "$SEARCH_RESPONSE" | grep -o '"inquilinos":\[[^]]*\]' | grep -o '{"id"' | wc -l)
        echo "   Resultados de búsqueda: $SEARCH_COUNT"
    else
        ERRORS=$((ERRORS + 1))
    fi
fi

echo
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo "🎉 VALIDACIÓN EXITOSA: Todos los tests pasaron"
    echo "✅ El módulo de inquilinos está funcionando correctamente"
else
    echo "⚠️  VALIDACIÓN CON ERRORES: $ERRORS test(s) fallaron"
    echo "❌ Revisar la configuración del módulo de inquilinos"
fi
echo "======================================"

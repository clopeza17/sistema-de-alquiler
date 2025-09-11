#!/bin/bash

echo "🏠 VALIDACIÓN DEL MÓDULO DE PROPIEDADES"
echo "======================================="

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
# Generar código único para pruebas
UNIQUE_CODE="TEST${TIMESTAMP: -6}"

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
    exit 1
fi

echo
echo "2. 🏠 Probando listar propiedades..."
LIST_RESPONSE=$(curl -s -X GET "$API_BASE/propiedades" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

if check_response "$LIST_RESPONSE" "Listar propiedades"; then
    # Contar propiedades
    COUNT=$(echo "$LIST_RESPONSE" | grep -o '"propiedades":\[[^]]*\]' | grep -o '{"id"' | wc -l)
    echo "   Propiedades encontradas: $COUNT"
else
    ERRORS=$((ERRORS + 1))
fi

echo
echo "3. 👁️ Probando obtener propiedad específica..."
GET_RESPONSE=$(curl -s -X GET "$API_BASE/propiedades/1" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

if check_response "$GET_RESPONSE" "Obtener propiedad específica"; then
    TITULO=$(echo "$GET_RESPONSE" | grep -o '"titulo":"[^"]*"' | cut -d'"' -f4)
    echo "   Título: $TITULO"
else
    ERRORS=$((ERRORS + 1))
fi

echo
echo "4. 📝 Probando crear propiedad..."
CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/propiedades" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"codigo\": \"$UNIQUE_CODE\",
    \"tipo\": \"APARTAMENTO\",
    \"titulo\": \"Propiedad de Prueba Sistema\",
    \"direccion\": \"Dirección de prueba para validación\",
    \"dormitorios\": 2,
    \"banos\": 1,
    \"area_m2\": 75.5,
    \"renta_mensual\": 3500.00,
    \"deposito\": 3500.00,
    \"estado\": \"DISPONIBLE\",
    \"notas\": \"Propiedad creada para validación del sistema\"
  }" 2>/dev/null)

if check_response "$CREATE_RESPONSE" "Crear propiedad"; then
    NEW_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo "   Nuevo ID: $NEW_ID"
    
    echo
    echo "5. ✏️ Probando actualizar propiedad..."
    UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE/propiedades/$NEW_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"renta_mensual": 3750.00, "notas": "Renta actualizada para validación"}' 2>/dev/null)
    
    if check_response "$UPDATE_RESPONSE" "Actualizar propiedad"; then
        NEW_RENT=$(echo "$UPDATE_RESPONSE" | grep -o '"renta_mensual":[0-9.]*' | cut -d':' -f2)
        echo "   Nueva renta: Q$NEW_RENT"
    else
        ERRORS=$((ERRORS + 1))
    fi

    echo
    echo "6. 🖼️ Probando agregar imagen a propiedad..."
    IMAGE_RESPONSE=$(curl -s -X POST "$API_BASE/propiedades/$NEW_ID/imagenes" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{
        "url": "https://example.com/imagen-prueba.jpg",
        "principal": true
      }' 2>/dev/null)
    
    if check_response "$IMAGE_RESPONSE" "Agregar imagen"; then
        IMAGE_ID=$(echo "$IMAGE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        echo "   ID de imagen: $IMAGE_ID"
        
        echo
        echo "7. 🖼️ Probando listar imágenes de propiedad..."
        IMAGES_LIST_RESPONSE=$(curl -s -X GET "$API_BASE/propiedades/$NEW_ID/imagenes" \
          -H "Authorization: Bearer $TOKEN" 2>/dev/null)
        
        if check_response "$IMAGES_LIST_RESPONSE" "Listar imágenes"; then
            IMAGE_COUNT=$(echo "$IMAGES_LIST_RESPONSE" | grep -o '"imagenes":\[[^]]*\]' | grep -o '{"id"' | wc -l)
            echo "   Imágenes encontradas: $IMAGE_COUNT"
        else
            ERRORS=$((ERRORS + 1))
        fi
        
        echo
        echo "8. 🗑️ Probando eliminar imagen..."
        DELETE_IMAGE_RESPONSE=$(curl -s -X DELETE "$API_BASE/propiedades/$NEW_ID/imagenes/$IMAGE_ID" \
          -H "Authorization: Bearer $TOKEN" 2>/dev/null)
        
        if echo "$DELETE_IMAGE_RESPONSE" | grep -q '"message"'; then
            echo "✅ Eliminar imagen: OK"
        else
            echo "❌ Eliminar imagen: FAILED"
            echo "   Respuesta: $DELETE_IMAGE_RESPONSE"
            ERRORS=$((ERRORS + 1))
        fi
    else
        ERRORS=$((ERRORS + 1))
    fi

    echo
    echo "9. 🗑️ Probando eliminar propiedad..."
    DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/propiedades/$NEW_ID" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    if echo "$DELETE_RESPONSE" | grep -q '"message"'; then
        echo "✅ Eliminar propiedad: OK"
    else
        echo "❌ Eliminar propiedad: FAILED"
        echo "   Respuesta: $DELETE_RESPONSE"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "❌ Crear propiedad: FAILED"
    echo "   Respuesta: $CREATE_RESPONSE"
    ERRORS=$((ERRORS + 1))
fi

echo
echo "10. 🔍 Probando búsqueda y filtros..."
SEARCH_RESPONSE=$(curl -s -X GET "$API_BASE/propiedades?search=Zona&tipo=APARTAMENTO&estado=DISPONIBLE" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

if check_response "$SEARCH_RESPONSE" "Búsqueda con filtros"; then
    SEARCH_COUNT=$(echo "$SEARCH_RESPONSE" | grep -o '"propiedades":\[[^]]*\]' | grep -o '{"id"' | wc -l)
    echo "   Resultados de búsqueda: $SEARCH_COUNT"
else
    ERRORS=$((ERRORS + 1))
fi

echo
echo "11. 💰 Probando filtro de renta..."
RENT_FILTER_RESPONSE=$(curl -s -X GET "$API_BASE/propiedades?min_renta=3000&max_renta=5000" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null)

if check_response "$RENT_FILTER_RESPONSE" "Filtro por renta"; then
    RENT_COUNT=$(echo "$RENT_FILTER_RESPONSE" | grep -o '"propiedades":\[[^]]*\]' | grep -o '{"id"' | wc -l)
    echo "   Propiedades en rango de renta: $RENT_COUNT"
else
    ERRORS=$((ERRORS + 1))
fi

echo
echo "======================================="
if [ $ERRORS -eq 0 ]; then
    echo "🎉 VALIDACIÓN EXITOSA: Todos los tests pasaron"
    echo "✅ El módulo de propiedades está funcionando correctamente"
else
    echo "⚠️  VALIDACIÓN CON ERRORES: $ERRORS test(s) fallaron"
    echo "❌ Revisar la configuración del módulo de propiedades"
fi
echo "======================================="

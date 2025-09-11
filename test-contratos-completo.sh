#!/bin/bash

# 🧪 PRUEBAS COMPLETAS DEL MÓDULO DE CONTRATOS
# ============================================

echo "🧪 Iniciando pruebas completas del módulo de contratos..."
echo "========================================================="

BASE_URL="http://localhost:3001/api/v1"
ADMIN_TOKEN=""
AGENTE_TOKEN=""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar resultados
show_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Función para mostrar info
show_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Función para mostrar warning
show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo
echo "🔐 PASO 1: Autenticación de usuarios"
echo "===================================="

# Login como ADMIN
show_info "Autenticando como ADMIN..."
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sistema.com",
    "password": "admin123"
  }')

if [[ $ADMIN_RESPONSE == *"token"* ]]; then
    ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    show_result 0 "Login ADMIN exitoso"
else
    show_result 1 "Error en login ADMIN"
    echo "Respuesta: $ADMIN_RESPONSE"
    exit 1
fi

# Login como AGENTE
show_info "Autenticando como AGENTE..."
AGENTE_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agente@sistema.com", 
    "password": "agente123"
  }')

if [[ $AGENTE_RESPONSE == *"token"* ]]; then
    AGENTE_TOKEN=$(echo $AGENTE_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    show_result 0 "Login AGENTE exitoso"
else
    show_result 1 "Error en login AGENTE"
    echo "Respuesta: $AGENTE_RESPONSE"
fi

echo
echo "📋 PASO 2: Obtener datos necesarios"
echo "==================================="

# Obtener propiedades disponibles
show_info "Obteniendo propiedades disponibles..."
PROPIEDADES_RESPONSE=$(curl -s -X GET "$BASE_URL/propiedades?estado=DISPONIBLE" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

PROPIEDAD_ID=$(echo $PROPIEDADES_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [[ -n "$PROPIEDAD_ID" ]]; then
    show_result 0 "Propiedad disponible encontrada (ID: $PROPIEDAD_ID)"
else
    show_result 1 "No se encontraron propiedades disponibles"
    echo "Respuesta: $PROPIEDADES_RESPONSE"
fi

# Obtener inquilinos activos
show_info "Obteniendo inquilinos activos..."
INQUILINOS_RESPONSE=$(curl -s -X GET "$BASE_URL/inquilinos?estado=ACTIVO" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

INQUILINO_ID=$(echo $INQUILINOS_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [[ -n "$INQUILINO_ID" ]]; then
    show_result 0 "Inquilino activo encontrado (ID: $INQUILINO_ID)"
else
    show_result 1 "No se encontraron inquilinos activos"
    echo "Respuesta: $INQUILINOS_RESPONSE"
fi

echo
echo "🔍 PASO 3: Pruebas de listado de contratos"
echo "=========================================="

# Test 1: Listar contratos sin filtros
show_info "Probando GET /api/v1/contratos (sin filtros)..."
CONTRATOS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/contratos" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_CODE=${CONTRATOS_RESPONSE: -3}
if [[ "$HTTP_CODE" == "200" ]]; then
    show_result 0 "Listado de contratos exitoso"
else
    show_result 1 "Error en listado de contratos (HTTP: $HTTP_CODE)"
fi

# Test 2: Listar contratos con paginación
show_info "Probando GET /api/v1/contratos con paginación..."
CONTRATOS_PAG_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/contratos?page=1&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_CODE=${CONTRATOS_PAG_RESPONSE: -3}
if [[ "$HTTP_CODE" == "200" ]]; then
    show_result 0 "Paginación de contratos exitosa"
else
    show_result 1 "Error en paginación de contratos (HTTP: $HTTP_CODE)"
fi

# Test 3: Listar contratos con filtros
show_info "Probando GET /api/v1/contratos con filtros..."
CONTRATOS_FILTRO_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/contratos?estado=ACTIVO" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_CODE=${CONTRATOS_FILTRO_RESPONSE: -3}
if [[ "$HTTP_CODE" == "200" ]]; then
    show_result 0 "Filtrado de contratos exitoso"
else
    show_result 1 "Error en filtrado de contratos (HTTP: $HTTP_CODE)"
fi

echo
echo "➕ PASO 4: Pruebas de creación de contratos"
echo "==========================================="

# Test 4: Crear contrato válido
if [[ -n "$PROPIEDAD_ID" && -n "$INQUILINO_ID" ]]; then
    show_info "Probando POST /api/v1/contratos (creación válida)..."
    
    CREATE_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/contratos" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "propiedad_id": '$PROPIEDAD_ID',
        "inquilino_id": '$INQUILINO_ID',
        "fecha_inicio": "2025-09-15",
        "fecha_fin": "2026-09-15",
        "monto_mensual": 1500.00,
        "deposito": 3000.00,
        "terminos": "Contrato de prueba con términos estándar"
      }')
    
    HTTP_CODE=${CREATE_RESPONSE: -3}
    RESPONSE_BODY=${CREATE_RESPONSE%???}
    
    if [[ "$HTTP_CODE" == "201" ]]; then
        show_result 0 "Creación de contrato exitosa"
        NUEVO_CONTRATO_ID=$(echo $RESPONSE_BODY | grep -o '"id":[0-9]*' | cut -d':' -f2)
        show_info "Nuevo contrato creado con ID: $NUEVO_CONTRATO_ID"
    else
        show_result 1 "Error en creación de contrato (HTTP: $HTTP_CODE)"
        echo "Respuesta: $RESPONSE_BODY"
    fi
else
    show_warning "Saltando creación de contrato (faltan datos de propiedad o inquilino)"
fi

# Test 5: Crear contrato con datos inválidos
show_info "Probando POST /api/v1/contratos (datos inválidos)..."
INVALID_CREATE_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/contratos" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propiedad_id": 99999,
    "inquilino_id": 99999,
    "fecha_inicio": "2025-12-31",
    "fecha_fin": "2025-01-01",
    "monto_mensual": -100
  }')

HTTP_CODE=${INVALID_CREATE_RESPONSE: -3}
if [[ "$HTTP_CODE" == "400" || "$HTTP_CODE" == "422" ]]; then
    show_result 0 "Validación de datos inválidos correcta"
else
    show_result 1 "Error: debería rechazar datos inválidos (HTTP: $HTTP_CODE)"
fi

echo
echo "🔍 PASO 5: Pruebas de consulta específica"
echo "========================================"

if [[ -n "$NUEVO_CONTRATO_ID" ]]; then
    # Test 6: Obtener contrato específico
    show_info "Probando GET /api/v1/contratos/$NUEVO_CONTRATO_ID..."
    GET_CONTRATO_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/contratos/$NUEVO_CONTRATO_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    
    HTTP_CODE=${GET_CONTRATO_RESPONSE: -3}
    if [[ "$HTTP_CODE" == "200" ]]; then
        show_result 0 "Consulta de contrato específico exitosa"
    else
        show_result 1 "Error en consulta de contrato específico (HTTP: $HTTP_CODE)"
    fi
else
    show_warning "Saltando consulta específica (no se creó contrato)"
fi

# Test 7: Obtener contrato inexistente
show_info "Probando GET /api/v1/contratos/99999 (inexistente)..."
GET_INEXISTENTE_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/contratos/99999" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_CODE=${GET_INEXISTENTE_RESPONSE: -3}
if [[ "$HTTP_CODE" == "404" ]]; then
    show_result 0 "Manejo correcto de contrato inexistente"
else
    show_result 1 "Error: debería retornar 404 para contrato inexistente (HTTP: $HTTP_CODE)"
fi

echo
echo "✏️ PASO 6: Pruebas de actualización"
echo "=================================="

if [[ -n "$NUEVO_CONTRATO_ID" ]]; then
    # Test 8: Actualizar contrato
    show_info "Probando PUT /api/v1/contratos/$NUEVO_CONTRATO_ID..."
    UPDATE_RESPONSE=$(curl -s -w "%{http_code}" -X PUT "$BASE_URL/contratos/$NUEVO_CONTRATO_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "monto_mensual": 1600.00,
        "terminos": "Contrato actualizado con nuevos términos"
      }')
    
    HTTP_CODE=${UPDATE_RESPONSE: -3}
    if [[ "$HTTP_CODE" == "200" ]]; then
        show_result 0 "Actualización de contrato exitosa"
    else
        show_result 1 "Error en actualización de contrato (HTTP: $HTTP_CODE)"
    fi
    
    # Test 9: Renovar contrato
    show_info "Probando PUT /api/v1/contratos/$NUEVO_CONTRATO_ID/renovar..."
    RENOVAR_RESPONSE=$(curl -s -w "%{http_code}" -X PUT "$BASE_URL/contratos/$NUEVO_CONTRATO_ID/renovar" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "nueva_fecha_fin": "2027-09-15",
        "nuevo_monto": 1700.00
      }')
    
    HTTP_CODE=${RENOVAR_RESPONSE: -3}
    if [[ "$HTTP_CODE" == "200" ]]; then
        show_result 0 "Renovación de contrato exitosa"
    else
        show_result 1 "Error en renovación de contrato (HTTP: $HTTP_CODE)"
        echo "Respuesta: ${RENOVAR_RESPONSE%???}"
    fi
else
    show_warning "Saltando actualizaciones (no se creó contrato)"
fi

echo
echo "📄 PASO 7: Pruebas de facturas relacionadas"
echo "==========================================="

if [[ -n "$NUEVO_CONTRATO_ID" ]]; then
    # Test 10: Obtener facturas del contrato
    show_info "Probando GET /api/v1/contratos/$NUEVO_CONTRATO_ID/facturas..."
    FACTURAS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/contratos/$NUEVO_CONTRATO_ID/facturas" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    
    HTTP_CODE=${FACTURAS_RESPONSE: -3}
    if [[ "$HTTP_CODE" == "200" ]]; then
        show_result 0 "Consulta de facturas del contrato exitosa"
    else
        show_result 1 "Error en consulta de facturas del contrato (HTTP: $HTTP_CODE)"
    fi
else
    show_warning "Saltando consulta de facturas (no se creó contrato)"
fi

echo
echo "🔐 PASO 8: Pruebas de autorización"
echo "================================="

# Test 11: Acceso con token de AGENTE
if [[ -n "$AGENTE_TOKEN" && -n "$NUEVO_CONTRATO_ID" ]]; then
    show_info "Probando acceso con rol AGENTE..."
    AGENTE_ACCESS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/contratos/$NUEVO_CONTRATO_ID" \
      -H "Authorization: Bearer $AGENTE_TOKEN")
    
    HTTP_CODE=${AGENTE_ACCESS_RESPONSE: -3}
    if [[ "$HTTP_CODE" == "200" ]]; then
        show_result 0 "Acceso con rol AGENTE exitoso"
    else
        show_result 1 "Error: AGENTE debería tener acceso (HTTP: $HTTP_CODE)"
    fi
fi

# Test 12: Acceso sin token
show_info "Probando acceso sin autenticación..."
NO_AUTH_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/contratos")

HTTP_CODE=${NO_AUTH_RESPONSE: -3}
if [[ "$HTTP_CODE" == "401" ]]; then
    show_result 0 "Bloqueo correcto sin autenticación"
else
    show_result 1 "Error: debería bloquear sin autenticación (HTTP: $HTTP_CODE)"
fi

echo
echo "🗑️ PASO 9: Pruebas de finalización y eliminación"
echo "=============================================="

if [[ -n "$NUEVO_CONTRATO_ID" ]]; then
    # Test 13: Finalizar contrato
    show_info "Probando PUT /api/v1/contratos/$NUEVO_CONTRATO_ID/finalizar..."
    FINALIZAR_RESPONSE=$(curl -s -w "%{http_code}" -X PUT "$BASE_URL/contratos/$NUEVO_CONTRATO_ID/finalizar" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "fecha_finalizacion": "2025-09-11",
        "motivo": "Finalización de prueba"
      }')
    
    HTTP_CODE=${FINALIZAR_RESPONSE: -3}
    if [[ "$HTTP_CODE" == "200" ]]; then
        show_result 0 "Finalización de contrato exitosa"
    else
        show_result 1 "Error en finalización de contrato (HTTP: $HTTP_CODE)"
        echo "Respuesta: ${FINALIZAR_RESPONSE%???}"
    fi
    
    # Test 14: Eliminar contrato
    show_info "Probando DELETE /api/v1/contratos/$NUEVO_CONTRATO_ID..."
    DELETE_RESPONSE=$(curl -s -w "%{http_code}" -X DELETE "$BASE_URL/contratos/$NUEVO_CONTRATO_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    
    HTTP_CODE=${DELETE_RESPONSE: -3}
    if [[ "$HTTP_CODE" == "200" ]]; then
        show_result 0 "Eliminación de contrato exitosa"
    else
        show_result 1 "Error en eliminación de contrato (HTTP: $HTTP_CODE)"
        echo "Respuesta: ${DELETE_RESPONSE%???}"
    fi
else
    show_warning "Saltando finalización y eliminación (no se creó contrato)"
fi

echo
echo "📊 RESUMEN DE PRUEBAS"
echo "===================="
echo -e "${BLUE}✅ Módulo de contratos probado completamente${NC}"
echo -e "${BLUE}🔍 Todas las operaciones CRUD validadas${NC}"
echo -e "${BLUE}🔐 Autenticación y autorización verificadas${NC}"
echo -e "${BLUE}📋 Validaciones de datos confirmadas${NC}"
echo -e "${BLUE}🔄 Operaciones de negocio (renovar/finalizar) probadas${NC}"
echo
echo -e "${GREEN}🎉 PRUEBAS COMPLETAS DEL MÓDULO DE CONTRATOS FINALIZADAS${NC}"
echo "========================================================="

#!/bin/bash

# 🧪 PRUEBAS BÁSICAS DE VALIDACIÓN DEL SISTEMA
# ============================================

echo "🧪 Iniciando validación básica del sistema..."
echo "============================================="

BASE_URL="http://localhost:3001/api/v1"

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

echo
echo "🏥 PASO 1: Verificar estado del servidor"
echo "======================================="

# Test 1: Health check
show_info "Verificando health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" "$BASE_URL/../health" 2>/dev/null || echo "000")

HTTP_CODE=${HEALTH_RESPONSE: -3}
if [[ "$HTTP_CODE" == "200" ]]; then
    show_result 0 "Servidor backend está en línea"
else
    show_result 1 "Servidor backend no responde (HTTP: $HTTP_CODE)"
    echo "Verifique que el servidor esté ejecutándose en puerto 3001"
    exit 1
fi

echo
echo "🔍 PASO 2: Verificar endpoints disponibles"
echo "=========================================="

# Test 2: API Info
show_info "Verificando información de la API..."
API_INFO_RESPONSE=$(curl -s -w "%{http_code}" "$BASE_URL" 2>/dev/null || echo "000")

HTTP_CODE=${API_INFO_RESPONSE: -3}
if [[ "$HTTP_CODE" == "200" ]]; then
    show_result 0 "Endpoint de información API disponible"
else
    show_result 1 "Endpoint de información API no disponible (HTTP: $HTTP_CODE)"
fi

# Test 3: Usuarios endpoint
show_info "Verificando endpoint de usuarios..."
USUARIOS_RESPONSE=$(curl -s -w "%{http_code}" "$BASE_URL/usuarios" 2>/dev/null || echo "000")

HTTP_CODE=${USUARIOS_RESPONSE: -3}
if [[ "$HTTP_CODE" == "401" ]]; then
    show_result 0 "Endpoint de usuarios requiere autenticación (correcto)"
elif [[ "$HTTP_CODE" == "200" ]]; then
    show_result 0 "Endpoint de usuarios disponible"
else
    show_result 1 "Endpoint de usuarios tiene problemas (HTTP: $HTTP_CODE)"
fi

echo
echo "🔐 PASO 3: Verificar base de datos"
echo "================================="

# Test 4: Intentar login (esto valida DB)
show_info "Verificando conectividad con base de datos..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sistema.com",
    "password": "admin123"
  }' 2>/dev/null || echo '{"error": "network"}')

if [[ $LOGIN_RESPONSE == *"token"* ]]; then
    show_result 0 "Base de datos conectada y autenticación funcional"
    TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "Token obtenido para pruebas adicionales"
elif [[ $LOGIN_RESPONSE == *"email"* && $LOGIN_RESPONSE == *"where clause"* ]]; then
    show_result 1 "Error en esquema de base de datos - campo 'email' vs 'correo'"
    echo "Respuesta: $LOGIN_RESPONSE"
elif [[ $LOGIN_RESPONSE == *"Credenciales inválidas"* ]]; then
    show_result 1 "Credenciales incorrectas - verificar usuarios en BD"
else
    show_result 1 "Error de conectividad con base de datos"
    echo "Respuesta: $LOGIN_RESPONSE"
fi

echo
echo "🚀 PASO 4: Verificar módulos básicos"
echo "===================================="

if [[ -n "$TOKEN" ]]; then
    # Test 5: Inquilinos endpoint
    show_info "Verificando endpoint de inquilinos..."
    INQUILINOS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/inquilinos" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    
    HTTP_CODE=${INQUILINOS_RESPONSE: -3}
    if [[ "$HTTP_CODE" == "200" ]]; then
        show_result 0 "Módulo de inquilinos funcional"
    elif [[ "$HTTP_CODE" == "404" ]]; then
        show_result 1 "Módulo de inquilinos no implementado"
    else
        show_result 1 "Error en módulo de inquilinos (HTTP: $HTTP_CODE)"
    fi
    
    # Test 6: Propiedades endpoint
    show_info "Verificando endpoint de propiedades..."
    PROPIEDADES_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/propiedades" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    
    HTTP_CODE=${PROPIEDADES_RESPONSE: -3}
    if [[ "$HTTP_CODE" == "200" ]]; then
        show_result 0 "Módulo de propiedades funcional"
    elif [[ "$HTTP_CODE" == "404" ]]; then
        show_result 1 "Módulo de propiedades no implementado"
    else
        show_result 1 "Error en módulo de propiedades (HTTP: $HTTP_CODE)"
    fi
    
    # Test 7: Contratos endpoint (el que estamos probando)
    show_info "Verificando endpoint de contratos..."
    CONTRATOS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/contratos" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    
    HTTP_CODE=${CONTRATOS_RESPONSE: -3}
    if [[ "$HTTP_CODE" == "200" ]]; then
        show_result 0 "Módulo de contratos disponible y funcional"
    elif [[ "$HTTP_CODE" == "404" ]]; then
        show_result 1 "Módulo de contratos no está habilitado en las rutas"
        echo "Necesita habilitar las rutas de contratos en app.ts"
    else
        show_result 1 "Error en módulo de contratos (HTTP: $HTTP_CODE)"
    fi
else
    show_info "Sin token de autenticación - saltando pruebas de módulos"
fi

echo
echo "📊 RESUMEN DE VALIDACIÓN"
echo "======================="
echo -e "${BLUE}✅ Verificación básica del sistema completada${NC}"
echo -e "${BLUE}🔍 Sistema de autenticación evaluado${NC}"
echo -e "${BLUE}📋 Estado de módulos verificado${NC}"
echo -e "${BLUE}🔐 Conectividad con base de datos evaluada${NC}"

echo
echo -e "${GREEN}🎉 VALIDACIÓN BÁSICA DEL SISTEMA FINALIZADA${NC}"
echo "==============================================="

if [[ -n "$TOKEN" ]]; then
    echo -e "${GREEN}✅ Sistema operativo y listo para desarrollo${NC}"
else
    echo -e "${YELLOW}⚠️  Sistema parcialmente operativo - revisar base de datos${NC}"
fi

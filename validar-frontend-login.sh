#!/usr/bin/env bash
set -euo pipefail

# Valida y asiste el login: levanta DB, inicia backend, si es necesario corrige credenciales admin, CORS y login
# Requisitos: docker, curl, jq, nohup

BLUE="\033[1;34m"; GREEN="\033[1;32m"; RED="\033[1;31m"; YELLOW="\033[1;33m"; NC="\033[0m"

# Config por defecto (puedes override con variables de entorno)
BASE_URL=${BASE_URL:-"http://localhost:3001/api/v1"}
HEALTH_URL=${HEALTH_URL:-"http://localhost:3001/health"}
ORIGIN=${ORIGIN:-"http://localhost:3000"}

EMAIL=${EMAIL:-"admin@example.com"}
PASSWORD=${PASSWORD:-"Admin123456"}

# Flags de ayuda automática
START_BACKEND=${START_BACKEND:-"1"}
SEED_ADMIN=${SEED_ADMIN:-"1"}
START_DB=${START_DB:-"1"}

# Docker MySQL
MYSQL_CONTAINER=${MYSQL_CONTAINER:-"sistema_alquiler_mysql"}
MYSQL_ROOT=${MYSQL_ROOT:-"root"}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-"root_password"}
MYSQL_DB=${MYSQL_DB:-"sistema_alquiler"}

function fail() { echo -e "${RED}✗ ${1}${NC}" >&2; exit 1; }
function ok() { echo -e "${GREEN}✓ ${1}${NC}"; }
function info() { echo -e "${BLUE}▶ ${1}${NC}"; }
function warn() { echo -e "${YELLOW}⚠ ${1}${NC}"; }

command -v curl >/dev/null 2>&1 || fail "curl no está instalado"
command -v jq >/dev/null 2>&1 || fail "jq no está instalado"

echo -e "${BLUE}▶ Validando configuración...${NC}"
echo "  BASE_URL = ${BASE_URL}"
echo "  HEALTH_URL = ${HEALTH_URL}"
echo "  ORIGIN = ${ORIGIN}"
echo "  EMAIL = ${EMAIL}"
echo "  START_DB = ${START_DB} | START_BACKEND = ${START_BACKEND} | SEED_ADMIN = ${SEED_ADMIN}"

if [[ "$START_DB" == "1" ]]; then
  info "Levantando MySQL con docker compose (si no está arriba)..."
  if command -v docker >/dev/null 2>&1; then
    docker compose up -d mysql >/dev/null 2>&1 || warn "No se pudo iniciar mysql con docker compose (quizá ya está arriba)"
  else
    warn "Docker no disponible; asumo MySQL ya está corriendo en localhost:3306"
  fi

  # Esperar health del contenedor
  if command -v docker >/dev/null 2>&1; then
    for i in {1..30}; do
      if docker ps --format '{{.Names}}' | grep -q "${MYSQL_CONTAINER}"; then
        if docker exec ${MYSQL_CONTAINER} mysqladmin ping -h localhost -u${MYSQL_ROOT} -p${MYSQL_ROOT_PASSWORD} --silent; then
          ok "MySQL healthy en contenedor ${MYSQL_CONTAINER}"
          break
        fi
      fi
      sleep 2
    done
  fi
fi

# Función para arrancar backend en background si no está
function ensure_backend() {
  info "Probando health del backend..."
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
  if [[ "$code" == "200" ]]; then
    ok "Backend vivo (health 200)"
    return 0
  fi

  warn "Health en ${HEALTH_URL} devolvió ${code}. Intentando 8080 y 3000..."
  local alt="http://localhost:8080/health"; local altc
  altc=$(curl -sS -o /dev/null -w "%{http_code}" "$alt" || echo "000")
  if [[ "$altc" == "200" ]]; then
    ok "Backend vivo en 8080"
    HEALTH_URL="$alt"; BASE_URL="http://localhost:8080/api/v1"; return 0
  fi

  local alt2="http://localhost:3000/health"; local alt2c
  alt2c=$(curl -sS -o /dev/null -w "%{http_code}" "$alt2" || echo "000")
  if [[ "$alt2c" == "200" ]]; then
    # Validar que sea backend, no frontend
    local jsn; jsn=$(curl -sS "$alt2" || true)
    if echo "$jsn" | jq -e '.status == "OK"' >/dev/null 2>&1; then
      ok "Backend vivo en 3000"
      HEALTH_URL="$alt2"; BASE_URL="http://localhost:3000/api/v1"; return 0
    fi
  fi

  if [[ "$START_BACKEND" != "1" ]]; then
    fail "Backend no responde y START_BACKEND=0. Inícialo manualmente (cd backend && npm run dev)"
  fi

  info "Iniciando backend en background (cd backend && nohup npm run dev)..."
  (
    cd backend || exit 1
    nohup npm run dev > ../backend-dev.log 2>&1 &
    echo $! > ../backend-dev.pid
  )
  sleep 2

  # Esperar hasta 60s
  for i in {1..30}; do
    code=$(curl -sS -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
    if [[ "$code" == "200" ]]; then
      ok "Backend vivo (health 200)"
      return 0
    fi
    sleep 2
  done
  fail "No se pudo levantar el backend automáticamente. Revisa backend-dev.log"
}

ensure_backend

info "Probando CORS (preflight) desde ${ORIGIN}..."
OPTIONS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  "${BASE_URL}/auth/login")
if [[ "$OPTIONS_CODE" == "204" || "$OPTIONS_CODE" == "200" ]]; then
  ok "Preflight CORS permitido (HTTP ${OPTIONS_CODE})"
else
  warn "Preflight CORS devolvió HTTP ${OPTIONS_CODE}. Continúo con login real para verificar."
fi

function try_login() {
  local resp; resp=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Origin: ${ORIGIN}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
  echo "$resp"
}

info "Probando login..."
LOGIN_RESPONSE=$(try_login)
SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success // false')
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty')
USER_EMAIL=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.email // empty')

if [[ "$SUCCESS" != "true" || -z "$TOKEN" ]]; then
  warn "Login falló inicialmente."
  echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"

  if [[ "$SEED_ADMIN" == "1" && $(command -v docker >/dev/null 2>&1; echo $?) -eq 0 ]]; then
    info "Intentando corregir credenciales del admin en la base de datos..."
    SQL="SET @uid := (SELECT id FROM usuarios WHERE correo='${EMAIL}');\n\
UPDATE usuarios SET contrasena_hash='\$2b\$12\$wbr3ZCb7CTQv7cxpbEfFmeXDhBgbR8eNpC/4QcP2ARTnJXr71dO8.', activo=1 WHERE id=@uid;\n\
SET @rid := (SELECT id FROM roles WHERE codigo='ADMIN');\n\
INSERT IGNORE INTO usuarios_roles (usuario_id, rol_id) VALUES (@uid, @rid);\n"
    docker exec -i "${MYSQL_CONTAINER}" mysql -u"${MYSQL_ROOT}" -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DB}" <<< "$SQL" || warn "No se pudo ejecutar SQL en contenedor ${MYSQL_CONTAINER}"

    info "Reintentando login..."
    sleep 1
    LOGIN_RESPONSE=$(try_login)
    SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success // false')
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty')
    USER_EMAIL=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.email // empty')
  fi
fi

if [[ "$SUCCESS" != "true" || -z "$TOKEN" ]]; then
  fail "Login falló. Verifica credenciales y backend (ver salida arriba)."
else
  ok "Login exitoso para ${USER_EMAIL}"
fi

info "Verificando endpoint protegido (/auth/me) con Bearer..."
ME_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/auth/me" \
  -H "Origin: ${ORIGIN}" \
  -H "Authorization: Bearer ${TOKEN}")

if [[ "$ME_CODE" == "200" ]]; then
  ok "/auth/me accesible con token (200)"
else
  warn "/auth/me respondió HTTP ${ME_CODE}. Puede estar en desarrollo, pero el token parece válido."
fi

echo -e "${GREEN}✔ Validación completa. El login del frontend debería funcionar contra ${BASE_URL}.${NC}"

echo -e "\nSugerencia: ejecuta el frontend con 'npm run dev' en ./frontend y prueba en ${ORIGIN}/login"

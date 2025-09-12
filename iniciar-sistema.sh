#!/usr/bin/env bash
set -euo pipefail

# Inicia DB (docker), backend (dev) y frontend (vite),
# y permite probar login ingresando credenciales manualmente.

BLUE="\033[1;34m"; GREEN="\033[1;32m"; RED="\033[1;31m"; YELLOW="\033[1;33m"; NC="\033[0m"

# Config predeterminada (puedes override con variables de entorno)
API_PORT=${API_PORT:-3001}
FRONT_PORT=${FRONT_PORT:-3000}
ORIGIN=${ORIGIN:-"http://localhost:${FRONT_PORT}"}
BASE_URL=${BASE_URL:-"http://localhost:${API_PORT}/api/v1"}
HEALTH_URL=${HEALTH_URL:-"http://localhost:${API_PORT}/health"}

# Docker/MySQL
MYSQL_CONTAINER=${MYSQL_CONTAINER:-"sistema_alquiler_mysql"}
MYSQL_ROOT=${MYSQL_ROOT:-"root"}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-"root_password"}
MYSQL_DB=${MYSQL_DB:-"sistema_alquiler"}

# Helpers
ok(){ echo -e "${GREEN}✓ $*${NC}"; }
info(){ echo -e "${BLUE}▶ $*${NC}"; }
warn(){ echo -e "${YELLOW}⚠ $*${NC}"; }
fail(){ echo -e "${RED}✗ $*${NC}"; exit 1; }

need(){ command -v "$1" >/dev/null 2>&1 || fail "$1 no está instalado"; }
need curl; need jq; need nohup;

echo -e "${BLUE}▶ Configuración${NC}"
echo "  API_PORT=${API_PORT} | FRONT_PORT=${FRONT_PORT}"
echo "  BASE_URL=${BASE_URL} | HEALTH_URL=${HEALTH_URL}"
echo "  ORIGIN=${ORIGIN}"

# 1) Iniciar MySQL
if command -v docker >/dev/null 2>&1; then
  info "Levantando MySQL (docker compose up -d mysql)"
  docker compose up -d mysql >/dev/null 2>&1 || true
  # Esperar healthy
  for i in {1..30}; do
    if docker ps --format '{{.Names}}' | grep -q "${MYSQL_CONTAINER}"; then
      if docker exec ${MYSQL_CONTAINER} mysqladmin ping -h localhost -u${MYSQL_ROOT} -p${MYSQL_ROOT_PASSWORD} --silent; then
        ok "MySQL healthy (${MYSQL_CONTAINER})"
        break
      fi
    fi
    sleep 2
  done
else
  warn "Docker no disponible; asumo MySQL en localhost:3306"
fi

# 2) Iniciar backend en background si no responde health
BACKEND_STARTED=0
info "Verificando backend en ${HEALTH_URL}"
code=$(curl -sS -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
if [[ "$code" != "200" ]]; then
  info "Iniciando backend: cd backend && (npm install si falta) && nohup npm run dev & (log: backend-dev.log)"
  (
    cd backend || exit 1
    if [[ ! -d node_modules ]]; then
      npm install >/dev/null 2>&1 || true
    fi
    nohup npm run dev > ../backend-dev.log 2>&1 & echo $! > ../backend-dev.pid
  )
  BACKEND_STARTED=1
  # Esperar hasta 60s
  for i in {1..30}; do
    code=$(curl -sS -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
    [[ "$code" == "200" ]] && break
    sleep 2
  done
fi
[[ "$code" == "200" ]] && ok "Backend arriba en ${HEALTH_URL}" || fail "Backend no responde (revisa backend-dev.log)"

START_FRONT=${START_FRONT:-"1"}
FRONT_STARTED=0
if [[ "$START_FRONT" == "1" ]]; then
  info "Verificando frontend en http://localhost:${FRONT_PORT}"
  front_code=$(curl -sS -o /dev/null -w "%{http_code}" "http://localhost:${FRONT_PORT}" || echo "000")
  if [[ "$front_code" == "000" ]]; then
    info "Iniciando frontend: cd frontend && (npm install si falta) && nohup npm run dev & (log: frontend-dev.log)"
    (
      cd frontend || exit 1
      if [[ ! -d node_modules ]]; then
        npm install >/dev/null 2>&1 || true
      fi
      nohup npm run dev > ../frontend-dev.log 2>&1 & echo $! > ../frontend-dev.pid
    )
    sleep 2
    FRONT_STARTED=1
    # Esperar a que responda el puerto del frontend
    for i in {1..30}; do
      front_code=$(curl -sS -o /dev/null -w "%{http_code}" "http://localhost:${FRONT_PORT}" || echo "000")
      [[ "$front_code" != "000" ]] && break
      sleep 2
    done
  fi
  ok "Servicios arriba. Frontend: http://localhost:${FRONT_PORT} | Backend: ${BASE_URL}"
else
  ok "Backend arriba en ${BASE_URL}"
  info "Para iniciar el frontend manualmente (recomendado para HMR):"
  echo "  1) Abre otra terminal"
  echo "  2) cd frontend"
  echo "  3) npm install (si no lo has hecho)"
  echo "  4) npm run dev (puerto ${FRONT_PORT})"
fi

# 3.1) Preparar manejo de Ctrl+C para detener procesos iniciados por este script
function cleanup() {
  echo
  info "Cerrando servicios iniciados por este script..."
  if [[ "$FRONT_STARTED" == "1" ]] && [[ -f frontend-dev.pid ]]; then
    PID=$(cat frontend-dev.pid || echo "");
    if [[ -n "$PID" ]] && ps -p "$PID" >/dev/null 2>&1; then
      kill "$PID" >/dev/null 2>&1 || true
      rm -f frontend-dev.pid
      ok "Frontend detenido (pid ${PID})"
    fi
  fi
  if [[ "$BACKEND_STARTED" == "1" ]] && [[ -f backend-dev.pid ]]; then
    PID=$(cat backend-dev.pid || echo "");
    if [[ -n "$PID" ]] && ps -p "$PID" >/dev/null 2>&1; then
      kill "$PID" >/dev/null 2>&1 || true
      rm -f backend-dev.pid
      ok "Backend detenido (pid ${PID})"
    fi
  fi
  echo -e "${GREEN}✔ Listo. Puedes cerrar esta terminal.${NC}"
  exit 0
}

trap cleanup INT TERM

# 4) Preflight CORS
info "Preflight CORS desde ${ORIGIN}"
opt=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization" \
  "${BASE_URL}/auth/login")
[[ "$opt" == "200" || "$opt" == "204" ]] && ok "CORS OK (${opt})" || warn "CORS ${opt} (continuando)"

# 5) Credenciales manuales y prueba de login
echo
echo "Ingresa credenciales para probar login (Enter para usar valores por defecto):"
read -r -p "Email [admin@example.com]: " EMAIL_INPUT || true
EMAIL=${EMAIL_INPUT:-admin@example.com}
read -r -s -p "Password [Admin123456]: " PASSWORD_INPUT || true; echo
PASSWORD=${PASSWORD_INPUT:-Admin123456}

info "Probando login con ${EMAIL}"
resp=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Origin: ${ORIGIN}" -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

success=$(echo "$resp" | jq -r '.success // false')
if [[ "$success" == "true" ]]; then
  token=$(echo "$resp" | jq -r '.data.token')
  mail=$(echo "$resp" | jq -r '.data.user.email')
  ok "Login OK para ${mail}"
  code_me=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${token}" "${BASE_URL}/auth/me")
  [[ "$code_me" == "200" ]] && ok "/auth/me 200" || warn "/auth/me ${code_me}"
else
  echo "$resp" | jq . 2>/dev/null || echo "$resp"
  warn "Login falló con las credenciales ingresadas."
  read -r -p "¿Intentar forzar credenciales del admin@example.com a esa contraseña? [s/N]: " FIX || true
  if [[ "${FIX:-N}" =~ ^[sS]$ ]] && command -v docker >/dev/null 2>&1; then
    warn "Forzar contraseña requiere hash bcrypt; se usará la contraseña por defecto Admin123456 para admin@example.com"
    SQL="SET @uid := (SELECT id FROM usuarios WHERE correo='admin@example.com');\n\
UPDATE usuarios SET contrasena_hash='\$2b\$12\$wbr3ZCb7CTQv7cxpbEfFmeXDhBgbR8eNpC/4QcP2ARTnJXr71dO8.', activo=1 WHERE id=@uid;\n\
SET @rid := (SELECT id FROM roles WHERE codigo='ADMIN');\n\
INSERT IGNORE INTO usuarios_roles (usuario_id, rol_id) VALUES (@uid, @rid);\n"
    docker exec -i "${MYSQL_CONTAINER}" mysql -u"${MYSQL_ROOT}" -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DB}" <<< "$SQL" || warn "No se pudo ejecutar SQL"
    info "Reintentando login con admin@example.com / Admin123456"
    resp=$(curl -s -X POST "${BASE_URL}/auth/login" -H "Origin: ${ORIGIN}" -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"Admin123456"}')
    success=$(echo "$resp" | jq -r '.success // false')
    [[ "$success" == "true" ]] && ok "Login OK admin@example.com" || fail "Login aún falló"
  fi
fi

echo
ok "Sistema iniciado. Abre ${ORIGIN}/login para usar la aplicación."

# 6) Mantener script corriendo para pruebas GUI y mostrar logs si los iniciamos
if [[ "$BACKEND_STARTED" == "1" || "$FRONT_STARTED" == "1" ]]; then
  echo
  info "Monitoreando logs (Ctrl+C para detener):"
  # Mostrar rutas de logs
  [[ "$BACKEND_STARTED" == "1" ]] && echo "  - backend-dev.log" || true
  [[ "$FRONT_STARTED" == "1" ]] && echo "  - frontend-dev.log" || true
  echo
  # Tail de los logs disponibles (si existen)
  TAIL_ARGS=()
  [[ -f backend-dev.log ]] && TAIL_ARGS+=(backend-dev.log)
  [[ -f frontend-dev.log ]] && TAIL_ARGS+=(frontend-dev.log)
  if [[ ${#TAIL_ARGS[@]} -gt 0 ]]; then
    tail -n +1 -F "${TAIL_ARGS[@]}" &
    TAIL_PID=$!
    wait $TAIL_PID
  else
    # No hay logs que mostrar; quedarnos activos hasta Ctrl+C
    while true; do sleep 3600; done
  fi
else
  echo
  info "Servicios ya estaban arriba. Presiona Ctrl+C para salir."
  while true; do sleep 3600; done
fi

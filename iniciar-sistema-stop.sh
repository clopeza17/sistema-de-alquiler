#!/usr/bin/env bash
set -euo pipefail

# Detiene backend/frontend iniciados por iniciar-sistema.sh
# Opcionalmente puede detener MySQL del docker-compose con STOP_DB=1

BLUE="\033[1;34m"; GREEN="\033[1;32m"; RED="\033[1;31m"; YELLOW="\033[1;33m"; NC="\033[0m"
ok(){ echo -e "${GREEN}✓ $*${NC}"; }
info(){ echo -e "${BLUE}▶ $*${NC}"; }
warn(){ echo -e "${YELLOW}⚠ $*${NC}"; }
fail(){ echo -e "${RED}✗ $*${NC}"; exit 1; }

STOP_DB=${STOP_DB:-"0"}

info "Deteniendo servicios iniciados por iniciar-sistema.sh..."

# Detener frontend si fue iniciado por el script (pid en frontend-dev.pid)
if [[ -f frontend-dev.pid ]]; then
  PID=$(cat frontend-dev.pid || echo "")
  if [[ -n "$PID" ]] && ps -p "$PID" >/dev/null 2>&1; then
    kill "$PID" >/dev/null 2>&1 || true
    ok "Frontend detenido (pid ${PID})"
  else
    warn "Frontend no estaba corriendo (pid no válido)"
  fi
  rm -f frontend-dev.pid
else
  warn "No se encontró frontend-dev.pid (frontend ya estaba iniciado o fue detenido)"
fi

# Detener backend si fue iniciado por el script (pid en backend-dev.pid)
if [[ -f backend-dev.pid ]]; then
  PID=$(cat backend-dev.pid || echo "")
  if [[ -n "$PID" ]] && ps -p "$PID" >/devnull 2>&1; then
    kill "$PID" >/dev/null 2>&1 || true
    ok "Backend detenido (pid ${PID})"
  else
    warn "Backend no estaba corriendo (pid no válido)"
  fi
  rm -f backend-dev.pid
else
  warn "No se encontró backend-dev.pid (backend ya estaba iniciado o fue detenido)"
fi

# Opcional: detener MySQL
if [[ "$STOP_DB" == "1" ]]; then
  if command -v docker >/dev/null 2>&1; then
    info "Deteniendo contenedor MySQL (docker compose stop mysql)"
    docker compose stop mysql >/dev/null 2>&1 || warn "No se pudo detener mysql (quizá no está corriendo)"
    ok "MySQL detenido"
  else
    warn "Docker no está disponible; no se puede detener MySQL"
  fi
else
  info "STOP_DB=0 (por defecto). MySQL queda corriendo para tus pruebas."
fi

ok "Finalizado."


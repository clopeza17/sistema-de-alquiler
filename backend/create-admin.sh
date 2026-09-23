#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

email="${ADMIN_EMAIL:-admin@example.com}"
if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
  if [[ ! -t 0 ]]; then
    echo 'Ejecuta el script en una terminal o define ADMIN_PASSWORD.' >&2
    exit 1
  fi
  read -r -s -p "Contraseña para $email: " password
  printf '\n'
else
  password="$ADMIN_PASSWORD"
fi

if [[ ${#password} -lt 8 ]]; then
  echo 'La contraseña debe tener al menos 8 caracteres.' >&2
  exit 1
fi

printf '%s\n%s\n' "$email" "$password" | docker compose exec -T backend node scripts/create-admin.mjs

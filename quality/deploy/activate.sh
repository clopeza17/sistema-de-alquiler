#!/usr/bin/env bash
set -euo pipefail

environment="${1:?Falta el ambiente}"
revision="${2:?Falta el commit}"
archive="${3:?Falta el archivo}"
case "$environment" in dev|qa|prod) ;; *) exit 2 ;; esac
[[ "$revision" =~ ^[0-9a-f]{40}$ && "$archive" =~ ^/tmp/acs-release\.[a-zA-Z0-9]+$ ]]

base="/opt/acs-fase2/$environment"
release="$base/releases/$revision"
test -r "$base/.env"
exec 9>"$base/deploy.lock"
flock -n 9
trap 'rm -f "$archive"' EXIT
mkdir -p "$release"
tar --extract --gzip --file "$archive" --directory "$release" --no-same-owner

compose() {
  local dir="$1"
  shift
  COMPOSE_PARALLEL_LIMIT=1 docker compose --project-name "acs-$environment" --env-file "$base/.env" \
    -f "$dir/docker-compose.yml" -f "$dir/quality/deploy/compose.cloud.yml" "$@"
}

compose "$release" build backend frontend
previous="$(readlink -f "$base/current" || true)"
if ! compose "$release" up -d --wait --wait-timeout 150 mysql backend frontend; then
  if [[ -n "$previous" && -d "$previous" && "$previous" != "$release" ]]; then
    echo 'El despliegue no pasó la comprobación de salud. Reconstruyendo la versión anterior.' >&2
    compose "$previous" up -d --build --wait --wait-timeout 150 mysql backend frontend
  fi
  exit 1
fi
ln -sfn "$release" "$base/current"
printf 'Desplegado %s en %s\n' "$revision" "$environment"

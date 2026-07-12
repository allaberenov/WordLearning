#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.production ]]; then
  echo ".env.production not found" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env.production
set +a

export ENV_FILE=.env.production

COMPOSE_LEGACY=false

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
  COMPOSE_LEGACY=true
else
  echo "Docker Compose is not installed. Install Docker Compose plugin or docker-compose." >&2
  exit 1
fi

COMPOSE_FILES=(-f docker-compose.prod.yml)
PULL_SERVICES=(postgres)

if [[ "${ENABLE_CADDY:-false}" == "true" ]]; then
  COMPOSE_FILES+=(-f docker-compose.caddy.yml)
  PULL_SERVICES+=(caddy)

  for port in 80 443; do
    if docker ps --format '{{.ID}} {{.Names}} {{.Ports}}' | grep -E "0\.0\.0\.0:${port}->|:::${port}->" >/dev/null; then
      echo "Port ${port} is already used by another Docker container:" >&2
      docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep -E "0\.0\.0\.0:${port}->|:::${port}->" >&2
      echo "" >&2
      echo "Either stop the container that owns port ${port}, or set VPS_ENABLE_CADDY=false and configure your existing reverse proxy to route the domain to the app." >&2
      exit 1
    fi

    if command -v ss >/dev/null 2>&1 && ss -ltn "( sport = :${port} )" | tail -n +2 | grep . >/dev/null; then
      echo "Port ${port} is already used on the host:" >&2
      ss -ltnp "( sport = :${port} )" >&2 || ss -ltn "( sport = :${port} )" >&2
      echo "" >&2
      echo "Stop the host service that owns port ${port}, or set VPS_ENABLE_CADDY=false and configure your existing reverse proxy to route the domain to the app." >&2
      exit 1
    fi
  done
fi

"${COMPOSE[@]}" "${COMPOSE_FILES[@]}" pull "${PULL_SERVICES[@]}" || true

if [[ "${COMPOSE_LEGACY}" == "true" ]]; then
  echo "Legacy docker-compose detected; removing recreate-prone app containers before up."
  LEGACY_RM_SERVICES=(app)
  if [[ "${ENABLE_CADDY:-false}" == "true" ]]; then
    LEGACY_RM_SERVICES+=(caddy)
  fi
  "${COMPOSE[@]}" "${COMPOSE_FILES[@]}" rm -sf "${LEGACY_RM_SERVICES[@]}" || true
fi

"${COMPOSE[@]}" "${COMPOSE_FILES[@]}" up -d --build --remove-orphans
"${COMPOSE[@]}" "${COMPOSE_FILES[@]}" ps
docker image prune -f

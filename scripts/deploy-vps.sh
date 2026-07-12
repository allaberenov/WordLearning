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

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Docker Compose is not installed. Install Docker Compose plugin or docker-compose." >&2
  exit 1
fi

COMPOSE_FILES=(-f docker-compose.prod.yml)
PULL_SERVICES=(postgres)

if [[ "${ENABLE_CADDY:-false}" == "true" ]]; then
  COMPOSE_FILES+=(-f docker-compose.caddy.yml)
  PULL_SERVICES+=(caddy)
fi

"${COMPOSE[@]}" "${COMPOSE_FILES[@]}" pull "${PULL_SERVICES[@]}" || true
"${COMPOSE[@]}" "${COMPOSE_FILES[@]}" up -d --build --remove-orphans
"${COMPOSE[@]}" "${COMPOSE_FILES[@]}" ps
docker image prune -f

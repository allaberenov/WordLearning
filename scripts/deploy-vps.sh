#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILES=(-f docker-compose.prod.yml)

if [[ "${ENABLE_CADDY:-false}" == "true" ]]; then
  COMPOSE_FILES+=(-f docker-compose.caddy.yml)
fi

docker compose --env-file .env.production "${COMPOSE_FILES[@]}" pull --ignore-pull-failures
docker compose --env-file .env.production "${COMPOSE_FILES[@]}" up -d --build --remove-orphans
docker compose --env-file .env.production "${COMPOSE_FILES[@]}" ps
docker image prune -f

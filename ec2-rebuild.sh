#!/usr/bin/env bash
# Rebuild Paper Generator on a small EC2 box without OOM-killing the build.
set -euo pipefail

cd "$(dirname "$0")"

echo "Git: $(git log -1 --oneline)"

if ! swapon --show | grep -q .; then
  echo "Adding 2G swap so Next.js can finish building..."
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
fi

export COMPOSE_PARALLEL_LIMIT=1
export DOCKER_BUILDKIT=1

echo "Building one image at a time (do not use --no-cache)..."
docker compose build frontend
docker compose build backend
docker compose build python

docker compose up -d --force-recreate

echo
echo "Image created times:"
docker inspect papergenerator-frontend papergenerator-backend papergenerator-python \
  --format '{{.Name}} {{.Created}}' 2>/dev/null || true

echo
echo "If frontend still looks old, hard-refresh the browser (Ctrl+Shift+R)."
echo "Done."

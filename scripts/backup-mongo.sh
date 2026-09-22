#!/usr/bin/env bash
# Daily MongoDB dump. Works with docker compose or a running mongo container.
# Env: MONGO_DB, BACKUP_DIR, KEEP_DAYS, COMPOSE_DIR, MONGO_CONTAINER
set -euo pipefail

STAMP="${BACKUP_DATE:-$(date +%Y-%m-%d)}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_BASE="${BACKUP_DIR:-$HOME/db-backups}"
OUT="$OUT_BASE/papergenerator-$STAMP"
DB_NAME="${MONGO_DB:-papergenerator}"
KEEP_DAYS="${KEEP_DAYS:-14}"
LOG_DIR="$OUT_BASE"
mkdir -p "$OUT" "$LOG_DIR"

find_compose_dir() {
  local d
  for d in "${COMPOSE_DIR:-}" "$ROOT" "$HOME/papergenerator" "$HOME/PaperGenerator" /opt/papergenerator "$(pwd)"; do
    [ -n "$d" ] || continue
    if [ -f "$d/docker-compose.yml" ] || [ -f "$d/compose.yml" ]; then
      echo "$d"
      return 0
    fi
  done
  return 1
}

find_mongo_container() {
  if [ -n "${MONGO_CONTAINER:-}" ]; then
    echo "$MONGO_CONTAINER"
    return 0
  fi
  docker ps --format '{{.Names}}' | grep -E '^mongo$|[-_]mongo$|mongo[-_]' | head -n 1
}

COMPOSE_ROOT=""
if COMPOSE_ROOT="$(find_compose_dir)"; then
  cd "$COMPOSE_ROOT"
  if docker compose ps mongo --format '{{.Status}}' 2>/dev/null | grep -qi 'up'; then
    :
  else
    docker compose up -d mongo >/dev/null 2>&1 || true
    sleep 4
  fi
fi

CONTAINER="$(find_mongo_container || true)"
if [ -z "${CONTAINER:-}" ]; then
  echo "ERROR: no running mongo container. Set MONGO_CONTAINER or start Docker Mongo."
  exit 1
fi

echo "Pinging mongo in $CONTAINER..."
docker exec -T "$CONTAINER" mongosh --quiet --eval 'db.runCommand({ ping: 1 })' >/dev/null

echo "Dumping $DB_NAME -> $OUT"
docker exec -T "$CONTAINER" rm -rf "/tmp/mongodump-$STAMP"
docker exec -T "$CONTAINER" mongodump --db "$DB_NAME" --out "/tmp/mongodump-$STAMP"
docker cp "$CONTAINER:/tmp/mongodump-$STAMP/$DB_NAME/." "$OUT/"
docker exec -T "$CONTAINER" rm -rf "/tmp/mongodump-$STAMP"

COUNT="$(find "$OUT" -type f | wc -l | tr -d ' ')"
SIZE="$(du -sh "$OUT" | awk '{print $1}')"
echo "Backup ready: $OUT ($COUNT files, $SIZE)"

if [ "$COUNT" -lt 1 ]; then
  echo "ERROR: dump is empty."
  exit 1
fi

if [ "$KEEP_DAYS" -gt 0 ] 2>/dev/null; then
  find "$OUT_BASE" -maxdepth 1 -type d -name 'papergenerator-????-??-??' -mtime "+$KEEP_DAYS" -exec rm -rf {} +
  echo "Kept dumps from the last $KEEP_DAYS days in $OUT_BASE"
fi

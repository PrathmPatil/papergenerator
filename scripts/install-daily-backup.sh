#!/usr/bin/env bash
# Install a daily 02:00 cron job, then take one backup now.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_SH="$SCRIPT_DIR/backup-mongo.sh"
OUT_BASE="${BACKUP_DIR:-$HOME/db-backups}"
LOG="$OUT_BASE/backup.log"
CRON_MARK="papergenerator-mongo-backup"

chmod +x "$BACKUP_SH"
mkdir -p "$OUT_BASE"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not in PATH."
  exit 1
fi

CRON_LINE="0 2 * * * PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/bin BACKUP_DIR=$OUT_BASE /bin/bash $BACKUP_SH >> $LOG 2>&1"

EXISTING="$(crontab -l 2>/dev/null || true)"
FILTERED="$(printf '%s\n' "$EXISTING" | grep -v "$CRON_MARK" | grep -v "$BACKUP_SH" || true)"
{
  [ -n "$FILTERED" ] && printf '%s\n' "$FILTERED"
  echo "# $CRON_MARK"
  echo "$CRON_LINE"
} | crontab -

echo "Cron installed (daily 02:00):"
crontab -l | grep -A1 "$CRON_MARK" || crontab -l | tail -n 2

echo
echo "Running first backup now..."
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/bin" BACKUP_DIR="$OUT_BASE" /bin/bash "$BACKUP_SH" | tee -a "$LOG"

echo
echo "Automatic backups are on. Dumps land in $OUT_BASE"
echo "Log: $LOG"

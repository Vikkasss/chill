#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname "$SCRIPT_DIR")
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT="$BACKUP_DIR/personal_os_$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"
docker compose -f "$PROJECT_DIR/compose.yaml" exec -T api python -m app.backup > "$OUTPUT"

echo "Backup created: $OUTPUT"


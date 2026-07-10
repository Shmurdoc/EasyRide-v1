#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# EasyRyde Database Backup Script
# ============================================================
# Usage: ./backup.sh [--upload-s3]
# Retention: 7 daily, 4 weekly backups
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DAILY_DIR="$BACKUP_DIR/daily"
WEEKLY_DIR="$BACKUP_DIR/weekly"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# --- Parse arguments ---
UPLOAD_S3=false
for arg in "$@"; do
    [[ "$arg" == "--upload-s3" ]] && UPLOAD_S3=true
done

# --- Ensure .env exists ---
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
    error ".env file not found at $PROJECT_DIR/.env"
fi

# --- Load DB credentials from .env ---
source <(grep -E '^(DB_HOST|DB_PORT|DB_DATABASE|DB_USERNAME|DB_PASSWORD)=' "$PROJECT_DIR/.env" | sed 's/^/export /')

DB_HOST="${DB_HOST:-database}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_DATABASE:-easyryde}"
DB_USER="${DB_USERNAME:-easyryde}"

# --- Create directories ---
mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"

log "Starting database backup..."

# --- Dump database ---
DUMP_FILE="$DAILY_DIR/easyryde-$TIMESTAMP.sql.gz"

docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T database \
    pg_dump -U "$DB_USER" -d "$DB_NAME" -h localhost -p 5432 \
    --no-owner --no-acl --clean --if-exists \
    2>/dev/null | gzip > "$DUMP_FILE"

if [[ ! -s "$DUMP_FILE" ]]; then
    rm -f "$DUMP_FILE"
    error "Backup dump is empty — pg_dump may have failed"
fi

FILESIZE=$(du -h "$DUMP_FILE" | cut -f1)
success "Database dumped: $DUMP_FILE ($FILESIZE)"

# --- Weekly backup: copy daily to weekly (keep if Sunday) ---
if [[ $(date +%u) -eq 7 ]]; then
    WEEKLY_FILE="$WEEKLY_DIR/easyryde-$TIMESTAMP.sql.gz"
    cp "$DUMP_FILE" "$WEEKLY_FILE"
    success "Weekly backup created: $WEEKLY_FILE"
fi

# --- Retention: keep last 7 daily ---
DAILY_COUNT=$(find "$DAILY_DIR" -name "easyryde-*.sql.gz" -type f | wc -l)
if (( DAILY_COUNT > 7 )); then
    REMOVED=$(find "$DAILY_DIR" -name "easyryde-*.sql.gz" -type f | sort | head -n -7 | wc -l)
    find "$DAILY_DIR" -name "easyryde-*.sql.gz" -type f | sort | head -n -7 | xargs -r rm
    warn "Removed $REMOVED old daily backups (keeping last 7)"
fi

# --- Retention: keep last 4 weekly ---
WEEKLY_COUNT=$(find "$WEEKLY_DIR" -name "easyryde-*.sql.gz" -type f | wc -l)
if (( WEEKLY_COUNT > 4 )); then
    REMOVED=$(find "$WEEKLY_DIR" -name "easyryde-*.sql.gz" -type f | sort | head -n -4 | wc -l)
    find "$WEEKLY_DIR" -name "easyryde-*.sql.gz" -type f | sort | head -n -4 | xargs -r rm
    warn "Removed $REMOVED old weekly backups (keeping last 4)"
fi

# --- Upload to S3 (optional) ---
if [[ "$UPLOAD_S3" == true ]]; then
    if command -v aws &> /dev/null; then
        S3_BUCKET="${BACKUP_S3_BUCKET:-easyryde-backups}"
        S3_PREFIX="database/$(date +%Y/%m)"
        log "Uploading to s3://$S3_BUCKET/$S3_PREFIX/"
        aws s3 cp "$DUMP_FILE" "s3://$S3_BUCKET/$S3_PREFIX/easyryde-$TIMESTAMP.sql.gz" \
            --storage-class STANDARD_IA 2>&1
        success "Uploaded to S3"
    else
        warn "AWS CLI not found, skipping S3 upload"
    fi
fi

# --- Summary ---
TOTAL_DAILY=$(find "$DAILY_DIR" -name "easyryde-*.sql.gz" -type f | wc -l)
TOTAL_WEEKLY=$(find "$WEEKLY_DIR" -name "easyryde-*.sql.gz" -type f | wc -l)

success "Backup complete!"
log "  File: $DUMP_FILE"
log "  Size: $FILESIZE"
log "  Daily backups: $TOTAL_DAILY"
log "  Weekly backups: $TOTAL_WEEKLY"

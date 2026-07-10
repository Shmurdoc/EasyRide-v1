#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# EasyRyde Production Deployment Script
# ============================================================
# Usage: ./deploy.sh [--skip-backup] [--rollback]
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="$PROJECT_DIR/logs/deploy-$(date +%Y%m%d-%H%M%S).log"
DEPLOYMENT_MARKER="$PROJECT_DIR/.last-deployment"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[!]${NC} $1" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"; }

cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        error "Deployment failed (exit code: $exit_code)"
        warn "Run: ./deploy.sh --rollback to restore previous version"
    fi
}
trap cleanup EXIT

# --- Parse arguments ---
SKIP_BACKUP=false
ROLLBACK=false
for arg in "$@"; do
    case $arg in
        --skip-backup) SKIP_BACKUP=true ;;
        --rollback) ROLLBACK=true ;;
    esac
done

# --- Rollback ---
if [[ "$ROLLBACK" == true ]]; then
    if [[ ! -f "$DEPLOYMENT_MARKER" ]]; then
        error "No previous deployment found to rollback to."
        exit 1
    fi
    PREV_COMMIT=$(cat "$DEPLOYMENT_MARKER")
    log "Rolling back to commit: $PREV_COMMIT"
    cd "$PROJECT_DIR"
    git checkout "$PREV_COMMIT"
    docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" down
    docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" up -d --build
    success "Rolled back to $PREV_COMMIT"
    exit 0
fi

# --- Ensure .env exists ---
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
    error ".env file not found at $PROJECT_DIR/.env"
    error "Copy .env.production.example and fill in values."
    exit 1
fi

# --- Create logs directory ---
mkdir -p "$PROJECT_DIR/logs"

log "=========================================="
log "EasyRyde Deployment Starting"
log "=========================================="

# --- Step 1: Pull latest code ---
log "Step 1/7: Pulling latest code..."
cd "$PROJECT_DIR"
CURRENT_COMMIT=$(git rev-parse HEAD)
git pull origin main 2>&1 | tee -a "$LOG_FILE"
NEW_COMMIT=$(git rev-parse HEAD)
if [[ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]]; then
    warn "No new commits. Already up to date."
else
    success "Updated: $CURRENT_COMMIT → $NEW_COMMIT"
fi

# --- Step 2: Build Docker images ---
log "Step 2/7: Building Docker images..."
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" build --no-cache 2>&1 | tee -a "$LOG_FILE"
success "Docker images built"

# --- Step 3: Pre-deployment backup ---
if [[ "$SKIP_BACKUP" == false ]]; then
    log "Step 3/7: Running pre-deployment backup..."
    if [[ -x "$SCRIPT_DIR/backup.sh" ]]; then
        "$SCRIPT_DIR/backup.sh" 2>&1 | tee -a "$LOG_FILE"
        success "Pre-deployment backup completed"
    else
        warn "backup.sh not found or not executable, skipping"
    fi
else
    log "Step 3/7: Backup skipped (--skip-backup)"
fi

# --- Step 4: Stop services gracefully ---
log "Step 4/7: Stopping services..."
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" stop queue scheduler 2>&1 | tee -a "$LOG_FILE"
success "Queue and scheduler stopped"

# --- Step 5: Run database migrations ---
log "Step 5/7: Running database migrations..."
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" run --rm laravel php artisan migrate --force 2>&1 | tee -a "$LOG_FILE"
success "Migrations completed"

# --- Step 6: Seed production data ---
log "Step 6/7: Seeding production data..."
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" run --rm laravel php artisan db:seed --class=RoleSeeder --force 2>&1 | tee -a "$LOG_FILE" || warn "RoleSeeder may have already run"
success "Production seed data applied"

# --- Step 7: Restart all services ---
log "Step 7/7: Restarting all services..."
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" up -d 2>&1 | tee -a "$LOG_FILE"
success "All services restarted"

# --- Health check ---
log "Running post-deployment health check..."
sleep 10
if [[ -x "$SCRIPT_DIR/health-check.sh" ]]; then
    if "$SCRIPT_DIR/health-check.sh" 2>&1 | tee -a "$LOG_FILE"; then
        success "All health checks passed"
    else
        error "Health check failed after deployment"
        exit 1
    fi
else
    warn "health-check.sh not found, skipping automated health check"
fi

# --- Record deployment ---
git rev-parse HEAD > "$DEPLOYMENT_MARKER"

# --- Cleanup old logs (keep last 30) ---
find "$PROJECT_DIR/logs" -name "deploy-*.log" -type f | sort | head -n -30 | xargs -r rm

success "=========================================="
success "Deployment completed successfully!"
success "Commit: $(git rev-parse --short HEAD)"
success "Time: $(date)"
success "=========================================="

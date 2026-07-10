#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# EasyRyde SSL Certificate Setup (Let's Encrypt)
# ============================================================
# Usage: ./setup-ssl.sh <domain> [email]
# Example: ./setup-ssl.sh api.easyryde.co.za admin@easyryde.co.za
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SSL_DIR="$PROJECT_DIR/ssl"
WEBROOT_DIR="$PROJECT_DIR/ssl-www"

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

# --- Validate arguments ---
DOMAIN="${1:-}"
EMAIL="${2:-admin@easyryde.co.za}"

if [[ -z "$DOMAIN" ]]; then
    error "Usage: $0 <domain> [email]"
fi

log "Setting up SSL for: $DOMAIN"
log "Contact email: $EMAIL"

# --- Install certbot ---
if ! command -v certbot &> /dev/null; then
    log "Installing certbot..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y -qq certbot
    elif command -v yum &> /dev/null; then
        sudo yum install -y epel-release
        sudo yum install -y certbot
    elif command -v apk &> /dev/null; then
        sudo apk add --no-cache certbot
    else
        error "Cannot install certbot — unsupported package manager"
    fi
    success "certbot installed"
else
    success "certbot already installed ($(certbot --version 2>&1))"
fi

# --- Create required directories ---
mkdir -p "$SSL_DIR" "$WEBROOT_DIR"

# --- Obtain certificate ---
log "Requesting SSL certificate for $DOMAIN..."

# Use standalone mode via Docker (avoids needing nginx running)
docker run --rm \
    -v "$SSL_DIR:/etc/letsencrypt" \
    -v "$WEBROOT_DIR:/var/www/letsencrypt" \
    -p 80:80 \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/letsencrypt \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN" \
    2>&1 | tee -a "$PROJECT_DIR/logs/ssl-$(date +%Y%m%d-%H%M%S).log"

if [[ ! -f "$SSL_DIR/live/$DOMAIN/fullchain.pem" ]]; then
    error "Certificate not found at $SSL_DIR/live/$DOMAIN/fullchain.pem"
fi

success "SSL certificate obtained for $DOMAIN"

# --- Verify certificate ---
log "Verifying certificate..."
docker run --rm \
    -v "$SSL_DIR:/etc/letsencrypt" \
    certbot/certbot certificates \
    -d "$DOMAIN" 2>&1 | tee -a "$PROJECT_DIR/logs/ssl-$(date +%Y%m%d-%H%M%S).log"

# --- Setup auto-renewal cron ---
log "Setting up auto-renewal cron job..."
RENEWAL_CMD="0 3 * * 1 cd $PROJECT_DIR && docker compose -f docker-compose.prod.yml run --rm certbot renew --quiet && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload >> $PROJECT_DIR/logs/ssl-renewal.log 2>&1"

# Remove old entry if exists
crontab -l 2>/dev/null | grep -v "easyryde.*certbot" > /tmp/crontab_tmp || true

# Add new entry
echo "$RENEWAL_CMD" >> /tmp/crontab_tmp
crontab /tmp/crontab_tmp
rm -f /tmp/crontab_tmp

success "Auto-renewal cron job installed (runs weekly Monday at 3am)"

# --- Reload Nginx ---
log "Reloading Nginx..."
docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" exec -T nginx nginx -s reload 2>/dev/null \
    || docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" restart nginx 2>/dev/null \
    || warn "Could not reload Nginx — restart manually"

success "=========================================="
success "SSL Setup Complete!"
success "  Domain: $DOMAIN"
success "  Certificate: $SSL_DIR/live/$DOMAIN/"
success "  Auto-renewal: Enabled (weekly)"
success "=========================================="

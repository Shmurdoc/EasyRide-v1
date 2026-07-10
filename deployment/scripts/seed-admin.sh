#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# EasyRyde Admin User Creation Script
# ============================================================
# Usage: ./seed-admin.sh
# Creates initial super-admin user interactively
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} EasyRyde Admin User Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# --- Ensure .env exists ---
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
    error ".env file not found at $PROJECT_DIR/.env"
fi

# --- Check if Laravel container is running ---
if ! docker ps --format '{{.Names}}' | grep -q "easyryde-laravel"; then
    error "Laravel container is not running. Start services first."
fi

# --- Prompt for admin details ---
read -rp "Admin email: " ADMIN_EMAIL
read -rp "Admin name: " ADMIN_NAME
read -rsp "Admin password: " ADMIN_PASSWORD
echo ""
read -rsp "Confirm password: " ADMIN_PASSWORD_CONFIRM
echo ""

# --- Validate ---
if [[ -z "$ADMIN_EMAIL" || -z "$ADMIN_NAME" || -z "$ADMIN_PASSWORD" ]]; then
    error "All fields are required"
fi

if [[ ! "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    error "Invalid email format"
fi

if [[ ${#ADMIN_PASSWORD} -lt 8 ]]; then
    error "Password must be at least 8 characters"
fi

if [[ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]]; then
    error "Passwords do not match"
fi

log "Creating admin user: $ADMIN_EMAIL"

# --- Create the user via Laravel Tinker ---
CREATE_RESULT=$(docker exec easyryde-laravel php artisan tinker --execute="
use App\Models\User;
use Illuminate\Support\Facades\Hash;

\$existing = User::where('email', '$ADMIN_EMAIL')->first();
if (\$existing) {
    echo 'USER_EXISTS';
} else {
    \$user = User::create([
        'name' => '$ADMIN_NAME',
        'email' => '$ADMIN_EMAIL',
        'password' => Hash::make('$ADMIN_PASSWORD'),
        'email_verified_at' => now(),
    ]);
    \$user->assignRole('super-admin');
    echo 'CREATED:' . \$user->id;
}
" 2>&1)

if echo "$CREATE_RESULT" | grep -q "USER_EXISTS"; then
    warn "User $ADMIN_EMAIL already exists"
    exit 0
elif echo "$CREATE_RESULT" | grep -q "CREATED:"; then
    USER_ID=$(echo "$CREATE_RESULT" | grep "CREATED:" | cut -d: -f2)
    success "Admin user created (ID: $USER_ID)"
else
    error "Failed to create user. Output: $CREATE_RESULT"
fi

# --- Verify creation ---
log "Verifying user creation..."
VERIFY_RESULT=$(docker exec easyryde-laravel php artisan tinker --execute="
use App\Models\User;
\$user = User::where('email', '$ADMIN_EMAIL')->first();
if (\$user) {
    \$roles = \$user->getRoleNames()->implode(', ');
    echo 'VERIFIED:ID=' . \$user->id . ',ROLE=' . \$roles;
} else {
    echo 'NOT_FOUND';
}
" 2>&1)

if echo "$VERIFY_RESULT" | grep -q "VERIFIED:"; then
    USER_ID=$(echo "$VERIFY_RESULT" | grep -o "ID=[0-9]*" | cut -d= -f2)
    ROLE=$(echo "$VERIFY_RESULT" | grep -o "ROLE=.*" | cut -d= -f2)
    success "Verification passed"
    log "  ID:    $USER_ID"
    log "  Email: $ADMIN_EMAIL"
    log "  Name:  $ADMIN_NAME"
    log "  Role:  $ROLE"
else
    error "Verification failed — user not found after creation"
fi

echo ""
success "=========================================="
success "Admin user ready!"
success "  Login: $ADMIN_EMAIL"
success "  Role:  super-admin"
success "=========================================="

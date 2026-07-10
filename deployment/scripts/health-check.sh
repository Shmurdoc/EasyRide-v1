#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# EasyRyde Health Check Script
# ============================================================
# Usage: ./health-check.sh [--verbose]
# Checks: Laravel API, Socket.IO, PostgreSQL, Redis
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VERBOSE=false
[[ "${1:-}" == "--verbose" ]] && VERBOSE=true

PASS=0
FAIL=0
WARN=0

check_pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
check_fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); }
check_warn() { echo -e "  ${YELLOW}!${NC} $1"; ((WARN++)); }

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE} EasyRyde Health Check${NC}"
echo -e "${BLUE} $(date)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# --- 1. Docker containers ---
echo -e "${BLUE}[1/5] Docker Containers${NC}"
CONTAINERS=("easyryde-nginx" "easyryde-laravel" "easyryde-socket" "easyryde-db" "easyryde-redis" "easyryde-queue" "easyryde-scheduler")
for c in "${CONTAINERS[@]}"; do
    STATUS=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo "not_found")
    if [[ "$STATUS" == "running" ]]; then
        check_pass "$c is running"
    elif [[ "$STATUS" == "not_found" ]]; then
        check_fail "$c not found"
    else
        check_fail "$c is $STATUS"
    fi
done
echo ""

# --- 2. Laravel API ---
echo -e "${BLUE}[2/5] Laravel API${NC}"
if docker compose -f "$PROJECT_DIR/docker-compose.prod.yml" ps --format json 2>/dev/null | grep -q "easyryde-nginx"; then
    HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://localhost/api/v1/health" 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" == "200" ]]; then
        check_pass "API responds (HTTP $HTTP_CODE)"
    elif [[ "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
        check_warn "API redirects (HTTP $HTTP_CODE) — may need auth"
    elif [[ "$HTTP_CODE" == "000" ]]; then
        check_fail "API unreachable"
    else
        check_fail "API returned HTTP $HTTP_CODE"
    fi
else
    check_fail "Nginx container not running"
fi

# PHP-FPM check
if docker exec easyryde-laravel php-fpm -t 2>/dev/null | grep -q "syntax is ok"; then
    check_pass "PHP-FPM config valid"
else
    check_warn "Could not verify PHP-FPM config"
fi
echo ""

# --- 3. Socket.IO ---
echo -e "${BLUE}[3/5] Socket.IO${NC}"
SOCKET_PORT=$(docker port easyryde-socket 3001/tcp 2>/dev/null | head -1 | cut -d: -f2 || echo "")
if [[ -n "$SOCKET_PORT" ]]; then
    SOCKET_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SOCKET_PORT}/health" 2>/dev/null || echo "000")
    if [[ "$SOCKET_HEALTH" == "200" ]]; then
        check_pass "Socket.IO health endpoint OK"
    else
        check_fail "Socket.IO health returned HTTP $SOCKET_HEALTH"
    fi
else
    # Try internal port
    SOCKET_HEALTH=$(docker exec easyryde-socket wget -qO- "http://localhost:3001/health" 2>/dev/null && echo "200" || echo "000")
    if [[ "$SOCKET_HEALTH" == "200" ]]; then
        check_pass "Socket.IO reachable internally"
    else
        check_fail "Socket.IO unreachable"
    fi
fi
echo ""

# --- 4. PostgreSQL ---
echo -e "${BLUE}[4/5] PostgreSQL${NC}"
if docker exec easyryde-db pg_isready -U easyryde -d easyryde 2>/dev/null | grep -q "accepting connections"; then
    check_pass "PostgreSQL accepting connections"
else
    check_fail "PostgreSQL not accepting connections"
fi

# Check DB connectivity
if docker exec easyryde-db psql -U easyryde -d easyryde -c "SELECT 1;" 2>/dev/null | grep -q "1"; then
    check_pass "Database query successful"
else
    check_fail "Database query failed"
fi

# Check PostGIS extension
if docker exec easyryde-db psql -U easyryde -d easyryde -c "SELECT PostGIS_Version();" 2>/dev/null | grep -q "PostGIS"; then
    check_pass "PostGIS extension active"
else
    check_warn "PostGIS extension not verified"
fi
echo ""

# --- 5. Redis ---
echo -e "${BLUE}[5/5] Redis${NC}"
REDIS_PASS=$(grep '^REDIS_PASSWORD=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d= -f2 || echo "")
if [[ -n "$REDIS_PASS" ]]; then
    REDIS_PONG=$(docker exec easyryde-redis redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null || echo "")
else
    REDIS_PONG=$(docker exec easyryde-redis redis-cli ping 2>/dev/null || echo "")
fi

if [[ "$REDIS_PONG" == "PONG" ]]; then
    check_pass "Redis responding (PONG)"
else
    check_fail "Redis not responding"
fi

# Check Redis memory
REDIS_MEM=$(docker exec easyryde-redis redis-cli info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r' || echo "unknown")
if [[ "$REDIS_MEM" != "unknown" ]]; then
    check_pass "Redis memory: $REDIS_MEM"
fi
echo ""

# --- Summary ---
echo -e "${BLUE}========================================${NC}"
TOTAL=$((PASS + FAIL + WARN))
echo -e " Results: ${GREEN}${PASS} passed${NC} | ${RED}${FAIL} failed${NC} | ${YELLOW}${WARN} warnings${NC} (${TOTAL} total)"

if [[ $FAIL -eq 0 ]]; then
    echo -e "${GREEN} All systems operational!${NC}"
    echo -e "${BLUE}========================================${NC}"
    exit 0
else
    echo -e "${RED} Issues detected — investigate before deployment${NC}"
    echo -e "${BLUE}========================================${NC}"
    exit 1
fi

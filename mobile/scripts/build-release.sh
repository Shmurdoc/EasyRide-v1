#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# EasyRyde Release APK Builder
# =============================================================================
# Builds release APKs for rider, driver, and admin apps.
# Each APK is self-contained with embedded JS bundle (no Metro dependency).
#
# Usage:
#   ./build-release.sh                  # Build all apps
#   ./build-release.sh rider            # Build rider only
#   ./build-release.sh rider driver     # Build rider and driver
#   ./build-release.sh --clean          # Clean all caches before building
#   ./build-release.sh --verify         # Build and verify APKs
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$MOBILE_DIR/dist"
LOG_DIR="$MOBILE_DIR/build-logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
APPS=()
CLEAN=false
VERIFY=false

for arg in "$@"; do
    case "$arg" in
        --clean)    CLEAN=true ;;
        --verify)   VERIFY=true ;;
        rider|driver|admin) APPS+=("$arg") ;;
        --help|-h)
            echo "Usage: $0 [--clean] [--verify] [rider] [driver] [admin]"
            echo ""
            echo "Options:"
            echo "  --clean    Clear Metro, Gradle, and node_modules caches before building"
            echo "  --verify   After building, verify APKs are self-contained"
            echo ""
            echo "Apps:"
            echo "  rider      Build rider release APK"
            echo "  driver     Build driver release APK"
            echo "  admin      Build admin release APK"
            echo "  (none)     Build all apps"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown argument: $arg${NC}"
            exit 1
            ;;
    esac
done

# Default: build all apps
if [ ${#APPS[@]} -eq 0 ]; then
    APPS=(rider driver admin)
fi

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Step 1: Pre-flight checks
# =============================================================================
log_info "EasyRyde Release APK Builder"
echo "  Apps to build: ${APPS[*]}"
echo "  Clean caches:  $CLEAN"
echo "  Verify APKs:   $VERIFY"
echo ""

# Verify required tools
for cmd in node npx java; do
    if ! command -v "$cmd" &>/dev/null; then
        log_error "Required command not found: $cmd"
        exit 1
    fi
done

NODE_VERSION=$(node -v)
JAVA_VERSION=$(java -version 2>&1 | head -1)
log_info "Node: $NODE_VERSION | Java: $JAVA_VERSION"

# Check ANDROID_HOME
if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
    log_warn "ANDROID_HOME not set. Gradle may fail to find the SDK."
    log_warn "Set ANDROID_HOME to your Android SDK path."
fi

# =============================================================================
# Step 2: Kill Gradle daemons (prevents file locking issues)
# =============================================================================
log_info "Stopping all Gradle daemons..."
(cd "$MOBILE_DIR" && npx --yes gradle --stop 2>/dev/null) || true
# Also try to kill any lingering Java/Gradle processes
if command -v pkill &>/dev/null; then
    pkill -f "GradleDaemon" 2>/dev/null || true
fi
log_ok "Gradle daemons stopped"

# =============================================================================
# Step 3: Clear caches if --clean
# =============================================================================
if [ "$CLEAN" = true ]; then
    log_info "Clearing Metro cache..."
    rm -rf /tmp/metro-* 2>/dev/null || true
    rm -rf "$HOME/.metro" 2>/dev/null || true

    log_info "Clearing Gradle caches for each app..."
    for app in "${APPS[@]}"; do
        APP_DIR="$MOBILE_DIR/apps/$app"
        if [ -d "$APP_DIR/android" ]; then
            (cd "$APP_DIR/android" && ./gradlew clean 2>/dev/null) || true
        fi
        rm -rf "$APP_DIR/android/.gradle" 2>/dev/null || true
    done
    log_ok "Caches cleared"
fi

# =============================================================================
# Step 4: Install dependencies
# =============================================================================
log_info "Installing dependencies..."
(cd "$MOBILE_DIR" && npm install --legacy-peer-deps 2>&1 | tail -1)
log_ok "Dependencies installed"

# =============================================================================
# Step 5: Create output directories
# =============================================================================
mkdir -p "$OUTPUT_DIR"
mkdir -p "$LOG_DIR"

# =============================================================================
# Step 6: Build each app
# =============================================================================
BUILD_RESULTS=()

build_app() {
    local APP_NAME="$1"
    local APP_DIR="$MOBILE_DIR/apps/$APP_NAME"
    local LOG_FILE="$LOG_DIR/${APP_NAME}-release-$(date +%Y%m%d-%H%M%S).log"

    echo ""
    log_info "=========================================="
    log_info "Building: $APP_NAME"
    log_info "=========================================="

    if [ ! -d "$APP_DIR" ]; then
        log_error "App directory not found: $APP_DIR"
        BUILD_RESULTS+=("$APP_NAME:SKIP(dir not found)")
        return 1
    fi

    cd "$APP_DIR"

    # Verify .env exists with Google Maps API key
    if [ ! -f ".env" ]; then
        log_warn ".env file not found in $APP_DIR — Maps API key may be missing"
    elif ! grep -q "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" .env 2>/dev/null; then
        log_warn "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not set in $APP_DIR/.env"
    fi

    # Step 6a: Clean prebuild
    log_info "Running expo prebuild --clean..."
    npx expo prebuild --clean 2>&1 | tail -3 | tee -a "$LOG_FILE"
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        log_error "expo prebuild failed for $APP_NAME"
        BUILD_RESULTS+=("$APP_NAME:FAIL(prebuild)")
        return 1
    fi

    # Step 6b: Build release APK
    log_info "Building release APK (this may take 5-15 minutes)..."
    export NODE_ENV=production
    export EXPO_NO_METRO_WORKSPACE_ROOT=1

    npx expo run:android --variant release --no-install 2>&1 | tee -a "$LOG_FILE"
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        log_error "Release build failed for $APP_NAME"
        log_error "Full log: $LOG_FILE"
        BUILD_RESULTS+=("$APP_NAME:FAIL(build)")
        return 1
    fi

    # Step 6c: Locate and copy APK
    local APK_PATH="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"
    if [ ! -f "$APK_PATH" ]; then
        # Try alternate path
        APK_PATH="$APP_DIR/android/app/build/outputs/apk/release/app-release-unsigned.apk"
    fi

    if [ ! -f "$APK_PATH" ]; then
        log_error "APK not found at expected path for $APP_NAME"
        BUILD_RESULTS+=("$APP_NAME:FAIL(apk not found)")
        return 1
    fi

    local APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    local DEST_APK="$OUTPUT_DIR/easyryde-${APP_NAME}-release.apk"
    cp "$APK_PATH" "$DEST_APK"
    log_ok "APK built: $DEST_APK ($APK_SIZE)"

    # Step 6d: Verify APK contains JS bundle
    if command -v unzip &>/dev/null; then
        if unzip -l "$DEST_APK" 2>/dev/null | grep -q "index.android.bundle"; then
            log_ok "JS bundle verified in APK"
        else
            log_error "JS bundle MISSING from APK — app will crash on launch!"
            BUILD_RESULTS+=("$APP_NAME:FAIL(no bundle)")
            return 1
        fi
    fi

    BUILD_RESULTS+=("$APP_NAME:OK($APK_SIZE)")
    return 0
}

for app in "${APPS[@]}"; do
    build_app "$app" || true
done

# =============================================================================
# Step 7: Summary
# =============================================================================
echo ""
echo "=========================================="
log_info "BUILD SUMMARY"
echo "=========================================="
for result in "${BUILD_RESULTS[@]}"; do
    app_name="${result%%:*}"
    status="${result#*:}"
    if [[ "$status" == OK* ]]; then
        log_ok "$app_name: $status"
    elif [[ "$status" == SKIP* ]]; then
        log_warn "$app_name: $status"
    else
        log_error "$app_name: $status"
    fi
done

echo ""
if [ -d "$OUTPUT_DIR" ]; then
    log_info "Output directory: $OUTPUT_DIR"
    ls -lh "$OUTPUT_DIR"/*.apk 2>/dev/null || true
fi

# =============================================================================
# Step 8: Verify APKs (if --verify)
# =============================================================================
if [ "$VERIFY" = true ]; then
    echo ""
    log_info "Running APK verification..."
    for app in "${APPS[@]}"; do
        APK="$OUTPUT_DIR/easyryde-${app}-release.apk"
        if [ ! -f "$APK" ]; then
            log_warn "Skipping verification for $app (APK not found)"
            continue
        fi

        echo ""
        log_info "--- Verifying: $app ---"

        # Check size (should be > 10MB for a real app)
        local_size=$(stat -f%z "$APK" 2>/dev/null || stat --format=%s "$APK" 2>/dev/null || echo 0)
        if [ "$local_size" -gt 10000000 ]; then
            log_ok "APK size: $(du -h "$APK" | cut -f1) (good, >10MB)"
        else
            log_warn "APK size: $(du -h "$APK" | cut -f1) — suspiciously small, may be missing assets"
        fi

        # Check for Metro references (should be 0 for release)
        if command -v unzip &>/dev/null; then
            metro_refs=$(unzip -p "$APK" 2>/dev/null | grep -c "localhost:8081" || echo 0)
            if [ "$metro_refs" -eq 0 ]; then
                log_ok "No Metro server references in APK (self-contained)"
            else
                log_error "Found $metro_refs references to localhost:8081 — APK depends on Metro!"
            fi
        fi
    done
fi

echo ""
echo "Done."

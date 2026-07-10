# ============================================================
# EasyRyde EAS Build Helper Script
# ============================================================
# Usage: .\scripts\eas-build.ps1 -App rider -Profile preview
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("rider", "driver", "admin")]
    [string]$App,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "preview", "production")]
    [string]$Profile = "preview",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("android", "ios")]
    [string]$Platform = "android",
    
    [switch]$Local
)

$ErrorActionPreference = "Stop"

# Verify EAS CLI is installed
try {
    $easVersion = eas --version 2>$null
    Write-Host "EAS CLI version: $easVersion" -ForegroundColor Green
} catch {
    Write-Host "EAS CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g eas-cli
}

# Verify logged in
$whoami = eas whoami 2>$null
if (-not $whoami) {
    Write-Host "Not logged in to EAS. Running login..." -ForegroundColor Yellow
    eas login
}

# Navigate to app directory
$appDir = "F:\EasyRyde\mobile\apps\$App"
if (-not (Test-Path $appDir)) {
    Write-Host "App directory not found: $appDir" -ForegroundColor Red
    exit 1
}

Write-Host "Building $App ($Platform) with profile: $Profile" -ForegroundColor Cyan

# Run EAS build
if ($Local) {
    Write-Host "Building locally..." -ForegroundColor Yellow
    eas build --platform $Platform --profile $Profile --local
} else {
    Write-Host "Building on EAS cloud..." -ForegroundColor Yellow
    eas build --platform $Platform --profile $Profile
}

Write-Host "Build complete!" -ForegroundColor Green

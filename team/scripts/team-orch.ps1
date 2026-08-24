param(
  [string]$command = ""
)

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Resolve Node.js — check common locations if not on PATH
$nodePaths = @(
  "node"
  "C:\Users\madoc\AppData\Local\nvm\v22.16.0\node.exe"
  "C:\nvm4w\nodejs\node.exe"
  "$env:LOCALAPPDATA\nvm\v22.16.0\node.exe"
)
$nodeExe = $null
foreach ($p in $nodePaths) {
  if ($p -eq "node") {
    $found = Get-Command "node" -ErrorAction SilentlyContinue
    if ($found) { $nodeExe = "node"; break }
  } elseif (Test-Path $p) {
    $nodeExe = $p; break
  }
}
if (-not $nodeExe) {
  Write-Host "ERROR: Node.js not found. Install Node.js or run: nvm use 22.16.0"
  exit 1
}

function Show-Help {
  Write-Host "team-orch -- Team Orchestration CLI"
  Write-Host ""
  Write-Host "Usage:"
  Write-Host "  team-orch validate          Validate all team file formats"
  Write-Host "  team-orch enforce           Run enforcement check (heartbeat + consistency)"
  Write-Host "  team-orch recover           Recover crashed/stale sessions"
  Write-Host ""
  Write-Host "Examples:"
  Write-Host "  team-orch validate"
  Write-Host "  team-orch enforce"
  Write-Host "  team-orch recover"
}

if ($command -eq "" -or $command -eq "--help" -or $command -eq "-h") {
  Show-Help
  exit 0
}

switch ($command.ToLower()) {
  "validate" {
    & $nodeExe (Join-Path $scriptsDir "validate.mjs")
    exit $LASTEXITCODE
  }
  "enforce" {
    & $nodeExe (Join-Path $scriptsDir "enforce.mjs")
    exit $LASTEXITCODE
  }
  "recover" {
    & $nodeExe (Join-Path $scriptsDir "recover.mjs")
    exit $LASTEXITCODE
  }
  default {
    Write-Host "Unknown command: $command"
    Write-Host "Usage: team-orch validate|enforce|recover"
    exit 1
  }
}

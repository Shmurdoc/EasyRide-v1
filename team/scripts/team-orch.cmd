@echo off
setlocal enabledelayedexpansion
set SCRIPTS_DIR=%~dp0

:: Resolve Node.js — check common locations if not on PATH
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 goto :found_node
if exist "C:\Users\madoc\AppData\Local\nvm\v22.16.0\node.exe" set "PATH=C:\Users\madoc\AppData\Local\nvm\v22.16.0;%PATH%" & goto :found_node
if exist "C:\nvm4w\nodejs\node.exe" set "PATH=C:\nvm4w\nodejs;%PATH%" & goto :found_node
echo ERROR: Node.js not found. Install Node.js or run: nvm use 22.16.0
exit /b 1

:found_node
if "%1"=="" goto :help
if /i "%1"=="validate" goto :validate
if /i "%1"=="enforce" goto :enforce
if /i "%1"=="recover" goto :recover
echo Unknown command: %1
echo Usage: team-orch validate^|enforce^|recover
exit /b 1

:help
echo team-orch -- Team Orchestration CLI
echo.
echo Usage:
echo   team-orch validate          Validate all team file formats
echo   team-orch enforce           Run enforcement check (heartbeat + consistency)
echo   team-orch recover           Recover crashed/stale sessions
echo.
echo Examples:
echo   team-orch validate
echo   team-orch enforce
echo   team-orch recover
exit /b 0

:validate
node "%SCRIPTS_DIR%validate.mjs"
exit /b %ERRORLEVEL%

:enforce
node "%SCRIPTS_DIR%enforce.mjs"
exit /b %ERRORLEVEL%

:recover
node "%SCRIPTS_DIR%recover.mjs"
exit /b %ERRORLEVEL%

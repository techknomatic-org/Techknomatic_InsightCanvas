@echo off
setlocal enabledelayedexpansion
title InsightCanvas - Local Production Server

echo =======================================================
echo     InsightCanvas - Local Production Deployment
echo =======================================================
echo.

set PORT=5567

:: Check if .env exists
if not exist .env (
    if exist .env.template (
        echo [INFO] Creating .env from .env.template...
        copy .env.template .env >nul
    )
)

:: Check if dist exists, if not build it
if not exist py-src\data_formulator\dist (
    echo [INFO] Production bundle not found. Building frontend...
    call yarn build
)

echo Starting standalone server on http://localhost:%PORT% ...
echo (Frontend + Backend served unified on port %PORT%)
echo.

:: Open browser automatically
start "" "http://localhost:%PORT%"

:: Run the InsightCanvas server listening on all network interfaces
python -m uv run data_formulator --host 0.0.0.0 --port %PORT%

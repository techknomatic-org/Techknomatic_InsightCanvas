@echo off
setlocal enabledelayedexpansion
title InsightCanvas - Launcher

echo =======================================================
echo              InsightCanvas - Starting
echo =======================================================
echo.

set BACKEND_PORT=5567
set FRONTEND_PORT=5173

:: Verify environment
if not exist .env (
    if exist .env.template (
        echo [INFO] Creating .env file from .env.template...
        copy .env.template .env >nul
    )
)

:: Check if .venv exists, if not trigger uv sync
if not exist .venv (
    echo [INFO] Python virtual environment not found. Running uv sync...
    python -m uv sync
)

:: Check if node_modules exists, if not trigger yarn install
if not exist node_modules (
    echo [INFO] node_modules not found. Running yarn install...
    call yarn install
)

echo [1/2] Starting Backend Server (Flask) on port %BACKEND_PORT%...
start "InsightCanvas - Backend" cmd /k "title InsightCanvas - Backend && python -m uv run data_formulator --port %BACKEND_PORT% --dev"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Server (Vite) on port %FRONTEND_PORT%...
start "InsightCanvas - Frontend" cmd /k "title InsightCanvas - Frontend && yarn start --port %FRONTEND_PORT%"

:: Wait 2 seconds and open browser
timeout /t 2 /nobreak >nul
echo.
echo Opening browser at http://localhost:%FRONTEND_PORT% ...
start http://localhost:%FRONTEND_PORT%

echo.
echo =======================================================
echo       InsightCanvas is running in the background!
echo =======================================================
echo  - Frontend: http://localhost:%FRONTEND_PORT%
echo  - Backend:  http://localhost:%BACKEND_PORT%
echo.
echo  To stop all servers cleanly, run: stop.bat
echo =======================================================
echo.

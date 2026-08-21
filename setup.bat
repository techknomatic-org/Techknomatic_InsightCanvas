@echo off
setlocal enabledelayedexpansion
title InsightCanvas - Setup

echo =======================================================
echo          InsightCanvas - Automated Setup
echo =======================================================
echo.

:: 1. Check Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not found in PATH!
    echo Please install Python 3.11+ from https://www.python.org/
    pause
    exit /b 1
)
echo [OK] Python found.

:: 2. Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js (v18+) from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found.

:: 3. Check / Install uv
echo.
echo [1/4] Checking and installing uv package manager...
python -m uv --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing uv via pip...
    python -m pip install --upgrade uv
)
echo [OK] uv is ready.

:: 4. Sync Python backend environment via uv
echo.
echo [2/4] Syncing Python dependencies (backend)...
python -m uv sync
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] uv sync failed.
    pause
    exit /b 1
)
echo [OK] Python environment is set up.

:: 5. Check / Install yarn
echo.
echo [3/4] Checking yarn package manager...
where yarn >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing yarn globally via npm...
    call npm install -g yarn
)
echo [OK] yarn is ready.

:: 6. Install Node dependencies
echo.
echo [4/4] Installing Node.js dependencies (frontend)...
call yarn install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] yarn install failed.
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed.

:: 7. Environment File Setup
if not exist .env (
    if exist .env.template (
        echo.
        echo Creating .env from .env.template...
        copy .env.template .env >nul
        echo [OK] .env created. You can configure your API keys in .env
    )
)

echo.
echo =======================================================
echo             Setup Completed Successfully!
echo =======================================================
echo You can now start InsightCanvas by running: start.bat
echo.
pause

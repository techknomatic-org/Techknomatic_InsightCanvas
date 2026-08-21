@echo off
setlocal enabledelayedexpansion
title InsightCanvas - Stopping

echo =======================================================
echo              InsightCanvas - Stopping
echo =======================================================
echo.

set BACKEND_PORT=5567
set FRONTEND_PORT=5173

echo [1/3] Terminating processes listening on port %BACKEND_PORT% (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%BACKEND_PORT% "') do (
    if "%%a" NEQ "0" (
        echo Killing PID %%a on port %BACKEND_PORT%...
        taskkill /F /PID %%a >nul 2>&1
    )
)

echo [2/3] Terminating processes listening on port %FRONTEND_PORT% (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%FRONTEND_PORT% "') do (
    if "%%a" NEQ "0" (
        echo Killing PID %%a on port %FRONTEND_PORT%...
        taskkill /F /PID %%a >nul 2>&1
    )
)

echo [3/3] Closing InsightCanvas command windows...
taskkill /FI "WINDOWTITLE eq InsightCanvas - Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq InsightCanvas - Frontend*" /F >nul 2>&1

echo.
echo =======================================================
echo        InsightCanvas has been stopped successfully!
echo =======================================================
echo.
pause

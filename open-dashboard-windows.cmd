@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo Ecom Growth Autopilot - Ollama Dashboard
echo ==============================================
echo.
call npm run deps:check >nul 2>&1
if errorlevel 1 call npm run setup
if errorlevel 1 goto :fail

echo Starting Ollama-backed local API on http://127.0.0.1:3001 ...
start "Ecom Growth Autopilot - Ollama API" /D "%~dp0" cmd /k "set AI_PROVIDER=ollama&& npm run dev:ollama"
timeout /t 5 /nobreak >nul
start "" "http://127.0.0.1:3001/dashboard"
echo.
echo Dashboard opened at http://127.0.0.1:3001/dashboard
echo Keep the API window open while using the dashboard.
exit /b 0

:fail
echo.
echo DASHBOARD START FAILED
pause
exit /b 1

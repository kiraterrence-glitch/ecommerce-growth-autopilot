@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo Ecom Growth Autopilot - Safe Portfolio Dashboard
echo ==============================================
echo.
call npm run deps:check >nul 2>&1
if errorlevel 1 call npm run setup
if errorlevel 1 goto :fail

echo Starting deterministic mock API on http://127.0.0.1:3001 ...
start "Ecom Growth Autopilot - Safe API" /D "%~dp0" cmd /k "set AI_PROVIDER=mock&& npm run dev:api"
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:3001/dashboard"
echo.
echo Dashboard opened in deterministic portfolio mode.
echo No Ollama call, platform credential, n8n Cloud execution, or external write is required.
echo Keep the API window open while reviewing the dashboard.
exit /b 0

:fail
echo.
echo SAFE DASHBOARD START FAILED
pause
exit /b 1

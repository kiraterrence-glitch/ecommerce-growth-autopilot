@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo Ecom Growth Autopilot - Start Local n8n
echo ==============================================
echo.
where n8n >nul 2>&1
if errorlevel 1 goto :missing

echo Starting local/community n8n on http://127.0.0.1:5678
echo Keep this window open while running the proof.
echo.
n8n start
exit /b %errorlevel%

:missing
echo LOCAL N8N IS NOT INSTALLED ON THIS WINDOWS MACHINE.
echo.
echo This project will not auto-install or call n8n Cloud.
echo Install n8n Community Edition locally, then rerun this file.
echo After n8n starts, use import-local-n8n-workflow-windows.cmd.
echo.
pause
exit /b 2

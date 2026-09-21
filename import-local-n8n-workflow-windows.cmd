@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo Ecom Growth Autopilot - Import Local n8n Flow
echo ==============================================
echo.
where n8n >nul 2>&1
if errorlevel 1 goto :missing

for /f "delims=" %%V in ('n8n --version 2^>nul') do set "N8N_VERSION=%%V"
echo Local n8n version: %N8N_VERSION%

echo Checking committed workflow import metadata...
node scripts/check-n8n.mjs
if errorlevel 1 goto :preflightfail

echo.
echo Importing the inactive local workflow into your local n8n profile...
echo Workflow ID: EcomFullDemo0901
n8n import:workflow --input="%CD%\n8n\workflows\full-portfolio-demo.local.json"
if errorlevel 1 goto :fail

echo.
echo IMPORT COMPLETE
echo Open http://127.0.0.1:5678 and locate:
echo   Ecom Full Portfolio Demo - Local
echo Activate it only in your local n8n instance, then run local-n8n-proof-windows.cmd.
echo.
pause
exit /b 0

:missing
echo Local n8n command was not found. Run start-local-n8n-windows.cmd after installing Community Edition locally.
pause
exit /b 2

:preflightfail
echo.
echo Workflow preflight failed before n8n import. Do not edit the workflow manually; send this output to ChatGPT.
pause
exit /b 3

:fail
echo.
echo Import failed. This package includes stable workflow IDs required by n8n 2.x CLI imports.
echo If the error still mentions workflow_entity.id, send the complete import error to ChatGPT.
pause
exit /b 1

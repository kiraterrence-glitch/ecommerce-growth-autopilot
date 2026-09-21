@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo Ecom Growth Autopilot - Local n8n E2E Proof
echo ==============================================
echo.
echo This proof accepts loopback n8n only and cannot use n8n Cloud.
echo.

call npm run build
if errorlevel 1 goto :fail

call npm run n8n:runtime-check
if errorlevel 1 goto :runtime

powershell -NoProfile -Command "try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:3001/health' -TimeoutSec 3; if(-not $r.ok){exit 1} } catch { exit 1 }"
if errorlevel 1 goto :api

set "N8N_LOCAL_URL=http://127.0.0.1:5678"
node scripts\local-n8n-proof.mjs
if errorlevel 1 goto :fail

echo.
echo LOCAL N8N END-TO-END PROOF PASSED
echo n8n Cloud executions used by this proof: 0
pause
exit /b 0

:runtime
echo.
echo Start local n8n with start-local-n8n-windows.cmd, import the workflow, and activate it locally.
pause
exit /b 2

:api
echo.
echo The Ecom local API is not running on http://127.0.0.1:3001
echo Open a second terminal in this folder and run:
echo   npm run dev:api
pause
exit /b 2

:fail
echo.
echo Local n8n proof failed. Read docs\LOCAL-N8N-PROOF.md.
pause
exit /b 1

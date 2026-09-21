@echo off
setlocal
cd /d "%~dp0"
set "NO_PAUSE=1"
echo ==============================================
echo Ecom Growth Autopilot - Finish Portfolio Proof
echo ==============================================
echo.
echo This performs the only remaining engine-level proof, then runs the release preflight.
echo It uses local n8n only, deterministic mock AI, and performs no external writes.
echo.
call engine-proof-local-n8n-windows.cmd
if errorlevel 1 goto :fail

echo.
echo Engine proof passed. Running portfolio release preflight...
call portfolio-release-preflight-windows.cmd
if errorlevel 1 goto :fail

echo.
echo ==============================================
echo PORTFOLIO PROOF COMPLETE
echo ==============================================
echo Runtime receipt: .runtime\n8n-engine-proof.json
echo Next: open-dashboard-safe-windows.cmd for screenshots, then follow docs\GITHUB-PUBLISH.md.
echo.
pause
exit /b 0

:fail
echo.
echo ==============================================
echo PORTFOLIO PROOF STOPPED
echo ==============================================
echo Review the first error above. Do not reinstall Node, Ollama, or n8n unless the error explicitly requires it.
echo.
pause
exit /b 1

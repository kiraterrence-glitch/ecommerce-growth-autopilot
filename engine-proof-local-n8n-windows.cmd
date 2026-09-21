@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo Ecom Growth Autopilot - One-Command n8n Proof
echo ==============================================
echo.
echo This uses local Community n8n only.
echo It does not call n8n Cloud and cannot publish to external platforms.
echo.
node scripts\run-n8n-engine-proof.mjs
if errorlevel 1 goto :fail
echo.
echo ENGINE PROOF COMPLETE
if /I not "%NO_PAUSE%"=="1" pause
exit /b 0

:fail
echo.
echo ENGINE PROOF FAILED
echo Copy only the final n8n/error section into ChatGPT or leave it for Work using CONTINUE-LATER.md.
if /I not "%NO_PAUSE%"=="1" pause
exit /b 1

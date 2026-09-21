@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo Ecom Growth Autopilot - Portfolio Release Preflight
echo ==============================================
echo.
echo Ensuring the project-local verification dependency is available...
call npm run deps:check >nul 2>&1
if errorlevel 1 call npm run setup
if errorlevel 1 goto :fail

echo.
echo Running deterministic verification...
call npm run verify
if errorlevel 1 goto :fail

echo.
echo Validating the actual local n8n engine-proof receipt...
call npm run release:preflight
if errorlevel 1 goto :fail
echo.
echo PORTFOLIO RELEASE PREFLIGHT PASSED
echo Next: follow docs\GITHUB-PUBLISH.md and docs\DEMO-SCRIPT.md.
if /I not "%NO_PAUSE%"=="1" pause
exit /b 0

:fail
echo.
echo PORTFOLIO RELEASE PREFLIGHT BLOCKED
if /I not "%NO_PAUSE%"=="1" pause
exit /b 1

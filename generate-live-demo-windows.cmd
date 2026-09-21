@echo off
setlocal
cd /d "%~dp0"
echo Ecom Growth Autopilot - Live Ollama Demo

echo [1/3] Ensuring project dependencies...
call npm run setup
if errorlevel 1 goto :fail

echo.
echo [2/3] Running deterministic verification and marketing quality gates...
call npm run verify
if errorlevel 1 goto :fail

echo.
echo [3/3] Generating campaign artifacts with your local Ollama model...
call npm run demo:generate:ollama
if errorlevel 1 goto :fail

echo.
echo LIVE DEMO PASSED
echo Artifacts: .runtime\demo-live
pause
exit /b 0

:fail
echo.
echo LIVE DEMO FAILED
pause
exit /b 1

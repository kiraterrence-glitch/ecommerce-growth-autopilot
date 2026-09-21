@echo off
setlocal
cd /d "%~dp0"
echo Ecom Growth Autopilot - Windows Diagnostic
echo.
node scripts\diagnose-windows.mjs
if errorlevel 1 (
  echo.
  echo DIAGNOSTIC FAILED
  pause
  exit /b 1
)
echo.
echo DIAGNOSTIC PASSED
pause

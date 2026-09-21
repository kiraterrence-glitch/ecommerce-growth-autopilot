@echo off
setlocal
cd /d "%~dp0"
echo Ecom Growth Autopilot - Windows Setup
echo.
call npm run setup
if errorlevel 1 goto :fail
echo.
call npm run verify
if errorlevel 1 goto :fail
echo.
echo SETUP AND VERIFICATION PASSED
pause
exit /b 0
:fail
echo.
echo SETUP OR VERIFICATION FAILED
pause
exit /b 1

@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo Ecom Growth Autopilot - Start Here
echo ==============================================
echo.
echo [1/2] Ensuring project-local dependencies...
call npm run setup
if errorlevel 1 goto :fail
echo.
echo [2/2] Running Windows, Ollama, API, and verification diagnostics...
call npm run diagnose:windows
if errorlevel 1 goto :fail
echo.
echo LOCAL DIAGNOSTIC COMPLETE
echo Review the output above for any non-fatal Ollama smoke warning.
echo Deterministic verification must end with: VERIFICATION PASSED
echo Demo artifacts can be generated with: npm run demo:generate
pause
exit /b 0
:fail
echo.
echo START-HERE CHECK FAILED
echo Copy the complete output into ChatGPT for debugging.
pause
exit /b 1

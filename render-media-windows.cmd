@echo off
setlocal
cd /d "%~dp0"
echo Ecom Growth Autopilot - Media Renderer

echo [1/3] Checking browser and FFmpeg tools...
call npm run media:doctor
if errorlevel 1 goto :fail

echo.
echo [2/3] Generating verified deterministic campaign artifacts...
call npm run demo:generate
if errorlevel 1 goto :fail

echo.
echo [3/3] Rendering PNG creatives and MP4 storyboard...
call npm run demo:render-media
if errorlevel 1 goto :fail

echo.
echo MEDIA RENDER PASSED
echo Artifacts: .runtime\demo\media
pause
exit /b 0

:fail
echo.
echo MEDIA RENDER FAILED
pause
exit /b 1

@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ==============================================
echo Ecom Growth Autopilot - Publish to GitHub
echo ==============================================
echo.
echo Target: https://github.com/kiraterrence-glitch/ecommerce-growth-autopilot

git --version >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: Git is not installed or not on PATH.
  echo Install Git for Windows, then run this file again.
  pause
  exit /b 1
)

echo [1/7] Running repository safety checks...
node scripts\check-secrets.mjs
if errorlevel 1 goto :fail
node scripts\check-package-safety.mjs
if errorlevel 1 goto :fail

echo [2/7] Initializing local Git repository...
if not exist .git (
  git init
  if errorlevel 1 goto :fail
)
git branch -M main
if errorlevel 1 goto :fail

git config user.name "Sean Terrence Monares"
git config user.email "316450763+kiraterrence-glitch@users.noreply.github.com"

echo [3/7] Staging source files...
git add .
if errorlevel 1 goto :fail

echo.
echo Files staged for publication:
git status --short

git diff --cached --quiet
if errorlevel 1 (
  echo [4/7] Creating release commit...
  git commit -m "Portfolio release v0.9.3"
  if errorlevel 1 goto :fail
) else (
  echo [4/7] No new staged changes; keeping existing commit.
)

echo [5/7] Configuring GitHub remote...
set "EXPECTED_REMOTE=https://github.com/kiraterrence-glitch/ecommerce-growth-autopilot.git"
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin "%EXPECTED_REMOTE%"
  if errorlevel 1 goto :fail
) else (
  for /f "delims=" %%R in ('git remote get-url origin') do set "CURRENT_REMOTE=%%R"
  if /I not "%CURRENT_REMOTE%"=="%EXPECTED_REMOTE%" (
    echo ERROR: Existing origin points to "%CURRENT_REMOTE%".
    echo Expected "%EXPECTED_REMOTE%".
    echo Refusing to push to the wrong repository.
    pause
    exit /b 1
  )
)

echo [6/7] Pushing main branch...
echo If GitHub asks you to sign in, complete the browser sign-in and return here.
git push -u origin main
if errorlevel 1 goto :fail

echo [7/7] Creating and pushing v0.9.3 tag...
git rev-parse -q --verify refs/tags/v0.9.3 >nul 2>&1
if errorlevel 1 git tag -a v0.9.3 -m "Verified portfolio release v0.9.3"
git push origin v0.9.3
if errorlevel 1 goto :fail

echo.
echo ==============================================
echo GITHUB PUBLICATION COMPLETE
echo ==============================================
echo https://github.com/kiraterrence-glitch/ecommerce-growth-autopilot
pause
exit /b 0

:fail
echo.
echo ==============================================
echo GITHUB PUBLICATION STOPPED
echo ==============================================
echo Copy the final error section into ChatGPT.
pause
exit /b 1

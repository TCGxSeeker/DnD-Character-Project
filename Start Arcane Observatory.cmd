@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo Installing Arcane Observatory dependencies...
  call npm.cmd install
  if errorlevel 1 exit /b 1
)
echo Preparing the production application...
call npm.cmd run build
if errorlevel 1 exit /b 1
start "" "http://127.0.0.1:4173/"
call npm.cmd run serve:portable

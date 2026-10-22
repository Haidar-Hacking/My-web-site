@echo off
rem Checks Node.js and installs everything the app needs. Runs fully only the first time.
cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 goto nonode
for /f "tokens=1 delims=v." %%a in ('node -v') do set NODEMAJOR=%%a
if %NODEMAJOR% LSS 22 goto oldnode

if exist "node_modules\expo\package.json" if exist "node_modules\react-native-webview\package.json" exit /b 0

echo.
echo   First run: downloading what the app needs (a few hundred MB).
echo   This happens only once and takes a few minutes...
echo.
call npm install --no-audit --no-fund
if errorlevel 1 exit /b 1
call npx --yes expo install react react-native react-native-webview @react-native-async-storage/async-storage react-native-svg react-native-safe-area-context expo-linear-gradient expo-haptics expo-clipboard expo-speech expo-status-bar expo-splash-screen expo-build-properties expo-file-system expo-intent-launcher expo-application expo-constants expo-crypto
if errorlevel 1 exit /b 1
exit /b 0

:nonode
echo.
echo   Node.js is not installed on this computer.
echo   The download page will open now: install the LTS version,
echo   then double-click this file again.
echo.
start "" "https://nodejs.org/en/download"
exit /b 1

:oldnode
echo.
echo   Your Node.js is too old (version %NODEMAJOR%). Version 22 or newer is needed.
echo   The download page will open now: install the LTS version, then try again.
echo.
start "" "https://nodejs.org/en/download"
exit /b 1

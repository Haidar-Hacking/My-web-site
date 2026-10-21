@echo off
chcp 65001 >nul
title GB Browser - Build Android APK
cd /d "%~dp0"

call tools\setup.bat
if errorlevel 1 goto failed

echo.
echo   The APK is built on Expo's servers (free account at expo.dev).
echo   Sign in when asked. The first build also asks to create the project
echo   and an Android signing key: answer Yes to both.
echo.
call npx --yes eas-cli@latest whoami >nul 2>nul || call npx --yes eas-cli@latest login
if errorlevel 1 goto failed
call npx --yes eas-cli@latest build -p android --profile preview
if errorlevel 1 goto failed

echo.
echo   Done. Open the link above on your Android phone to download
echo   and install GB Browser (allow "install unknown apps" if asked).
echo.
pause
exit /b 0

:failed
echo.
echo   The build stopped with an error (see the messages above).
pause
exit /b 1

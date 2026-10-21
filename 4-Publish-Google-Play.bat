@echo off
chcp 65001 >nul
title GB Browser - Build for Google Play
cd /d "%~dp0"

call tools\setup.bat
if errorlevel 1 goto failed

echo.
echo   This builds the .aab file that Google Play asks for.
echo   Sign in to your Expo account when asked.
echo.
call npx --yes eas-cli@latest whoami >nul 2>nul || call npx --yes eas-cli@latest login
if errorlevel 1 goto failed
call npx --yes eas-cli@latest build -p android --profile production
if errorlevel 1 goto failed

echo.
echo   Done. Download the .aab from the link above and upload it in
echo   Google Play Console (play.google.com/console). See README for the steps.
echo.
pause
exit /b 0

:failed
echo.
echo   The build stopped with an error (see the messages above).
pause
exit /b 1

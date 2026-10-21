@echo off
chcp 65001 >nul
title GB Browser - Build and upload for iPhone (App Store)
cd /d "%~dp0"

call tools\setup.bat
if errorlevel 1 goto failed

echo.
echo   You need:
echo     - a free Expo account (expo.dev)
echo     - an Apple Developer Program membership (developer.apple.com)
echo   No Mac is needed: the app is built on Expo's servers.
echo   Sign in to Expo, then to your Apple account when asked, and let it
echo   create the certificates for you (answer Yes).
echo   When the build is ready it is uploaded to App Store Connect.
echo.
call npx --yes eas-cli@latest whoami >nul 2>nul || call npx --yes eas-cli@latest login
if errorlevel 1 goto failed
call npx --yes eas-cli@latest build -p ios --profile production --auto-submit
if errorlevel 1 goto failed

echo.
echo   Done. In a few minutes the build appears in App Store Connect / TestFlight.
echo   Install it on your iPhone with the TestFlight app, then send it for review
echo   from appstoreconnect.apple.com (see README for the full steps).
echo.
pause
exit /b 0

:failed
echo.
echo   The build stopped with an error (see the messages above).
pause
exit /b 1

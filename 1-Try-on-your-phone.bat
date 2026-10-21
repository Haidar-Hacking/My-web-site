@echo off
chcp 65001 >nul
title GB Browser - Try it on your phone
cd /d "%~dp0"

call tools\setup.bat
if errorlevel 1 goto failed

echo.
echo   1. Install "Expo Go" on your phone (App Store or Google Play).
echo   2. Connect the phone to the same Wi-Fi as this computer.
echo   3. Scan the QR code that appears: iPhone with the Camera app,
echo      Android from inside Expo Go.
echo   If Windows asks about the firewall, choose Allow.
echo.
echo   Phone on a different network? Type T then Enter for tunnel mode.
echo.
set MODE=
set /p MODE=  Press Enter to start: 
if /i "%MODE%"=="T" (
  call npx expo start --tunnel
) else (
  call npx expo start
)
exit /b 0

:failed
echo.
echo   Setup stopped with an error (see the messages above).
echo   Check your internet connection and try again.
pause
exit /b 1

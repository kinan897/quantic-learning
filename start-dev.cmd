@echo off
rem Starts Quantic Learning for development: double-click this file.
rem Opens two windows: the API (backend) and the app (Expo, with the QR code for your phone).
rem Close either window, or press Ctrl+C in it, to stop that part.

start "Quantic API" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0"
start "Quantic App - scan the QR code with your phone" cmd /k "cd /d "%~dp0mobile" && npx.cmd expo start"

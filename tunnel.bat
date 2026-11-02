@echo off
chcp 65001 >nul
title Туннель для Технического паспорта

if "%PORT%"=="" set PORT=5000

echo ====================================================================
echo     Запуск туннеля для порта %PORT% (Windows)
echo ====================================================================
echo.
echo 1) Cloudflare Quick Tunnel (Рекомендуется, бесплатно, HTTPS)
echo 2) Localtunnel (npx localtunnel --port %PORT%)
echo 3) ngrok (ngrok http %PORT%)
echo.

set /p choice="Выберите туннель [1-3, по умолчанию 1]: "
if "%choice%"=="" set choice=1

if "%choice%"=="1" (
    where cloudflared >nul 2>nul
    if %errorlevel% equ 0 (
        cloudflared tunnel --url http://localhost:%PORT%
    ) else (
        echo Запуск cloudflared через npx...
        npx --yes cloudflared tunnel --url http://localhost:%PORT%
    )
    goto end
)

if "%choice%"=="2" (
    npx --yes localtunnel --port %PORT%
    goto end
)

if "%choice%"=="3" (
    where ngrok >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ОШИБКА] ngrok не установлен!
        pause
        exit /b 1
    )
    ngrok http %PORT%
    goto end
)

:end

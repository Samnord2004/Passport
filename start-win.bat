@echo off
chcp 65001 >nul
title Технический паспорт объектов - Локальный сервер

echo ====================================================================
echo     Технический паспорт объектов - Запуск на Windows
echo ====================================================================
echo.

:: 1. Проверка Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден в системе!
    echo Пожалуйста, установите Node.js версии 18 или новее с https://nodejs.org/
    echo После установки перезапустите этот файл.
    pause
    exit /b 1
)

:: 2. Проверка и установка зависимостей
if not exist "node_modules\" (
    echo [INFO] Папка node_modules не найдена. Устанавливаем зависимости...
    call npm install
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Не удалось установить зависимости.
        pause
        exit /b 1
    )
)

:: 3. Проверка production сборки
if not exist "dist\server.cjs" (
    echo [INFO] Сборка dist не найдена. Собираем проект (npm run build)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Ошибка сборки проекта.
        pause
        exit /b 1
    )
)

if "%PORT%"=="" set PORT=5000

echo.
echo Выберите режим запуска:
echo   [1] Локальный сервер (http://localhost:%PORT%)
echo   [2] Сервер + Cloudflare Tunnel (Быстрый публичный HTTPS без регистрации) [РЕКОМЕНДУЕТСЯ]
echo   [3] Сервер + Localtunnel (npx localtunnel)
echo   [4] Сервер + ngrok (требуется установленный ngrok)
echo   [5] Режим разработки (dev сервер: npm run dev)
echo.
set /p choice="Введите номер (1-5, по умолчанию 2): "
if "%choice%"=="" set choice=2

if "%choice%"=="1" (
    echo.
    echo Запуск локального сервера на http://localhost:%PORT%...
    echo Нажмите Ctrl+C для остановки.
    set NODE_ENV=production
    node dist\server.cjs
    goto end
)

if "%choice%"=="2" (
    echo.
    echo Запуск локального сервера в фоновом окне...
    start "Local Server (Tech Passport)" cmd /k "set NODE_ENV=production && node dist\server.cjs"
    timeout /t 3 /nobreak >nul
    echo.
    echo Запуск Cloudflare Tunnel...
    where cloudflared >nul 2>nul
    if %errorlevel% equ 0 (
        cloudflared tunnel --url http://localhost:%PORT%
    ) else (
        echo cloudflared не установлен глобально. Запуск через npx...
        npx --yes cloudflared tunnel --url http://localhost:%PORT%
    )
    goto end
)

if "%choice%"=="3" (
    echo.
    echo Запуск локального сервера в фоновом окне...
    start "Local Server (Tech Passport)" cmd /k "set NODE_ENV=production && node dist\server.cjs"
    timeout /t 3 /nobreak >nul
    echo.
    echo Запуск Localtunnel...
    npx --yes localtunnel --port %PORT%
    goto end
)

if "%choice%"=="4" (
    where ngrok >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ОШИБКА] ngrok не установлен! Установите с https://ngrok.com/ или выберите вариант 2 (Cloudflare).
        pause
        exit /b 1
    )
    echo.
    echo Запуск локального сервера в фоновом окне...
    start "Local Server (Tech Passport)" cmd /k "set NODE_ENV=production && node dist\server.cjs"
    timeout /t 3 /nobreak >nul
    echo.
    echo Запуск ngrok...
    ngrok http %PORT%
    goto end
)

if "%choice%"=="5" (
    echo.
    echo Запуск dev режима...
    npm run dev
    goto end
)

echo Неверный выбор.
pause

:end

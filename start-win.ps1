# PowerShell скрипт запуска локального сервера и туннеля
# Технический паспорт объектов

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Технический паспорт объектов - Локальный сервер"

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "    Технический паспорт объектов — Запуск на Windows (PowerShell)   " -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Проверка Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ОШИБКА] Node.js не установлен!" -ForegroundColor Red
    Write-Host "Установите Node.js версии 18+ с https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Нажмите Enter для выхода..."
    exit 1
}

# Проверка node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "→ Установка зависимостей проекта (npm install)..." -ForegroundColor Yellow
    npm install
}

# Проверка сборки dist
if (-not (Test-Path "dist\server.cjs")) {
    Write-Host "→ Сборка проекта (npm run build)..." -ForegroundColor Yellow
    npm run build
}

$port = if ($env:PORT) { $env:PORT } else { "5000" }

Write-Host ""
Write-Host "Выберите режим запуска:" -ForegroundColor Cyan
Write-Host "  1) Локальный сервер (http://localhost:$port)" -ForegroundColor Green
Write-Host "  2) Сервер + Cloudflare Tunnel (Быстрый публичный HTTPS) [РЕКОМЕНДУЕТСЯ]" -ForegroundColor Green
Write-Host "  3) Сервер + Localtunnel (npx localtunnel)" -ForegroundColor Green
Write-Host "  4) Сервер + ngrok (ngrok http $port)" -ForegroundColor Green
Write-Host "  5) Режим разработки (dev)" -ForegroundColor Green
Write-Host ""

$choice = ReadHostWithDefault "Введите номер варианта" "2"

function ReadHostWithDefault($prompt, $default) {
    $input = Read-Host "$prompt [$default]"
    if ([string]::IsNullOrWhiteSpace($input)) { return $default }
    return $input
}

switch ($choice) {
    "1" {
        Write-Host "Запуск сервера на http://localhost:$port..." -ForegroundColor Green
        $env:NODE_ENV = "production"
        node dist\server.cjs
    }
    "2" {
        Write-Host "Запуск локального сервера в фоновом процессе..." -ForegroundColor Green
        $env:NODE_ENV = "production"
        $serverProcess = Start-Process node -ArgumentList "dist\server.cjs" -PassThru -NoNewWindow
        Start-Sleep -Seconds 2
        
        Write-Host "Запуск Cloudflare Tunnel..." -ForegroundColor Cyan
        try {
            if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
                cloudflared tunnel --url "http://localhost:$port"
            } else {
                npx --yes cloudflared tunnel --url "http://localhost:$port"
            }
        } finally {
            if ($serverProcess -and -not $serverProcess.HasExited) {
                Stop-Process -Id $serverProcess.Id -Force
            }
        }
    }
    "3" {
        Write-Host "Запуск локального сервера в фоновом процессе..." -ForegroundColor Green
        $env:NODE_ENV = "production"
        $serverProcess = Start-Process node -ArgumentList "dist\server.cjs" -PassThru -NoNewWindow
        Start-Sleep -Seconds 2

        Write-Host "Запуск Localtunnel..." -ForegroundColor Cyan
        try {
            npx --yes localtunnel --port $port
        } finally {
            if ($serverProcess -and -not $serverProcess.HasExited) {
                Stop-Process -Id $serverProcess.Id -Force
            }
        }
    }
    "4" {
        Write-Host "Запуск локального сервера в фоновом процессе..." -ForegroundColor Green
        $env:NODE_ENV = "production"
        $serverProcess = Start-Process node -ArgumentList "dist\server.cjs" -PassThru -NoNewWindow
        Start-Sleep -Seconds 2

        Write-Host "Запуск ngrok..." -ForegroundColor Cyan
        try {
            ngrok http $port
        } finally {
            if ($serverProcess -and -not $serverProcess.HasExited) {
                Stop-Process -Id $serverProcess.Id -Force
            }
        }
    }
    "5" {
        npm run dev
    }
    Default {
        Write-Host "Неверный выбор." -ForegroundColor Red
    }
}

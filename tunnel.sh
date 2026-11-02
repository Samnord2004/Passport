#!/usr/bin/env bash

# ==============================================================================
#  Туннелирование для локального сервера (macOS / Linux)
# ==============================================================================

set -e

PORT="${PORT:-5000}"

echo "======================================================"
echo "   Выбор туннеля для локального сервера (порт $PORT)   "
echo "======================================================"
echo "1) Cloudflare Quick Tunnel (Рекомендуется, HTTPS, бесплатно)"
echo "2) Localtunnel (npx localtunnel)"
echo "3) ngrok (требуется установленный ngrok)"
echo ""
read -p "Выберите туннель [1]: " choice
choice="${choice:-1}"

case "$choice" in
    1)
        echo "Запуск Cloudflare Tunnel..."
        if command -v cloudflared >/dev/null 2>&1; then
            cloudflared tunnel --url "http://localhost:${PORT}"
        else
            npx --yes cloudflared tunnel --url "http://localhost:${PORT}"
        fi
        ;;
    2)
        echo "Запуск Localtunnel..."
        npx --yes localtunnel --port "${PORT}"
        ;;
    3)
        echo "Запуск ngrok..."
        ngrok http "${PORT}"
        ;;
    *)
        echo "Неверный выбор."
        exit 1
        ;;
esac

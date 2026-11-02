#!/usr/bin/env bash

# ==============================================================================
#  Скрипт запуска локального сервера и туннелирования для macOS / Linux
#  Система технического обслуживания и паспортизации объектов
# ==============================================================================

set -e

# Цвета для вывода в терминал
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Переход в директорию скрипта
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}    Технический паспорт объектов — Локальный сервер и туннель       ${NC}"
echo -e "${CYAN}====================================================================${NC}"
echo ""

# 1. Проверка наличия Node.js
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}[ОШИБКА] Node.js не установлен!${NC}"
    echo -e "Для работы требуется Node.js версии 18 или новее."
    echo -e "Установите его с официального сайта: ${YELLOW}https://nodejs.org/${NC}"
    echo -e "Или через Homebrew на Mac: ${YELLOW}brew install node${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js обнаружен:${NC} $NODE_VERSION"

# 2. Проверка npm
if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}[ОШИБКА] npm не найден!${NC}"
    exit 1
fi

# 3. Проверка зависимостей node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}→ Установка зависимостей проекта (npm install)...${NC}"
    npm install
    echo -e "${GREEN}✓ Зависимости успешно установлены.${NC}"
fi

# 4. Проверка production сборки
if [ ! -f "dist/server.cjs" ] || [ ! -f "dist/index.html" ]; then
    echo -e "${YELLOW}→ Сборка проекта (npm run build)...${NC}"
    npm run build
    echo -e "${GREEN}✓ Проект успешно собран.${NC}"
fi

PORT="${PORT:-5000}"

# Меню выбора режима запуска
echo ""
echo -e "${BLUE}Выберите режим запуска:${NC}"
echo -e "  ${GREEN}1)${NC} Локальный сервер (${YELLOW}http://localhost:${PORT}${NC} + доступ по локальной сети Wi-Fi)"
echo -e "  ${GREEN}2)${NC} Сервер + ${CYAN}Cloudflare Tunnel${NC} (Быстрый публичный HTTPS без регистрации — РЕКОМЕНДУЕТСЯ)"
echo -e "  ${GREEN}3)${NC} Сервер + ${CYAN}Localtunnel${NC} (Публичный URL через npx localtunnel)"
echo -e "  ${GREEN}4)${NC} Сервер + ${CYAN}ngrok${NC} (Требуется установленный ngrok)"
echo -e "  ${GREEN}5)${NC} Режим разработки (dev с горячей перезагрузкой: npm run dev)"
echo ""
read -p "Введите номер варианта (по умолчанию 2): " choice
choice="${choice:-2}"

# Функция для завершения фоновых процессов при выходе
cleanup() {
    echo ""
    echo -e "${YELLOW}Остановка процессов...${NC}"
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
    fi
    if [ -n "$TUNNEL_PID" ]; then
        kill "$TUNNEL_PID" 2>/dev/null || true
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

case "$choice" in
    1)
        echo ""
        echo -e "${GREEN}→ Запуск локального сервера на порту ${PORT}...${NC}"
        echo -e "Открыть в браузере: ${CYAN}http://localhost:${PORT}${NC}"
        echo -e "Для доступа с телефона/планшета в той же сети используйте локальный IP вашего Mac."
        echo ""
        NODE_ENV=production node dist/server.cjs
        ;;
    2)
        echo ""
        echo -e "${GREEN}→ Запуск локального сервера на порту ${PORT}...${NC}"
        NODE_ENV=production node dist/server.cjs &
        SERVER_PID=$!
        sleep 2

        echo -e "${CYAN}→ Запуск Cloudflare Tunnel для порта ${PORT}...${NC}"
        if command -v cloudflared >/dev/null 2>&1; then
            cloudflared tunnel --url "http://localhost:${PORT}"
        else
            echo -e "${YELLOW}cloudflared не установлен глобально. Запускаем через npx...@${NC}"
            npx --yes cloudflared tunnel --url "http://localhost:${PORT}"
        fi
        ;;
    3)
        echo ""
        echo -e "${GREEN}→ Запуск локального сервера на порту ${PORT}...${NC}"
        NODE_ENV=production node dist/server.cjs &
        SERVER_PID=$!
        sleep 2

        echo -e "${CYAN}→ Запуск Localtunnel для порта ${PORT}...${NC}"
        npx --yes localtunnel --port "${PORT}"
        ;;
    4)
        if ! command -v ngrok >/dev/null 2>&1; then
            echo -e "${RED}[ОШИБКА] ngrok не установлен! Установите его с https://ngrok.com/ или используйте вариант 2 (Cloudflare).${NC}"
            exit 1
        fi
        echo ""
        echo -e "${GREEN}→ Запуск локального сервера на порту ${PORT}...${NC}"
        NODE_ENV=production node dist/server.cjs &
        SERVER_PID=$!
        sleep 2

        echo -e "${CYAN}→ Запуск ngrok для порта ${PORT}...${NC}"
        ngrok http "${PORT}"
        ;;
    5)
        echo ""
        echo -e "${GREEN}→ Запуск в режиме разработки (npm run dev)...${NC}"
        npm run dev
        ;;
    *)
        echo -e "${RED}Неверный выбор.${NC}"
        exit 1
        ;;
esac

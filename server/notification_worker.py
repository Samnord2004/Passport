#!/usr/bin/env python3
"""
Notification Worker Microservice (Python Counterpart)
This script demonstrates how to implement the background task queue in Python (e.g. Celery / standalone daemon).

Required dependencies:
pip install python-telegram-bot vk-api requests
"""

import os
import sys
import json
import smtplib
import requests
from email.mime.text import MIMEText
from email.header import Header

# For real standalone python-telegram-bot v20+ async calls
import asyncio


# 1. Telegram Bot Delivery
async def send_telegram_notification(token: str, chat_id: str, message: str) -> bool:
    """
    Sends message using python-telegram-bot library style over the API.
    """
    print(f"[Python Worker] Sending Telegram message to chat {chat_id}...")
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message
        }
        res = requests.post(url, json=payload, timeout=10)
        return res.status_code == 200
    except Exception as e:
        print(f"[Python Worker] Telegram exception: {e}", file=sys.stderr)
        return False


# 2. MAX Bot Delivery (max-botapi-python API reference)
def send_max_notification(token: str, chat_id: str, message: str) -> bool:
    """
    Sends message using MAX Bot REST API interface.
    """
    print(f"[Python Worker] Sending MAX notification to channel/chat {chat_id}...")
    try:
        url = f"https://api.max.ru/v1/chats/{chat_id}/messages"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = {
            "text": message
        }
        res = requests.post(url, json=payload, headers=headers, timeout=10)
        return res.status_code == 200
    except Exception as e:
        print(f"[Python Worker] MAX Bot connection failed: {e}", file=sys.stderr)
        return False


# 3. VK API Delivery (vk_api package reference or raw http)
def send_vk_notification(access_token: str, user_id: str, message: str) -> bool:
    """
    Sends messaging over VK Social Platform utilizing VK API messages.send.
    """
    print(f"[Python Worker] Sending VK message to User {user_id}...")
    import random
    try:
        url = "https://api.vk.com/method/messages.send"
        params = {
            "user_id": user_id,
            "message": message,
            "access_token": access_token,
            "v": "5.131",
            "random_id": random.randint(1, 10000000)
        }
        res = requests.post(url, data=params, timeout=10)
        data = res.json()
        if "error" in data:
            print(f"[Python Worker] VK API error reply: {data['error']['error_msg']}", file=sys.stderr)
            return False
        return res.status_code == 200
    except Exception as e:
        print(f"[Python Worker] VK communication exception: {e}", file=sys.stderr)
        return False


# 4. Standard SMTP Email Delivery
def send_smtp_email(to_email: str, message: str) -> bool:
    """
    Sends text email using standard Python smtplib with secure TLS overlay.
    """
    host = os.getenv("SMTP_HOST", "smtp.yandex.ru")
    port = int(os.getenv("SMTP_PORT", "465"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASS", "")
    from_addr = os.getenv("SMTP_FROM", user or "notify-bot@commercial-passport.ru")

    if not user or not password:
        print("[Python Worker] SMTP Credentials are unconfigured. Skipping SMTP real delivery.", file=sys.stderr)
        return False

    print(f"[Python Worker] Dispatching secure SMTP Email from [{from_addr}] to [{to_email}]...")
    try:
        msg = MIMEText(message, 'plain', 'utf-8')
        msg['Subject'] = Header("Цифровой Паспорт Объекта - Оповещение", 'utf-8')
        msg['From'] = from_addr
        msg['To'] = to_email

        # Standard secure SSL Connection sequence
        server = smtplib.SMTP_SSL(host, port, timeout=15)
        server.login(user, password)
        server.sendmail(from_addr, [to_email], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"[Python Worker] SMTP mail delivery failed: {e}", file=sys.stderr)
        return False


async def main():
    print("[Python Worker] Standalone Python Task Processor Initialized Successfully.")
    print("[Python Worker] Running mock listening daemon...")
    # This daemon is meant to run alongside Celery or custom pipeline message brokers.
    # We display current environment check parameters
    print(f"TELEGRAM_BOT_TOKEN: {'SET' if os.getenv('TELEGRAM_BOT_TOKEN') else 'NOT_SET'}")
    print(f"MAX_BOT_TOKEN: {'SET' if os.getenv('MAX_BOT_TOKEN') else 'NOT_SET'}")
    print(f"VK_ACCESS_TOKEN: {'SET' if os.getenv('VK_ACCESS_TOKEN') else 'NOT_SET'}")
    print(f"SMTP_HOST: {os.getenv('SMTP_HOST', 'smtp.yandex.ru')}")

if __name__ == "__main__":
    asyncio.run(main())

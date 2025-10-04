import os
import requests
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

load_dotenv()

# --- Config ---
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_BASE_URL = os.getenv("API_BASE_URL", "https://trak.miikat.dev/")

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text

    # If the model produced structured JSON for submission, catch it
    try:
        r = requests.post(f"{API_BASE_URL}/api/telegram", json={"message": text}, timeout=10)
        if r.status_code == 200 or r.status_code == 201:
            await update.message.reply_text("✅ Item submitted to inventory.")
        else:
            await update.message.reply_text(f"⚠️ API error: {r.status_code}")
    except Exception as e:
        logger.error(f"Failed to parse/submit: {e}")

def main():
    app = Application.builder().token(TELEGRAM_TOKEN).build()

    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("Bot running...")
    app.run_polling()

if __name__ == "__main__":
    main()


/**
 * Shared Telegram Bot API helpers.
 */

const TELEGRAM_API = "https://api.telegram.org";

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

interface SendMessageOptions {
  chatId: number;
  text: string;
  parseMode?: "HTML" | "Markdown";
  disableWebPagePreview?: boolean;
  replyMarkup?: { inline_keyboard: InlineKeyboardButton[][] };
}

export async function sendTelegramMessage(
  botToken: string,
  { chatId, text, parseMode = "HTML", disableWebPagePreview = true, replyMarkup }: SendMessageOptions
): Promise<{ ok: boolean; description?: string }> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: disableWebPagePreview,
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text?: string
): Promise<{ ok: boolean }> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
  return res.json();
}

export async function editMessageReplyMarkup(
  botToken: string,
  chatId: number,
  messageId: number,
  replyMarkup?: { inline_keyboard: InlineKeyboardButton[][] }
): Promise<{ ok: boolean }> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup || { inline_keyboard: [] },
    }),
  });
  return res.json();
}

export async function setWebhook(
  botToken: string,
  url: string,
  secretToken: string
): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"],
    }),
  });
  return res.json();
}

export async function deleteWebhook(
  botToken: string
): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/deleteWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

/**
 * Escape HTML special characters for Telegram HTML parse mode.
 */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

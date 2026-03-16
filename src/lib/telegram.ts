/**
 * Shared Telegram Bot API helpers.
 */

const TELEGRAM_API = "https://api.telegram.org";

interface SendMessageOptions {
  chatId: number;
  text: string;
  parseMode?: "HTML" | "Markdown";
  disableWebPagePreview?: boolean;
}

export async function sendTelegramMessage(
  botToken: string,
  { chatId, text, parseMode = "HTML", disableWebPagePreview = true }: SendMessageOptions
): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview,
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
      allowed_updates: ["message"],
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

import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";
import { setWebhook, deleteWebhook } from "@/lib/telegram";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { ok: false, error: "agentId is required" },
        { status: 400 }
      );
    }

    // 1. Fetch bot token from Supabase
    const { data, error } = await agentSupabase
      .from("agents")
      .select("telegram_bot_token")
      .eq("agent_id", Number(agentId))
      .single();

    if (error || !data?.telegram_bot_token) {
      return NextResponse.json(
        { ok: false, error: "Telegram bot token not found. Save a bot token first." },
        { status: 404 }
      );
    }

    const token = data.telegram_bot_token;

    // 2. Delete existing webhook first (so getUpdates works)
    await deleteWebhook(token);

    // 3. getUpdates to find the most recent chat_id
    const updatesRes = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?limit=100`
    );
    const updatesData = await updatesRes.json();

    if (!updatesData.ok || !updatesData.result?.length) {
      return NextResponse.json({
        ok: false,
        error:
          "No messages found. Send /start to your bot in Telegram first, then try again.",
      });
    }

    // Find the most recent message with a chat
    const updates = updatesData.result as Array<{
      message?: { chat: { id: number; title?: string; first_name?: string; type: string } };
    }>;

    let chat: { id: number; title?: string; first_name?: string; type: string } | null = null;
    for (let i = updates.length - 1; i >= 0; i--) {
      if (updates[i].message?.chat) {
        chat = updates[i].message!.chat;
        break;
      }
    }

    if (!chat) {
      return NextResponse.json({
        ok: false,
        error:
          "No chat found in recent updates. Send /start to your bot in Telegram first.",
      });
    }

    // 4. sendMessage to the detected chat
    const sendRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chat.id,
          text: "Tokamak DAO Agent connected successfully!",
        }),
      }
    );
    const sendData = await sendRes.json();

    if (!sendData.ok) {
      return NextResponse.json({
        ok: false,
        error: sendData.description || "Failed to send message",
      });
    }

    // 5. Save chat_id + set up webhook
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const webhookSecret = crypto
      .createHmac("sha256", token)
      .update("webhook-secret")
      .digest("hex")
      .slice(0, 32);

    // Determine app URL for webhook
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : null);

    if (appUrl) {
      const webhookUrl = `${appUrl}/api/agents/telegram/webhook?hash=${tokenHash}`;
      const webhookResult = await setWebhook(token, webhookUrl, webhookSecret);
      if (!webhookResult.ok) {
        console.error("Failed to set webhook:", webhookResult.description);
      }
    }

    await agentSupabase
      .from("agents")
      .update({
        telegram_chat_id: chat.id,
        webhook_token_hash: tokenHash,
      })
      .eq("agent_id", Number(agentId));

    const chatTitle = chat.title || chat.first_name || `Chat ${chat.id}`;

    return NextResponse.json({ ok: true, chatTitle });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to send test message" },
      { status: 500 }
    );
  }
}

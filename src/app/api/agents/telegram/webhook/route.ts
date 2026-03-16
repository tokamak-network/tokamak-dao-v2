import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";
import { sendTelegramMessage } from "@/lib/telegram";
import { handleOnboardingResponse } from "@/lib/agent-onboarding";
import { handleProposalDiscussion } from "@/lib/agent-analysis";
import crypto from "crypto";

/**
 * Telegram webhook handler.
 * URL: POST /api/agents/telegram/webhook?hash={sha256(botToken)}
 * Security: Validates X-Telegram-Bot-Api-Secret-Token header.
 */
export async function POST(req: NextRequest) {
  try {
    const hash = req.nextUrl.searchParams.get("hash");
    if (!hash) {
      return NextResponse.json({ error: "Missing hash" }, { status: 400 });
    }

    // 1. Find agent by webhook_token_hash
    const { data: agent, error } = await agentSupabase
      .from("agents")
      .select("agent_id, telegram_bot_token, telegram_chat_id, webhook_token_hash")
      .eq("webhook_token_hash", hash)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // 2. Verify secret token
    const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
    const expectedSecret = crypto
      .createHmac("sha256", agent.telegram_bot_token)
      .update("webhook-secret")
      .digest("hex")
      .slice(0, 32);

    if (secretHeader !== expectedSecret) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    // 3. Parse Telegram update
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: true }); // Empty body, ignore
    }

    const message = body.message as
      | { chat: { id: number }; text?: string; reply_to_message?: { text?: string } }
      | undefined;

    if (!message?.text) {
      return NextResponse.json({ ok: true }); // No text message, ignore
    }

    const chatId = message.chat.id;
    const userText = message.text;
    const botToken = agent.telegram_bot_token;
    const agentId = agent.agent_id;

    // Update chat_id if not set
    if (!agent.telegram_chat_id) {
      await agentSupabase
        .from("agents")
        .update({ telegram_chat_id: chatId })
        .eq("agent_id", agentId);
    }

    // Handle /start command
    if (userText === "/start") {
      await sendTelegramMessage(botToken, {
        chatId,
        text: "안녕하세요! Tokamak DAO Agent입니다. 웹에서 프로파일링을 시작하시면 거버넌스 특성을 파악해 드리겠습니다.",
      });
      return NextResponse.json({ ok: true });
    }

    // 4. Route message based on agent state
    const { data: profile } = await agentSupabase
      .from("agent_profiles")
      .select("onboarding_step, traits")
      .eq("agent_id", agentId)
      .single();

    if (profile && profile.onboarding_step >= 1 && profile.onboarding_step <= 7) {
      // Onboarding in progress
      await handleOnboardingResponse(
        agentId,
        botToken,
        chatId,
        userText,
        profile.onboarding_step
      );
      return NextResponse.json({ ok: true });
    }

    if (profile && profile.onboarding_step > 7) {
      // Onboarding complete - check if replying to a proposal analysis
      const replyText = message.reply_to_message?.text;
      if (replyText) {
        // Try to extract proposal context from the reply
        // Look for the most recent proposal analysis conversation
        const { data: recentConv } = await agentSupabase
          .from("agent_conversations")
          .select("context_id")
          .eq("agent_id", agentId)
          .eq("context_type", "proposal_analysis")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (recentConv?.context_id) {
          const response = await handleProposalDiscussion(
            agentId,
            recentConv.context_id,
            botToken,
            chatId,
            userText
          );
          await sendTelegramMessage(botToken, { chatId, text: response });
          return NextResponse.json({ ok: true });
        }
      }

      // General message after onboarding - just acknowledge
      await sendTelegramMessage(botToken, {
        chatId,
        text: "새로운 안건이 올라오면 맞춤형 분석을 보내드리겠습니다. 안건 분석 메시지에 답장하시면 더 자세히 논의할 수 있습니다.",
      });
      return NextResponse.json({ ok: true });
    }

    // No profile or onboarding not started
    await sendTelegramMessage(botToken, {
      chatId,
      text: "아직 프로파일링이 시작되지 않았습니다. 웹에서 \"프로파일링 시작\" 버튼을 클릭해주세요.",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

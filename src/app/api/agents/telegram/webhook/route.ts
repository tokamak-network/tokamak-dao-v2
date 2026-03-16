import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";
import {
  sendTelegramMessage,
  answerCallbackQuery,
  editMessageReplyMarkup,
} from "@/lib/telegram";
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

    const botToken = agent.telegram_bot_token;
    const agentId = agent.agent_id;

    // 4. Handle callback_query (inline button press)
    const callbackQuery = body.callback_query as
      | {
          id: string;
          from: { id: number };
          message?: { chat: { id: number }; message_id: number };
          data?: string;
        }
      | undefined;

    if (callbackQuery?.data) {
      return handleCallbackQuery(callbackQuery, agentId, botToken);
    }

    // 5. Handle message
    const message = body.message as
      | { chat: { id: number }; text?: string; reply_to_message?: { text?: string } }
      | undefined;

    if (!message?.text) {
      return NextResponse.json({ ok: true }); // No text message, ignore
    }

    const chatId = message.chat.id;
    const userText = message.text;

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
        text: "안녕하세요! Tokamak DAO Agent입니다. 새로운 안건이 올라오면 요약과 분석을 보내드리겠습니다.",
      });
      return NextResponse.json({ ok: true });
    }

    // 6. Route: check if this is a reply to a proposal analysis
    const replyText = message.reply_to_message?.text;
    if (replyText) {
      // Find the most recent proposal analysis conversation
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

    // General message - guide user
    await sendTelegramMessage(botToken, {
      chatId,
      text: "새로운 안건이 올라오면 분석을 보내드리겠습니다. 안건 분석 메시지에 답장하시면 더 자세히 논의할 수 있습니다.",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

/**
 * Handle inline keyboard button presses (vote buttons).
 * callback_data format: "vote:{proposalId}:{for|against|abstain}"
 */
async function handleCallbackQuery(
  callbackQuery: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  },
  agentId: number,
  botToken: string
): Promise<NextResponse> {
  const data = callbackQuery.data || "";
  const parts = data.split(":");

  if (parts[0] === "vote" && parts.length === 3) {
    const proposalId = parts[1];
    const voteChoice = parts[2]; // "for" | "against" | "abstain"
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;

    const voteLabels: Record<string, string> = {
      for: "👍 For (찬성)",
      against: "👎 Against (반대)",
      abstain: "🤚 Abstain (기권)",
    };

    // Save vote preference
    await agentSupabase.from("agent_conversations").insert({
      agent_id: agentId,
      context_type: "proposal_analysis",
      context_id: proposalId,
      messages: [
        {
          role: "user",
          content: `Vote: ${voteChoice}`,
        },
      ],
      trait_deltas: null,
    });

    // Answer callback to remove loading state
    await answerCallbackQuery(
      botToken,
      callbackQuery.id,
      `${voteLabels[voteChoice] || voteChoice}을(를) 선택했습니다.`
    );

    // Remove buttons and show selected vote
    if (chatId && messageId) {
      await editMessageReplyMarkup(botToken, chatId, messageId);
      await sendTelegramMessage(botToken, {
        chatId,
        text: `✅ <b>${voteLabels[voteChoice] || voteChoice}</b>을(를) 선택했습니다.\n\n이 선택에 대해 더 논의하고 싶으시면 답장해주세요.`,
      });
    }
  } else {
    await answerCallbackQuery(botToken, callbackQuery.id);
  }

  return NextResponse.json({ ok: true });
}

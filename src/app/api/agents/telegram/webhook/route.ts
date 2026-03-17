import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";
import {
  sendTelegramMessage,
  answerCallbackQuery,
  editMessageReplyMarkup,
} from "@/lib/telegram";
import { handleProposalDiscussion } from "@/lib/agent-analysis";
import { castAgentVote, voteCodeToSupport } from "@/lib/agent-vote";
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

    // Handle /start command — just acknowledge silently
    if (userText === "/start") {
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
 * callback_data format: "v:{proposalShortId}:{f|a|x}"
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

  if (parts[0] === "v" && parts.length === 3) {
    const proposalShortId = parts[1];
    const voteCode = parts[2]; // "f" | "a" | "x"
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;

    const voteLabels: Record<string, string> = {
      f: "👍 For (찬성)",
      a: "👎 Against (반대)",
      x: "🤚 Abstain (기권)",
    };

    // Answer callback immediately to remove loading state
    await answerCallbackQuery(
      botToken,
      callbackQuery.id,
      `${voteLabels[voteCode] || voteCode} — 온체인 투표를 실행합니다...`
    );

    // Remove buttons
    if (chatId && messageId) {
      await editMessageReplyMarkup(botToken, chatId, messageId);
    }

    // Resolve shortId → proposalId from agent_conversations
    const { data: conv, error: convError } = await agentSupabase
      .from("agent_conversations")
      .select("context_id, messages")
      .eq("agent_id", agentId)
      .eq("context_type", "proposal_analysis")
      .eq("context_id", proposalShortId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (convError) {
      console.error("Failed to find conversation for vote:", {
        agentId,
        proposalShortId,
        error: convError.message,
      });
    }

    // Extract real proposalId from conversation messages
    let proposalId: bigint | null = null;
    if (conv?.messages) {
      const messages = conv.messages as Array<{ role: string; content: string; proposal_id?: string }>;
      for (const msg of messages) {
        // Check explicit proposal_id field
        if (msg.proposal_id) {
          proposalId = BigInt(msg.proposal_id);
          break;
        }
        // Parse from content: [proposalId:12345]
        const match = msg.content?.match(/\[proposalId:(\d+)\]/);
        if (match) {
          proposalId = BigInt(match[1]);
          break;
        }
      }
    }

    if (!proposalId) {
      console.error("Could not resolve proposalId:", {
        agentId,
        proposalShortId,
        hasConv: !!conv,
        messagesCount: conv?.messages ? (conv.messages as unknown[]).length : 0,
        messages: conv?.messages,
      });
      if (chatId) {
        await sendTelegramMessage(botToken, {
          chatId,
          text: "❌ 안건 ID를 확인할 수 없습니다. 새로 알림을 받은 안건에서 다시 시도해주세요.",
        });
      }
      return NextResponse.json({ ok: true });
    }

    // Save vote preference
    await agentSupabase.from("agent_conversations").insert({
      agent_id: agentId,
      context_type: "proposal_analysis",
      context_id: proposalShortId,
      messages: [
        {
          role: "user",
          content: `Vote: ${voteCode === "f" ? "for" : voteCode === "a" ? "against" : "abstain"}`,
        },
      ],
      trait_deltas: null,
    });

    // Execute on-chain vote
    if (chatId) {
      await sendTelegramMessage(botToken, {
        chatId,
        text: `⏳ <b>${voteLabels[voteCode]}</b> — 온체인 투표를 실행 중입니다...`,
      });

      try {
        const support = voteCodeToSupport(voteCode);
        const result = await castAgentVote(agentId, proposalId, support);

        if (result.success && result.pending) {
          const appUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://dao.tokamak.network"}/agents/${agentId}`;
          await sendTelegramMessage(botToken, {
            chatId,
            text: [
              `✍️ <b>${voteLabels[voteCode]}</b> 서명 완료!`,
              ``,
              `투표권: ${result.votingPower} vTON`,
              `⚠️ Agent 가스비 잔액이 부족합니다.`,
              `프론트엔드에서 투표를 제출해주세요.`,
              ``,
              `<a href="${appUrl}">투표 제출하러 가기 →</a>`,
            ].join("\n"),
          });
        } else if (result.success) {
          const explorerUrl = `https://sepolia.etherscan.io/tx/${result.txHash}`;
          await sendTelegramMessage(botToken, {
            chatId,
            text: [
              `✅ <b>${voteLabels[voteCode]}</b> 온체인 투표 완료!`,
              ``,
              `투표권: ${result.votingPower} vTON`,
              `<a href="${explorerUrl}">트랜잭션 확인 →</a>`,
              ``,
              `이 선택에 대해 더 논의하고 싶으시면 답장해주세요.`,
            ].join("\n"),
          });
        } else {
          await sendTelegramMessage(botToken, {
            chatId,
            text: `❌ 온체인 투표 실패: ${result.error}\n\n투표 의향은 기록되었습니다. 이 선택에 대해 더 논의하고 싶으시면 답장해주세요.`,
          });
        }
      } catch (err) {
        console.error("Agent vote error:", err);
        await sendTelegramMessage(botToken, {
          chatId,
          text: `❌ 투표 실행 중 오류가 발생했습니다.\n\n투표 의향은 기록되었습니다.`,
        });
      }
    }
  } else {
    await answerCallbackQuery(botToken, callbackQuery.id);
  }

  return NextResponse.json({ ok: true });
}

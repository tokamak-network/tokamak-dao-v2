import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";
import { DEFAULT_TRAITS } from "@/types/agent-profile";
import { sendNextQuestion } from "@/lib/agent-onboarding";

/**
 * POST /api/agents/telegram/onboarding
 * Start the onboarding flow for an agent.
 * Body: { agentId: number }
 */
export async function POST(req: NextRequest) {
  try {
    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { ok: false, error: "agentId is required" },
        { status: 400 }
      );
    }

    const numericId = Number(agentId);

    // 1. Verify agent exists and has Telegram connected
    const { data: agent, error: agentError } = await agentSupabase
      .from("agents")
      .select("telegram_bot_token, telegram_chat_id")
      .eq("agent_id", numericId)
      .single();

    if (agentError || !agent?.telegram_bot_token || !agent?.telegram_chat_id) {
      return NextResponse.json(
        { ok: false, error: "Telegram not connected. Complete bot setup first." },
        { status: 400 }
      );
    }

    // 2. Create or reset agent_profiles record
    const { error: upsertError } = await agentSupabase
      .from("agent_profiles")
      .upsert(
        {
          agent_id: numericId,
          traits: DEFAULT_TRAITS,
          onboarding_step: 1,
          onboarding_completed_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "agent_id" }
      );

    if (upsertError) {
      console.error("Failed to create agent profile:", upsertError);
      return NextResponse.json(
        { ok: false, error: "Failed to initialize profile" },
        { status: 500 }
      );
    }

    // 3. Send intro message + first question
    const { sendTelegramMessage } = await import("@/lib/telegram");

    await sendTelegramMessage(agent.telegram_bot_token, {
      chatId: agent.telegram_chat_id,
      text: "<b>거버넌스 프로파일링을 시작합니다!</b>\n\n7개의 시나리오 질문을 통해 당신의 거버넌스 성향을 파악하겠습니다. 편하게 답변해주세요.",
    });

    await sendNextQuestion(
      agent.telegram_bot_token,
      agent.telegram_chat_id,
      1
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Onboarding start error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to start onboarding" },
      { status: 500 }
    );
  }
}

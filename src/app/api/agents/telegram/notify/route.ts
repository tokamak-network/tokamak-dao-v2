import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";
import { analyzeProposalForAgent } from "@/lib/agent-analysis";
import type { AgentTraits } from "@/types/agent-profile";

export async function POST(req: NextRequest) {
  try {
    const { proposalId, title, proposer, origin, description } = await req.json();

    if (!proposalId || !title || !proposer) {
      return NextResponse.json(
        { ok: false, error: "proposalId, title, and proposer are required" },
        { status: 400 }
      );
    }

    // Fetch all agents that have both bot token and chat_id
    const { data: agents, error } = await agentSupabase
      .from("agents")
      .select("agent_id, telegram_bot_token, telegram_chat_id")
      .not("telegram_bot_token", "is", null)
      .not("telegram_chat_id", "is", null);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const shortProposer = `${proposer.slice(0, 6)}...${proposer.slice(-4)}`;
    const proposalUrl = origin ? `${origin}/proposals/${proposalId}` : null;

    const lines = [
      `📋 <b>New Proposal Created</b>`,
      ``,
      `<b>${escapeHtml(title)}</b>`,
      `Proposed by <code>${escapeHtml(shortProposer)}</code>`,
    ];
    if (proposalUrl) {
      lines.push(``, `<a href="${proposalUrl}">View Proposal →</a>`);
    }
    const notificationMessage = lines.join("\n");

    // Fetch profiles for agents with completed onboarding
    const agentIds = agents.map((a) => a.agent_id);
    const { data: profiles } = await agentSupabase
      .from("agent_profiles")
      .select("agent_id, traits, onboarding_step")
      .in("agent_id", agentIds)
      .gt("onboarding_step", 7);

    const profileMap = new Map<number, AgentTraits>();
    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.agent_id, p.traits as AgentTraits);
      }
    }

    // Send notification + analysis to all connected agents
    const results = await Promise.allSettled(
      agents.map(async (agent) => {
        // Send base notification
        const notifyResult = await sendTelegramMessage(agent.telegram_bot_token, {
          chatId: agent.telegram_chat_id,
          text: notificationMessage,
        });

        if (!notifyResult.ok) return notifyResult;

        // If agent has completed onboarding, send personalized analysis
        const traits = profileMap.get(agent.agent_id);
        if (traits) {
          try {
            const analysis = await analyzeProposalForAgent(traits, {
              proposalId,
              title,
              proposer,
              description,
            });

            const analysisMessage = [
              `📊 <b>안건 분석</b>`,
              ``,
              analysis,
              ``,
              `이 분석에 대해 답장하시면 더 자세히 논의할 수 있습니다.`,
            ].join("\n");

            await sendTelegramMessage(agent.telegram_bot_token, {
              chatId: agent.telegram_chat_id,
              text: analysisMessage,
            });

            // Save analysis conversation for future discussion
            await agentSupabase.from("agent_conversations").insert({
              agent_id: agent.agent_id,
              context_type: "proposal_analysis",
              context_id: proposalId,
              messages: [
                {
                  role: "assistant",
                  content: analysis,
                },
              ],
              trait_deltas: null,
            });
          } catch (err) {
            console.error(`Analysis failed for agent ${agent.agent_id}:`, err);
          }
        }

        return notifyResult;
      })
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok
    ).length;

    return NextResponse.json({ ok: true, sent, total: agents.length });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}

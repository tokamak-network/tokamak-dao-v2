import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";
import { callClaude } from "@/lib/agent-llm";
import { decodeProposalActions, formatActionsForLLM } from "@/lib/decode-calldata";
import type { AgentTraits } from "@/types/agent-profile";

const GOVERNANCE_CONTEXT = `Tokamak Network DAO Governance Parameters:
- Proposal Creation Cost: 100 TON (burned)
- Proposal Threshold: 0.25% of total vTON supply
- Voting Period: 7 days (~50,400 blocks)
- Voting Delay: 1 day (~7,200 blocks)
- Quorum: 4% of delegated vTON
- Pass Rate: >50% simple majority
- Timelock Delay: 7 days
- Grace Period: 14 days
- Max Burn Rate: 100%`;

async function analyzeProposal(
  title: string,
  description: string,
  decodedActions: string
): Promise<string> {
  return callClaude({
    system: `You are a DAO governance analyst for Tokamak Network. Analyze the proposal and provide a structured summary using the exact format below.

${GOVERNANCE_CONTEXT}

You MUST use this exact format with numbered section headers:

1. What it does
• (plain language explanation of the proposal, 1-3 bullet points)

2. On-chain actions
• (what contract calls will be executed, 1-3 bullet points)

3. Impact
• (what changes for the network/users, 1-3 bullet points)

4. Key considerations
• (risks, tradeoffs, things voters should think about, 1-3 bullet points)

Rules:
- Use exactly the numbered headers shown above (1-4)
- Use "•" for bullet points under each section
- Plain text only — no markdown, no HTML tags, no bold/italic
- Keep the total response under 1200 characters for Telegram readability
- Be concise and informative`,
    messages: [
      {
        role: "user",
        content: `Title: ${title}\n\nDescription:\n${description}\n\nOn-chain Actions:\n${decodedActions}`,
      },
    ],
    maxTokens: 1024,
  });
}

export async function POST(req: NextRequest) {
  try {
    const {
      proposalId,
      title,
      proposer,
      origin,
      description,
      targets,
      calldatas,
      values,
    } = await req.json();

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

    // Decode on-chain actions if available
    let decodedActionsText = "No on-chain action data provided.";
    if (targets?.length && calldatas?.length) {
      try {
        const decoded = decodeProposalActions(
          targets,
          calldatas,
          values || targets.map(() => "0")
        );
        decodedActionsText = formatActionsForLLM(decoded);
      } catch (err) {
        console.error("Calldata decode failed:", err);
      }
    }

    // Generate AI analysis with full context
    let analysis = "";
    if (description) {
      try {
        analysis = await analyzeProposal(title, description, decodedActionsText);
      } catch (err) {
        console.error("Analysis generation failed:", err);
      }
    }

    // Fetch or auto-create profiles for all agents
    const agentIds = agents.map((a) => a.agent_id);
    const { data: profiles } = await agentSupabase
      .from("agent_profiles")
      .select("agent_id, traits")
      .in("agent_id", agentIds);

    const profileMap = new Map<number, AgentTraits>();
    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.agent_id, p.traits as AgentTraits);
      }
    }

    const { DEFAULT_TRAITS } = await import("@/types/agent-profile");
    const missingIds = agentIds.filter((id) => !profileMap.has(id));
    if (missingIds.length > 0) {
      await agentSupabase.from("agent_profiles").insert(
        missingIds.map((id) => ({
          agent_id: id,
          traits: DEFAULT_TRAITS,
          updated_at: new Date().toISOString(),
        }))
      );
      for (const id of missingIds) {
        profileMap.set(id, { ...DEFAULT_TRAITS });
      }
    }

    // Build notification message
    const lines = [
      `📋 <b>New Proposal</b>`,
      ``,
      `<b>${escapeHtml(title)}</b>`,
      `Proposed by <code>${escapeHtml(shortProposer)}</code>`,
    ];
    if (analysis) {
      lines.push(``, `───────────────────`, ``, escapeHtml(analysis));
    }
    if (proposalUrl) {
      lines.push(``, `👉 <a href="${proposalUrl}">View Proposal</a>`);
    }
    const notificationMessage = lines.join("\n");

    // Vote inline keyboard buttons
    const { createHash } = await import("crypto");
    const proposalShortId = createHash("sha256").update(String(proposalId)).digest("hex").slice(0, 16);

    const voteButtons = {
      inline_keyboard: [
        [
          { text: "👍 For", callback_data: `v:${proposalShortId}:f` },
          { text: "👎 Against", callback_data: `v:${proposalShortId}:a` },
          { text: "🤚 Abstain", callback_data: `v:${proposalShortId}:x` },
        ],
      ],
    };

    // Send notification to all connected agents
    const results = await Promise.allSettled(
      agents.map(async (agent) => {
        const notifyResult = await sendTelegramMessage(agent.telegram_bot_token, {
          chatId: agent.telegram_chat_id,
          text: notificationMessage,
          replyMarkup: voteButtons,
        });

        if (!notifyResult.ok) return notifyResult;

        // Save conversation for future discussion
        await agentSupabase.from("agent_conversations").insert({
          agent_id: agent.agent_id,
          context_type: "proposal_analysis",
          context_id: proposalShortId,
          messages: [
            {
              role: "assistant",
              content: analysis,
              proposal_id: String(proposalId),
            },
          ],
          trait_deltas: null,
        });

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

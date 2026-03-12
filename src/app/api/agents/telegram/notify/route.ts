import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";

export async function POST(req: NextRequest) {
  try {
    const { proposalId, title, proposer, origin } = await req.json();

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
      `📋 *New Proposal Created*`,
      ``,
      `*${title}*`,
      `Proposed by \`${shortProposer}\``,
    ];
    if (proposalUrl) {
      lines.push(``, `[View Proposal →](${proposalUrl})`);
    }
    const message = lines.join("\n");

    // Send notification to all connected agents
    const results = await Promise.allSettled(
      agents.map(async (agent) => {
        const res = await fetch(
          `https://api.telegram.org/bot${agent.telegram_bot_token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: agent.telegram_chat_id,
              text: message,
              parse_mode: "Markdown",
              disable_web_page_preview: true,
            }),
          }
        );
        return res.json();
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

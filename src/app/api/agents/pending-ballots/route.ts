import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";

/**
 * GET /api/agents/pending-ballots?agentId={id}
 * Returns pending ballots for a given agent.
 */
export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
  }

  const { data, error } = await agentSupabase
    .from("pending_ballots")
    .select("*")
    .eq("agent_id", parseInt(agentId))
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ballots: data });
}

/**
 * PATCH /api/agents/pending-ballots
 * Mark a ballot as submitted: { ballotId, txHash }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { ballotId, txHash } = await req.json();

    if (!ballotId || !txHash) {
      return NextResponse.json({ error: "Missing ballotId or txHash" }, { status: 400 });
    }

    const { error } = await agentSupabase
      .from("pending_ballots")
      .update({
        status: "submitted",
        tx_hash: txHash,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", ballotId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

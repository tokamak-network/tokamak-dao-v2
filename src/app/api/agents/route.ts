import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";

export async function POST(req: NextRequest) {
  try {
    const { agentId, owner, chainId } = await req.json();

    if (!agentId || !owner) {
      return NextResponse.json(
        { error: "agentId and owner are required" },
        { status: 400 }
      );
    }

    const { error } = await agentSupabase.from("agents").upsert(
      {
        agent_id: Number(agentId),
        chain_id: chainId ?? 11155111,
        owner: owner.toLowerCase(),
      },
      { onConflict: "agent_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";

/**
 * GET /api/agents/telegram/profile?agentId=123
 * Fetch agent profile (traits + onboarding status).
 */
export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json(
      { ok: false, error: "agentId is required" },
      { status: 400 }
    );
  }

  const { data, error } = await agentSupabase
    .from("agent_profiles")
    .select("*")
    .eq("agent_id", Number(agentId))
    .single();

  if (error || !data) {
    return NextResponse.json({
      ok: true,
      profile: null,
    });
  }

  return NextResponse.json({
    ok: true,
    profile: data,
  });
}

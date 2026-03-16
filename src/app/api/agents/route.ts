import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";
import { generateAgentWallet } from "@/lib/agent-wallet";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const { data, error } = await agentSupabase
    .from("agents")
    .select("agent_id, owner, telegram_bot_token, agent_wallet_address")
    .eq("agent_id", Number(agentId))
    .single();

  if (error || !data) {
    return NextResponse.json({ telegramConnected: false });
  }

  return NextResponse.json({
    telegramConnected: !!data.telegram_bot_token,
    agentWalletAddress: data.agent_wallet_address || null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, owner, chainId } = await req.json();

    if (!agentId || !owner) {
      return NextResponse.json(
        { error: "agentId and owner are required" },
        { status: 400 }
      );
    }

    // Check if agent already has a wallet
    const { data: existing } = await agentSupabase
      .from("agents")
      .select("agent_wallet_address")
      .eq("agent_id", Number(agentId))
      .single();

    // Generate agent wallet if not exists
    let walletFields: { agent_wallet_address?: string; encrypted_private_key?: string } = {};
    if (!existing?.agent_wallet_address) {
      try {
        const wallet = generateAgentWallet();
        walletFields = {
          agent_wallet_address: wallet.address,
          encrypted_private_key: wallet.encryptedPrivateKey,
        };
      } catch {
        // If AGENT_ENCRYPTION_KEY is not set, skip wallet generation
        console.warn("Agent wallet generation skipped: AGENT_ENCRYPTION_KEY not set");
      }
    }

    const { error } = await agentSupabase.from("agents").upsert(
      {
        agent_id: Number(agentId),
        chain_id: chainId ?? 11155111,
        owner: owner.toLowerCase(),
        ...walletFields,
      },
      { onConflict: "agent_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      agentWalletAddress: walletFields.agent_wallet_address || existing?.agent_wallet_address || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { agentId, owner, telegramBotToken } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    const { error } = await agentSupabase
      .from("agents")
      .upsert(
        {
          agent_id: Number(agentId),
          chain_id: 11155111,
          owner: owner?.toLowerCase() ?? "",
          telegram_bot_token: telegramBotToken || null,
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

import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";
import { generateAgentWallet, getAgentWalletClient, getSepoliaPublicClient, decryptPrivateKey } from "@/lib/agent-wallet";
import { CONTRACT_ADDRESSES, DELEGATE_REGISTRY_ABI } from "@/constants/contracts";

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

        // Auto-register agent as delegate on-chain
        // 1. Relayer sends small ETH to agent for gas
        // 2. Agent calls registerDelegate()
        try {
          const { getRelayerWalletClient } = await import("@/lib/agent-wallet");
          const relayerClient = getRelayerWalletClient();
          const publicClient = getSepoliaPublicClient();

          // Send 0.0005 ETH to agent for registerDelegate gas
          const fundTx = await relayerClient.sendTransaction({
            to: wallet.address as `0x${string}`,
            value: 500_000_000_000_000n, // 0.0005 ETH
          });
          await publicClient.waitForTransactionReceipt({ hash: fundTx, timeout: 60_000 });

          // Agent registers itself as delegate
          const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey);
          const agentClient = getAgentWalletClient(privateKey);
          const addresses = CONTRACT_ADDRESSES[11155111];

          const regTx = await agentClient.writeContract({
            address: addresses.delegateRegistry as `0x${string}`,
            abi: DELEGATE_REGISTRY_ABI,
            functionName: "registerDelegate",
            args: ["DAO Agent", "Automated voting agent", "governance"],
          });
          await publicClient.waitForTransactionReceipt({ hash: regTx, timeout: 60_000 });

          console.log("Agent registered as delegate:", wallet.address);
        } catch (regErr) {
          console.warn("Agent delegate registration failed:", regErr);
        }
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

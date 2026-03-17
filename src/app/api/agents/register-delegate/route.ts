import { NextRequest, NextResponse } from "next/server";
import { agentSupabase } from "@/lib/agent-supabase";
import { getAgentWalletClient, getSepoliaPublicClient, decryptPrivateKey } from "@/lib/agent-wallet";
import { CONTRACT_ADDRESSES, DELEGATE_REGISTRY_ABI } from "@/constants/contracts";

/**
 * POST /api/agents/register-delegate
 * Register the agent wallet as a delegate on-chain.
 * Expects the agent wallet to already have ETH for gas (funded by owner).
 */
export async function POST(req: NextRequest) {
  try {
    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const { data, error } = await agentSupabase
      .from("agents")
      .select("agent_wallet_address, encrypted_private_key")
      .eq("agent_id", Number(agentId))
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!data.encrypted_private_key || !data.agent_wallet_address) {
      return NextResponse.json({ error: "Agent has no wallet" }, { status: 400 });
    }

    const publicClient = getSepoliaPublicClient();
    const addresses = CONTRACT_ADDRESSES[11155111];

    // Check if already registered
    const isRegistered = await publicClient.readContract({
      address: addresses.delegateRegistry as `0x${string}`,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "isRegisteredDelegate",
      args: [data.agent_wallet_address as `0x${string}`],
    });

    if (isRegistered) {
      return NextResponse.json({ success: true, alreadyRegistered: true });
    }

    // Verify agent wallet has enough ETH for gas
    const balance = await publicClient.getBalance({
      address: data.agent_wallet_address as `0x${string}`,
    });

    if (balance < 50_000_000_000_000n) {
      return NextResponse.json({
        error: "Agent wallet has insufficient ETH for gas",
      }, { status: 400 });
    }

    // Decrypt key and register
    let privateKey: `0x${string}`;
    try {
      privateKey = decryptPrivateKey(data.encrypted_private_key);
    } catch (e) {
      console.error("Failed to decrypt private key:", e);
      return NextResponse.json({
        error: "Failed to decrypt agent wallet key. Check AGENT_ENCRYPTION_KEY.",
      }, { status: 500 });
    }

    const agentClient = getAgentWalletClient(privateKey);

    const regTx = await agentClient.writeContract({
      address: addresses.delegateRegistry as `0x${string}`,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "registerDelegate",
      args: ["DAO Agent", "Automated voting agent", "governance"],
    });
    await publicClient.waitForTransactionReceipt({ hash: regTx, timeout: 60_000 });

    return NextResponse.json({ success: true, alreadyRegistered: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("register-delegate error:", message);
    return NextResponse.json(
      { error: `Registration failed: ${message.slice(0, 200)}` },
      { status: 500 }
    );
  }
}

/**
 * Agent On-Chain Voting
 *
 * Executes castVote transactions on behalf of agents using their encrypted wallets.
 */

import { formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { agentSupabase } from "@/lib/agent-supabase";
import { decryptPrivateKey, getAgentWalletClient, getSepoliaPublicClient } from "@/lib/agent-wallet";
import {
  CONTRACT_ADDRESSES,
  DELEGATE_REGISTRY_ABI,
  DAO_GOVERNOR_ABI,
} from "@/constants/contracts";

const SEPOLIA_CHAIN_ID = 11155111;
const addresses = CONTRACT_ADDRESSES[SEPOLIA_CHAIN_ID];

/** Map vote code from Telegram callback to on-chain support value */
export function voteCodeToSupport(code: string): number {
  switch (code) {
    case "f": return 1; // For
    case "a": return 0; // Against
    case "x": return 2; // Abstain
    default: throw new Error(`Unknown vote code: ${code}`);
  }
}

export interface CastVoteResult {
  success: boolean;
  txHash?: string;
  error?: string;
  votingPower?: string;
}

/**
 * Execute an on-chain castVote transaction for an agent.
 */
export async function castAgentVote(
  agentId: number,
  proposalId: bigint,
  support: number
): Promise<CastVoteResult> {
  // 1. Get agent's encrypted private key
  const { data: agent, error } = await agentSupabase
    .from("agents")
    .select("encrypted_private_key, agent_wallet_address")
    .eq("agent_id", agentId)
    .single();

  if (error || !agent?.encrypted_private_key) {
    return { success: false, error: "Agent wallet not found" };
  }

  // 2. Decrypt and create account
  let privateKey: `0x${string}`;
  try {
    privateKey = decryptPrivateKey(agent.encrypted_private_key);
  } catch {
    return { success: false, error: "Failed to decrypt agent wallet" };
  }

  const account = privateKeyToAccount(privateKey);
  const publicClient = getSepoliaPublicClient();

  // 3. Check if already voted
  try {
    const hasVoted = await publicClient.readContract({
      address: addresses.daoGovernor as `0x${string}`,
      abi: DAO_GOVERNOR_ABI,
      functionName: "hasVoted",
      args: [proposalId, account.address],
    });

    if (hasVoted) {
      return { success: false, error: "이미 이 안건에 투표했습니다." };
    }
  } catch {
    // If hasVoted check fails, continue anyway
  }

  // 4. Check proposal state (1 = Active)
  try {
    const state = await publicClient.readContract({
      address: addresses.daoGovernor as `0x${string}`,
      abi: DAO_GOVERNOR_ABI,
      functionName: "state",
      args: [proposalId],
    });

    if (Number(state) !== 1) {
      const stateNames = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
      return {
        success: false,
        error: `투표 가능한 상태가 아닙니다. 현재 상태: ${stateNames[Number(state)] || "Unknown"}`,
      };
    }
  } catch {
    return { success: false, error: "안건 상태를 확인할 수 없습니다." };
  }

  // 5. Check voting power (delegated amount)
  let votingPower: bigint;
  try {
    votingPower = (await publicClient.readContract({
      address: addresses.delegateRegistry as `0x${string}`,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "getTotalDelegated",
      args: [account.address],
    })) as bigint;

    if (votingPower === 0n) {
      return {
        success: false,
        error: "위임받은 투표권이 없습니다. 먼저 이 Agent에게 vTON을 위임해주세요.",
      };
    }
  } catch {
    return { success: false, error: "투표권을 확인할 수 없습니다." };
  }

  // 6. Send castVote transaction
  try {
    const walletClient = getAgentWalletClient(privateKey);

    const txHash = await walletClient.writeContract({
      address: addresses.daoGovernor as `0x${string}`,
      abi: DAO_GOVERNOR_ABI,
      functionName: "castVote",
      args: [proposalId, support],
    });

    // 7. Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000,
    });

    if (receipt.status === "reverted") {
      return { success: false, error: "트랜잭션이 실패했습니다." };
    }

    return {
      success: true,
      txHash,
      votingPower: formatEther(votingPower),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("insufficient funds")) {
      return {
        success: false,
        error: "Agent 지갑에 가스비(ETH)가 부족합니다. Sepolia ETH를 보내주세요.",
      };
    }

    return { success: false, error: `투표 트랜잭션 실패: ${message.slice(0, 100)}` };
  }
}

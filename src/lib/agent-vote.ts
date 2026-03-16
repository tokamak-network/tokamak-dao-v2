/**
 * Agent On-Chain Voting via EIP-712 Signature Relay
 *
 * Two flows:
 * - Flow A: VoteRelayFund has balance → relayer calls relayVote() → auto gas reimbursement
 * - Flow B: No balance → sign ballot, save as pending → delegate submits from frontend
 */

import { formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { agentSupabase } from "@/lib/agent-supabase";
import { decryptPrivateKey, getSepoliaPublicClient, getRelayerWalletClient } from "@/lib/agent-wallet";
import {
  CONTRACT_ADDRESSES,
  DELEGATE_REGISTRY_ABI,
  DAO_GOVERNOR_ABI,
  VOTE_RELAY_FUND_ABI,
} from "@/constants/contracts";

const SEPOLIA_CHAIN_ID = 11155111;
const addresses = CONTRACT_ADDRESSES[SEPOLIA_CHAIN_ID];

/** EIP-712 domain for DAOGovernor */
const EIP712_DOMAIN = {
  name: "DAOGovernor",
  version: "1",
  chainId: SEPOLIA_CHAIN_ID,
  verifyingContract: addresses.daoGovernor as `0x${string}`,
} as const;

/** EIP-712 Ballot types */
const BALLOT_TYPES = {
  Ballot: [
    { name: "proposalId", type: "uint256" },
    { name: "support", type: "uint8" },
  ],
} as const;

/** Estimated gas for castVoteBySig + overhead */
const ESTIMATED_VOTE_GAS = 200_000n;

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
  pending?: boolean;
}

/**
 * Execute an on-chain castVoteBySig transaction for an agent.
 * Flow A: VoteRelayFund has sufficient balance → relayVote() via VoteRelayFund
 * Flow B: No balance → save pending ballot for delegate to submit
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

  // 6. Agent signs EIP-712 Ballot
  let v: number;
  let r: `0x${string}`;
  let s: `0x${string}`;
  try {
    const signature = await account.signTypedData({
      domain: EIP712_DOMAIN,
      types: BALLOT_TYPES,
      primaryType: "Ballot",
      message: {
        proposalId,
        support,
      },
    });

    // Split signature into v, r, s
    r = `0x${signature.slice(2, 66)}` as `0x${string}`;
    s = `0x${signature.slice(66, 130)}` as `0x${string}`;
    v = parseInt(signature.slice(130, 132), 16);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `서명 실패: ${message.slice(0, 100)}` };
  }

  // 7. Check VoteRelayFund balance (Flow A vs Flow B)
  const voteRelayFundAddress = addresses.voteRelayFund;
  let hasGasFund = false;

  if (voteRelayFundAddress) {
    try {
      const balance = (await publicClient.readContract({
        address: voteRelayFundAddress,
        abi: VOTE_RELAY_FUND_ABI,
        functionName: "balances",
        args: [account.address],
      })) as bigint;

      // Estimate gas cost
      const gasPrice = await publicClient.getGasPrice();
      const estimatedCost = ESTIMATED_VOTE_GAS * gasPrice;

      hasGasFund = balance >= estimatedCost;
    } catch {
      // VoteRelayFund not available, fall through to Flow B
    }
  }

  // 8. Flow A: Relay via VoteRelayFund
  if (hasGasFund && voteRelayFundAddress) {
    try {
      const relayerClient = getRelayerWalletClient();

      const txHash = await relayerClient.writeContract({
        address: voteRelayFundAddress,
        abi: VOTE_RELAY_FUND_ABI,
        functionName: "relayVote",
        args: [
          addresses.daoGovernor as `0x${string}`,
          proposalId,
          support,
          v,
          r,
          s,
          account.address,
        ],
      });

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
      // If relay fails, fall through to Flow B
      console.error("VoteRelayFund relay failed, falling back to pending:", message);
    }
  }

  // 9. Flow B: Save pending ballot for delegate to submit
  try {
    await agentSupabase.from("pending_ballots").insert({
      agent_id: agentId,
      agent_address: account.address,
      proposal_id: proposalId.toString(),
      support,
      v,
      r: r as string,
      s: s as string,
      status: "pending",
    });

    return {
      success: true,
      pending: true,
      votingPower: formatEther(votingPower),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `투표 저장 실패: ${message.slice(0, 100)}` };
  }
}

/**
 * Agent On-Chain Voting via EIP-712 Signature
 *
 * EOA signs EIP-712 Ballot → EOA submits castVoteBySig directly.
 * Gas is paid from the EOA's own ETH balance (funded by the owner).
 */

import { formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { agentSupabase } from "@/lib/agent-supabase";
import { decryptPrivateKey, getSepoliaPublicClient, getAgentWalletClient } from "@/lib/agent-wallet";
import {
  CONTRACT_ADDRESSES,
  DELEGATE_REGISTRY_ABI,
  DAO_GOVERNOR_ABI,
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

/** Map vote code from Telegram callback to on-chain VoteType enum value.
 *  Contract: For=0, Against=1, Abstain=2 */
export function voteCodeToSupport(code: string): number {
  switch (code) {
    case "f": return 0; // For
    case "a": return 1; // Against
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
 * Execute an on-chain castVoteBySig transaction for an agent.
 * EOA signs EIP-712 Ballot and submits directly. Gas paid from EOA ETH balance.
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
      return { success: false, error: "Already voted on this proposal." };
    }
  } catch {
    // If hasVoted check fails, continue anyway
  }

  // 4. Check proposal state and get snapshot block
  let snapshotBlock: bigint;
  try {
    const proposal = await publicClient.readContract({
      address: addresses.daoGovernor as `0x${string}`,
      abi: DAO_GOVERNOR_ABI,
      functionName: "getProposal",
      args: [proposalId],
    }) as { snapshotBlock: bigint; voteStart: bigint; voteEnd: bigint };

    snapshotBlock = proposal.snapshotBlock;

    const proposalState = await publicClient.readContract({
      address: addresses.daoGovernor as `0x${string}`,
      abi: DAO_GOVERNOR_ABI,
      functionName: "state",
      args: [proposalId],
    });

    if (Number(proposalState) !== 1) {
      const stateNames = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"];
      return {
        success: false,
        error: `Proposal is not in a votable state. Current state: ${stateNames[Number(proposalState)] || "Unknown"}`,
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Proposal state check failed:", { proposalId: proposalId.toString(), error: msg });
    return { success: false, error: `Could not check proposal state. (proposalId: ${proposalId.toString().slice(0, 20)}...)` };
  }

  // 5. Check voting power at proposal snapshot block
  let votingPower: bigint;
  try {
    votingPower = (await publicClient.readContract({
      address: addresses.delegateRegistry as `0x${string}`,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "getVotingPower",
      args: [account.address, snapshotBlock, snapshotBlock],
    })) as bigint;

    if (votingPower === 0n) {
      return {
        success: false,
        error: "No voting power at proposal snapshot. Delegation must exist 7+ days before proposal creation.",
      };
    }
  } catch {
    return { success: false, error: "Could not check voting power." };
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
    return { success: false, error: `Signing failed: ${message.slice(0, 100)}` };
  }

  // 7. Submit castVoteBySig directly from EOA wallet
  try {
    const walletClient = getAgentWalletClient(privateKey);

    const txHash = await walletClient.writeContract({
      address: addresses.daoGovernor as `0x${string}`,
      abi: DAO_GOVERNOR_ABI,
      functionName: "castVoteBySig",
      args: [proposalId, support, v, r, s],
      chain: walletClient.chain,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000,
    });

    if (receipt.status === "reverted") {
      return { success: false, error: "Transaction reverted." };
    }

    return {
      success: true,
      txHash,
      votingPower: formatEther(votingPower),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("castVoteBySig failed:", message);
    return { success: false, error: `Vote transaction failed: ${message.slice(0, 100)}` };
  }
}

/**
 * Agent On-Chain Voting via EIP-712 Signature + ERC-4337 Account Abstraction
 *
 * Single flow: EOA signs EIP-712 Ballot → Smart Account submits castVoteBySig
 * via self-funded gas (owner deposits ETH to Smart Account address).
 */

import { formatEther, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { agentSupabase } from "@/lib/agent-supabase";
import { decryptPrivateKey, getSepoliaPublicClient, createSmartAccountClientForAgent } from "@/lib/agent-wallet";
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
 * Execute an on-chain castVoteBySig transaction for an agent.
 * Uses ERC-4337 Smart Account with Pimlico Paymaster for gasless execution.
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
        error: `Proposal is not in a votable state. Current state: ${stateNames[Number(state)] || "Unknown"}`,
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Proposal state check failed:", { proposalId: proposalId.toString(), error: msg });
    return { success: false, error: `Could not check proposal state. (proposalId: ${proposalId.toString().slice(0, 20)}...)` };
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
        error: "No delegated voting power. Please delegate vTON to this Agent first.",
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

  // 7. Submit via ERC-4337 Smart Account with self-funded gas
  try {
    const smartAccountClient = await createSmartAccountClientForAgent(privateKey);

    const txHash = await smartAccountClient.sendTransaction({
      to: addresses.daoGovernor as `0x${string}`,
      data: encodeFunctionData({
        abi: DAO_GOVERNOR_ABI,
        functionName: "castVoteBySig",
        args: [proposalId, support, v, r, s],
      }),
      value: 0n,
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
    console.error("AA castVoteBySig failed:", message);
    return { success: false, error: `Vote transaction failed: ${message.slice(0, 100)}` };
  }
}

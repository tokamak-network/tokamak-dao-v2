/**
 * Contract Addresses and ABIs for vTON DAO
 *
 * Deployed on Sepolia Testnet (2025-01-26)
 * Mainnet addresses are placeholder (zero address).
 */

import type { ContractAddresses } from "@/types/governance";

// Placeholder zero address
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// Contract addresses by chain ID
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Localhost (Foundry/Anvil)
  31337: {
    vton: ZERO_ADDRESS,
    delegateRegistry: ZERO_ADDRESS,
    daoGovernor: ZERO_ADDRESS,
    securityCouncil: ZERO_ADDRESS,
    timelock: ZERO_ADDRESS,
  },
  // Sepolia Testnet
  11155111: {
    vton: "0xDa2953E9B2a63fe1B8dB34C67f8371C64f16914d",
    delegateRegistry: "0x934A14DA1c9b9094a6f9Ba964a847936eEa8a5f2",
    daoGovernor: "0xaC09Dea1309252781ae4C2c8e9aA57BF08F950da",
    securityCouncil: "0xa98e65E6cc6B0104A8253792DD3340223D5cfc5D",
    timelock: "0xd996a24d80845f910C54465B27F655f750C419D9",
  },
  // Ethereum Mainnet
  1: {
    vton: ZERO_ADDRESS,
    delegateRegistry: ZERO_ADDRESS,
    daoGovernor: ZERO_ADDRESS,
    securityCouncil: ZERO_ADDRESS,
    timelock: ZERO_ADDRESS,
  },
};

// Get contract addresses for a specific chain
export function getContractAddresses(chainId: number): ContractAddresses {
  return CONTRACT_ADDRESSES[chainId] ?? CONTRACT_ADDRESSES[31337];
}

// Check if contracts are deployed (not zero address)
export function areContractsDeployed(chainId: number): boolean {
  const addresses = getContractAddresses(chainId);
  return addresses.vton !== ZERO_ADDRESS;
}

// ABIs

export const VTON_ABI = [
  // Read functions
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "emissionRatio",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getVotes",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getPastVotes",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "blockNumber", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Write functions
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  // Events
  {
    name: "Minted",
    type: "event",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "EmissionRatioUpdated",
    type: "event",
    inputs: [
      { name: "oldRatio", type: "uint256", indexed: false },
      { name: "newRatio", type: "uint256", indexed: false },
    ],
  },
] as const;

export const DELEGATE_REGISTRY_ABI = [
  // Read functions
  {
    name: "getAllDelegators",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "getTotalDelegated",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "delegatee", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getDelegation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "delegator", type: "address" }],
    outputs: [
      { name: "delegatee", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    name: "delegationCap",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "delegationPeriodRequirement",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getDelegatorInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "delegator", type: "address" }],
    outputs: [
      { name: "profile", type: "string" },
      { name: "philosophy", type: "string" },
      { name: "interests", type: "string[]" },
      { name: "isRegistered", type: "bool" },
    ],
  },
  {
    name: "isRegisteredDelegator",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "delegator", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getVotingPower",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "delegator", type: "address" },
      { name: "blockNumber", type: "uint256" },
      { name: "snapshotBlock", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Write functions
  {
    name: "delegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "delegatee", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "undelegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "delegatee", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "redelegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fromDelegator", type: "address" },
      { name: "toDelegator", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "registerDelegator",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "profile", type: "string" },
      { name: "philosophy", type: "string" },
      { name: "interests", type: "string[]" },
    ],
    outputs: [],
  },
  // Events
  {
    name: "DelegatorRegistered",
    type: "event",
    inputs: [
      { name: "delegator", type: "address", indexed: true },
      { name: "profile", type: "string", indexed: false },
      { name: "philosophy", type: "string", indexed: false },
      { name: "interests", type: "string[]", indexed: false },
    ],
  },
  {
    name: "Delegated",
    type: "event",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "delegator", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "expiresAt", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Undelegated",
    type: "event",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "delegator", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const DAO_GOVERNOR_ABI = [
  // Read functions
  {
    name: "proposalCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getProposal",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "proposer", type: "address" },
      { name: "forVotes", type: "uint256" },
      { name: "againstVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
    ],
  },
  {
    name: "state",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "quorum",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "votingPeriod",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "votingDelay",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "proposalThreshold",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "proposalCreationCost",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "hasVoted",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "proposalEta",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "proposalSnapshot",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Write functions
  {
    name: "propose",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "castVote",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "castVoteWithReason",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "reason", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "queue",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "execute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancel",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
  },
  // Events
  {
    name: "ProposalCreated",
    type: "event",
    inputs: [
      { name: "id", type: "uint256", indexed: false },
      { name: "proposer", type: "address", indexed: false },
      { name: "targets", type: "address[]", indexed: false },
      { name: "values", type: "uint256[]", indexed: false },
      { name: "calldatas", type: "bytes[]", indexed: false },
      { name: "description", type: "string", indexed: false },
      { name: "snapshot", type: "uint256", indexed: false },
      { name: "voteStart", type: "uint256", indexed: false },
      { name: "voteEnd", type: "uint256", indexed: false },
    ],
  },
  {
    name: "VoteCast",
    type: "event",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "support", type: "uint8", indexed: false },
      { name: "weight", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    name: "ProposalQueued",
    type: "event",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "eta", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ProposalExecuted",
    type: "event",
    inputs: [{ name: "proposalId", type: "uint256", indexed: false }],
  },
  {
    name: "ProposalCanceled",
    type: "event",
    inputs: [{ name: "proposalId", type: "uint256", indexed: false }],
  },
] as const;

export const SECURITY_COUNCIL_ABI = [
  // Read functions
  {
    name: "getMembers",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "threshold",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getPendingActionsCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getPendingActions",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "isMember",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getAction",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "actionId", type: "uint256" }],
    outputs: [
      { name: "actionType", type: "uint8" },
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
      { name: "reason", type: "string" },
      { name: "proposer", type: "address" },
      { name: "approvalCount", type: "uint256" },
      { name: "executed", type: "bool" },
    ],
  },
  {
    name: "hasApproved",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "actionId", type: "uint256" },
      { name: "member", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  // Write functions
  {
    name: "proposeEmergencyAction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "actionType", type: "uint8" },
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
      { name: "reason", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approveEmergencyAction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "actionId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "executeEmergencyAction",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "actionId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancelProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "pauseProtocol",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "reason", type: "string" }],
    outputs: [],
  },
  // Events
  {
    name: "EmergencyActionProposed",
    type: "event",
    inputs: [
      { name: "actionId", type: "uint256", indexed: false },
      { name: "actionType", type: "uint8", indexed: false },
      { name: "target", type: "address", indexed: false },
      { name: "data", type: "bytes", indexed: false },
      { name: "reason", type: "string", indexed: false },
      { name: "proposer", type: "address", indexed: false },
    ],
  },
  {
    name: "EmergencyActionApproved",
    type: "event",
    inputs: [
      { name: "actionId", type: "uint256", indexed: false },
      { name: "approver", type: "address", indexed: false },
    ],
  },
  {
    name: "EmergencyActionExecuted",
    type: "event",
    inputs: [
      { name: "actionId", type: "uint256", indexed: false },
      { name: "executor", type: "address", indexed: false },
    ],
  },
] as const;

export const TIMELOCK_ABI = [
  // Read functions
  {
    name: "delay",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "MINIMUM_DELAY",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "MAXIMUM_DELAY",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "GRACE_PERIOD",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isQueued",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "txHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "isReady",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "txHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getTransactionEta",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "txHash", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Events
  {
    name: "TransactionQueued",
    type: "event",
    inputs: [
      { name: "txHash", type: "bytes32", indexed: true },
      { name: "target", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
      { name: "data", type: "bytes", indexed: false },
      { name: "eta", type: "uint256", indexed: false },
    ],
  },
  {
    name: "TransactionExecuted",
    type: "event",
    inputs: [
      { name: "txHash", type: "bytes32", indexed: true },
      { name: "target", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
      { name: "data", type: "bytes", indexed: false },
    ],
  },
  {
    name: "TransactionCanceled",
    type: "event",
    inputs: [{ name: "txHash", type: "bytes32", indexed: true }],
  },
] as const;

/**
 * Contract Addresses and ABIs for vTON DAO
 *
 * Deployed on Sepolia Testnet (2025-01-30)
 * Mainnet addresses are placeholder (zero address).
 */

import type { ContractAddresses } from "@/types/governance";
import { SANDBOX_CHAIN_ID } from "@/config/wagmi";

// Placeholder zero address
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// Deployment blocks by chain ID (for event log queries)
export const DEPLOYMENT_BLOCKS: Record<number, bigint> = {
  1337: BigInt(0), // Localhost
  11155111: BigInt(10462653), // Sepolia
  1: BigInt(0), // Mainnet (placeholder)
};

// Get deployment block for a specific chain
export function getDeploymentBlock(chainId: number): bigint {
  return DEPLOYMENT_BLOCKS[chainId] ?? BigInt(0);
}

// Contract addresses by chain ID
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Localhost (Foundry/Anvil)
  1337: {
    ton: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    vton: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    delegateRegistry: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    daoGovernor: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
    securityCouncil: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
    timelock: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    faucet: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
    tonFaucet: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
  },
  // Sepolia Testnet (votingDelay=0, votingPeriod=7200, maturity=0)
  11155111: {
    ton: "0x71d6157C54fE37606c273d2982fEef270fd29C3f",
    vton: "0x74e2F32EE93424d63FafbB26647768D5F6FAbAAa",
    delegateRegistry: "0x9548A46da14F5c1d76a64AD44aA66Cddd42DDDe0",
    daoGovernor: "0xDcc50188B7c18CE1C757E911478cacfbF90c964e",
    securityCouncil: "0xE56085015ab5c0b43914Fa8736dc23b467A88195",
    timelock: "0x24f495C4815403C6ed812436C4cBD9a526379BE9",
    faucet: "0xDe614D89D0B3D2F91f8DDdcb57b4D2cD416CC654",
    tonFaucet: "0xc2e8b53b357531572948606DC446582A4150cE1C",
    voteRelayFund: "0x75D9056e12C455C9705fE38457D2df6CbbbCe19b",
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

// Sandbox address override
let sandboxAddressOverride: ContractAddresses | null = null;

export function setSandboxAddresses(addresses: ContractAddresses | null): void {
  sandboxAddressOverride = addresses;
}

export function getSandboxAddresses(): ContractAddresses | null {
  return sandboxAddressOverride;
}

// Get contract addresses for a specific chain
export function getContractAddresses(chainId: number): ContractAddresses {
  // Sandbox override takes priority for sandbox chain
  if (chainId === SANDBOX_CHAIN_ID && sandboxAddressOverride) {
    return sandboxAddressOverride;
  }
  return CONTRACT_ADDRESSES[chainId] ?? CONTRACT_ADDRESSES[1337];
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
  {
    name: "getCurrentEpoch",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getHalvingRatio",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "MAX_SUPPLY",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "EPOCH_SIZE",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "DECAY_RATE",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
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
  {
    name: "EpochTransitioned",
    type: "event",
    inputs: [
      { name: "oldEpoch", type: "uint256", indexed: false },
      { name: "newEpoch", type: "uint256", indexed: false },
      { name: "newHalvingRatio", type: "uint256", indexed: false },
    ],
  },
] as const;

export const DELEGATE_REGISTRY_ABI = [
  // Read functions
  {
    name: "getAllDelegates",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "getTotalDelegated",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "delegate", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getDelegation",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "delegate", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "delegate", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "delegatedAt", type: "uint256" },
          { name: "expiresAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "delegationPeriodRequirement",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getDelegateInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "delegate", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "profile", type: "string" },
          { name: "votingPhilosophy", type: "string" },
          { name: "interests", type: "string" },
          { name: "registeredAt", type: "uint256" },
          { name: "isActive", type: "bool" },
        ],
      },
    ],
  },
  {
    name: "isRegisteredDelegate",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getVotingPower",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "delegate", type: "address" },
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
      { name: "delegate", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "undelegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "delegate", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "redelegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fromDelegate", type: "address" },
      { name: "toDelegate", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "registerDelegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "profile", type: "string" },
      { name: "votingPhilosophy", type: "string" },
      { name: "interests", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "registerDelegateFor",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "delegateAddr", type: "address" },
      { name: "profile", type: "string" },
      { name: "votingPhilosophy", type: "string" },
      { name: "interests", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "delegateWithPermit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "delegateAddr", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "registerDelegateForAndDelegateWithPermit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "delegateAddr", type: "address" },
      { name: "profile", type: "string" },
      { name: "votingPhilosophy", type: "string" },
      { name: "interests", type: "string" },
      { name: "amount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
  // Events
  {
    name: "DelegateRegistered",
    type: "event",
    inputs: [
      { name: "delegate", type: "address", indexed: true },
      { name: "profile", type: "string", indexed: false },
      { name: "votingPhilosophy", type: "string", indexed: false },
      { name: "interests", type: "string", indexed: false },
    ],
  },
  {
    name: "Delegated",
    type: "event",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "delegate", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "expiresAt", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Undelegated",
    type: "event",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "delegate", type: "address", indexed: true },
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
    name: "getAllProposalIds",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getProposal",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "proposer", type: "address" },
          { name: "targets", type: "address[]" },
          { name: "values", type: "uint256[]" },
          { name: "calldatas", type: "bytes[]" },
          { name: "description", type: "string" },
          { name: "snapshotBlock", type: "uint256" },
          { name: "voteStart", type: "uint256" },
          { name: "voteEnd", type: "uint256" },
          { name: "forVotes", type: "uint256" },
          { name: "againstVotes", type: "uint256" },
          { name: "abstainVotes", type: "uint256" },
          { name: "canceled", type: "bool" },
          { name: "executed", type: "bool" },
          { name: "burnRate", type: "uint16" },
        ],
      },
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
    name: "proposalCreationCost",
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
      { name: "burnRate", type: "uint16" },
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
    name: "castVoteBySig",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
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
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "proposer", type: "address", indexed: true },
      { name: "targets", type: "address[]", indexed: false },
      { name: "values", type: "uint256[]", indexed: false },
      { name: "calldatas", type: "bytes[]", indexed: false },
      { name: "description", type: "string", indexed: false },
      { name: "snapshotBlock", type: "uint256", indexed: false },
      { name: "voteStart", type: "uint256", indexed: false },
      { name: "voteEnd", type: "uint256", indexed: false },
      { name: "burnRate", type: "uint16", indexed: false },
    ],
  },
  {
    name: "VoteBurn",
    type: "event",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "burnAmount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "VoteCast",
    type: "event",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "support", type: "uint8", indexed: false },
      { name: "weight", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    name: "ProposalQueued",
    type: "event",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "eta", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ProposalExecuted",
    type: "event",
    inputs: [{ name: "proposalId", type: "uint256", indexed: true }],
  },
  {
    name: "ProposalCanceled",
    type: "event",
    inputs: [{ name: "proposalId", type: "uint256", indexed: true }],
  },
] as const;

export const SECURITY_COUNCIL_ABI = [
  // Read functions
  {
    name: "getMembers",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "account", type: "address" },
          { name: "isFoundation", type: "bool" },
          { name: "addedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "threshold",
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
    name: "getEmergencyAction",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "actionId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "actionType", type: "uint8" },
          { name: "target", type: "address" },
          { name: "data", type: "bytes" },
          { name: "reason", type: "string" },
          { name: "createdAt", type: "uint256" },
          { name: "executedAt", type: "uint256" },
          { name: "executed", type: "bool" },
          { name: "approvers", type: "address[]" },
        ],
      },
    ],
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

export const VTON_FAUCET_ABI = [
  // Read functions
  {
    name: "vton",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "claimAmount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "cooldownPeriod",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "lastClaimTime",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "paused",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "canClaim",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "canClaimNow", type: "bool" },
      { name: "timeUntilNextClaim", type: "uint256" },
    ],
  },
  // Write functions
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // Events
  {
    name: "Claimed",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ClaimAmountUpdated",
    type: "event",
    inputs: [
      { name: "oldAmount", type: "uint256", indexed: false },
      { name: "newAmount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "CooldownPeriodUpdated",
    type: "event",
    inputs: [
      { name: "oldPeriod", type: "uint256", indexed: false },
      { name: "newPeriod", type: "uint256", indexed: false },
    ],
  },
  {
    name: "PauseStatusUpdated",
    type: "event",
    inputs: [{ name: "paused", type: "bool", indexed: false }],
  },
] as const;

export const TON_FAUCET_ABI = [
  // Read functions
  {
    name: "ton",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "claimAmount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "paused",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "canClaim",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "canClaimNow", type: "bool" }],
  },
  // Write functions
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // Events
  {
    name: "Claimed",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ClaimAmountUpdated",
    type: "event",
    inputs: [
      { name: "oldAmount", type: "uint256", indexed: false },
      { name: "newAmount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "PauseStatusUpdated",
    type: "event",
    inputs: [{ name: "paused", type: "bool", indexed: false }],
  },
] as const;

export const VOTE_RELAY_FUND_ABI = [
  // Read functions
  {
    name: "balances",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "delegateOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  // Write functions
  {
    name: "deposit",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "relayVote",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "governor", type: "address" },
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
      { name: "agent", type: "address" },
    ],
    outputs: [],
  },
  // Events
  {
    name: "Deposited",
    type: "event",
    inputs: [
      { name: "agent", type: "address", indexed: true },
      { name: "delegate", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "Withdrawn",
    type: "event",
    inputs: [
      { name: "agent", type: "address", indexed: true },
      { name: "delegate", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "VoteRelayed",
    type: "event",
    inputs: [
      { name: "agent", type: "address", indexed: true },
      { name: "relayer", type: "address", indexed: true },
      { name: "governor", type: "address", indexed: false },
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "gasCost", type: "uint256", indexed: false },
    ],
  },
] as const;

export const MOCK_TON_ABI = [
  // Read functions
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
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
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
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
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

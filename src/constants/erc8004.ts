// ERC-8004 IdentityRegistry ABI + Addresses
// Ported from tokamak-agent-scan

export const identityRegistryAbi = [
  // === Read Functions ===
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // === Write Functions ===
  {
    type: "function",
    name: "register",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setAgentURI",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newURI", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // === Events ===
  {
    type: "event",
    name: "Registered",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const;

// Testnet addresses (Sepolia)
export const IDENTITY_REGISTRY_TESTNET =
  "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;

// Mainnet addresses (Titan, Ethereum)
export const IDENTITY_REGISTRY_ADDRESS =
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

export const SEPOLIA_CHAIN_ID = 11155111;

const TESTNET_CHAIN_IDS = new Set([SEPOLIA_CHAIN_ID]);

export function getRegistryAddress(chainId: number) {
  if (TESTNET_CHAIN_IDS.has(chainId)) {
    return IDENTITY_REGISTRY_TESTNET;
  }
  return IDENTITY_REGISTRY_ADDRESS;
}

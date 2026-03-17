export interface AgentService {
  name: string;
  endpoint: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

export interface AgentSocials {
  website?: string;
  twitter?: string;
  github?: string;
  discord?: string;
  email?: string;
}

export interface AgentMetadata {
  type?: string;
  name: string;
  description: string;
  image?: string;
  services?: AgentService[];
  skills?: string[];
  domains?: string[];
  x402Support?: boolean;
  active?: boolean;
  registrations?: { agentId: string; agentRegistry: string }[];
  supportedTrust?: string[];
  socials?: AgentSocials;
  tags?: string[];
}

export interface Agent {
  agentId: bigint;
  owner: string;
  agentURI: string;
  metadata: AgentMetadata | null;
  chainId: number;
}

export interface PersonalAgent {
  id: number;
  owner: string;
  chainId: number;
  agentWalletAddress: string | null;
  telegramConnected: boolean;
  createdAt: string;
}

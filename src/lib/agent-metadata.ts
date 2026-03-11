import type { AgentMetadata, AgentSocials } from "@/types/agent";

export function buildDataURI(metadata: AgentMetadata): string {
  const json = JSON.stringify(metadata);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return `data:application/json;base64,${base64}`;
}

export function estimateCalldataGas(dataUri: string): number {
  const bytes = new TextEncoder().encode(dataUri);
  let gas = 0;
  for (const b of bytes) {
    gas += b === 0 ? 4 : 16;
  }
  return gas + 21_000;
}

export function buildAgentMetadata(params: {
  name: string;
  description: string;
  image?: string;
  services?: {
    name: string;
    endpoint: string;
    version?: string;
    skills?: string[];
    domains?: string[];
  }[];
  skills?: string[];
  domains?: string[];
  active?: boolean;
  supportedTrust?: string[];
  tags?: string[];
  x402Support?: boolean;
  socials?: AgentSocials;
}): AgentMetadata {
  const meta: AgentMetadata = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: params.name,
    description: params.description,
  };

  if (params.image) meta.image = params.image;
  if (params.services?.length) meta.services = params.services;
  if (params.skills?.length) meta.skills = params.skills;
  if (params.domains?.length) meta.domains = params.domains;
  if (params.active) meta.active = true;
  if (params.supportedTrust?.length)
    meta.supportedTrust = params.supportedTrust;
  if (params.tags?.length) meta.tags = params.tags;
  if (params.x402Support) meta.x402Support = true;

  if (params.socials) {
    const filled = Object.fromEntries(
      Object.entries(params.socials).filter(([, v]) => v)
    );
    if (Object.keys(filled).length > 0) meta.socials = filled;
  }

  return meta;
}

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useReadContracts } from "wagmi";
import { agentSupabase } from "@/lib/agent-supabase";
import { identityRegistryAbi, getRegistryAddress, SEPOLIA_CHAIN_ID } from "@/constants/erc8004";
import type { AgentMetadata } from "@/types/agent";

const CHAIN_ID = SEPOLIA_CHAIN_ID;
const registryAddress = getRegistryAddress(CHAIN_ID);

/**
 * Parse agentURI (data URI or plain JSON) into AgentMetadata synchronously.
 * Returns null for IPFS URIs (use resolveAgentURI for those).
 */
function parseAgentURI(uri: string): AgentMetadata | null {
  try {
    if (uri.startsWith("data:application/json;base64,")) {
      const base64 = uri.slice("data:application/json;base64,".length);
      const json = decodeURIComponent(escape(atob(base64)));
      return JSON.parse(json);
    }
    if (uri.startsWith("{")) {
      return JSON.parse(uri);
    }
    return null;
  } catch {
    return null;
  }
}

function resolveIpfsUrl(uri: string): string {
  if (uri.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  return uri;
}

/**
 * Resolve agentURI to AgentMetadata, fetching from IPFS gateway if needed.
 */
async function resolveAgentURI(uri: string): Promise<AgentMetadata | null> {
  // Try synchronous parsing first (data URI / plain JSON)
  const sync = parseAgentURI(uri);
  if (sync) return sync;

  // Fetch from IPFS gateway
  if (uri.startsWith("ipfs://")) {
    try {
      const res = await fetch(resolveIpfsUrl(uri));
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  return null;
}

export interface AgentListItem {
  agentId: bigint;
  owner: string;
  agentURI: string;
  metadata: AgentMetadata | null;
}

interface SupabaseRow {
  agent_id: number;
  chain_id: number;
  owner: string;
}

/**
 * Fetch agents: Supabase for the index, on-chain for metadata.
 */
export function useAgents() {
  const [rows, setRows] = useState<SupabaseRow[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);

  // 1. Fetch agent IDs from Supabase
  useEffect(() => {
    setIsLoadingRows(true);
    agentSupabase
      .from("agents")
      .select("agent_id, chain_id, owner")
      .eq("chain_id", CHAIN_ID)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to fetch agents from Supabase:", error);
          setRows([]);
        } else {
          setRows(data ?? []);
        }
        setIsLoadingRows(false);
      });
  }, [fetchKey]);

  // 2. Batch-read tokenURI for each agent from the contract
  const contracts = useMemo(() => {
    return rows.map((row) => ({
      address: registryAddress,
      abi: identityRegistryAbi,
      functionName: "tokenURI" as const,
      args: [BigInt(row.agent_id)] as const,
      chainId: CHAIN_ID,
    }));
  }, [rows]);

  const { data: uriResults, isLoading: isLoadingURIs } = useReadContracts({
    contracts,
    query: { enabled: rows.length > 0 },
  });

  // 3. Resolve metadata (sync for data URIs, async for IPFS)
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [isResolvingMeta, setIsResolvingMeta] = useState(false);

  useEffect(() => {
    if (rows.length === 0 || !uriResults) {
      setAgents([]);
      return;
    }

    let cancelled = false;

    const uris = rows.map((_, i) => {
      const r = uriResults[i];
      return r?.status === "success" ? (r.result as string) : "";
    });

    // Check if any URI needs async resolution (IPFS)
    const needsAsync = uris.some((u) => u.startsWith("ipfs://"));

    if (!needsAsync) {
      // All can be resolved synchronously
      setAgents(
        rows.map((row, i) => ({
          agentId: BigInt(row.agent_id),
          owner: row.owner,
          agentURI: uris[i],
          metadata: uris[i] ? parseAgentURI(uris[i]) : null,
        }))
      );
      return;
    }

    // Resolve IPFS URIs asynchronously
    setIsResolvingMeta(true);
    Promise.all(uris.map((u) => (u ? resolveAgentURI(u) : Promise.resolve(null))))
      .then((metadataList) => {
        if (cancelled) return;
        setAgents(
          rows.map((row, i) => ({
            agentId: BigInt(row.agent_id),
            owner: row.owner,
            agentURI: uris[i],
            metadata: metadataList[i],
          }))
        );
      })
      .finally(() => {
        if (!cancelled) setIsResolvingMeta(false);
      });

    return () => { cancelled = true; };
  }, [rows, uriResults]);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  return {
    agents,
    totalCount: rows.length,
    isLoading: isLoadingRows || (rows.length > 0 && isLoadingURIs) || isResolvingMeta,
    refetch,
  };
}

/**
 * Check if an address already owns an agent (ERC-721 balanceOf > 0).
 * Also fetches the agent ID from Supabase for navigation.
 * Used to enforce the 1-delegate-1-agent constraint.
 */
export function useHasAgent(address?: `0x${string}`) {
  const [agentId, setAgentId] = useState<number | null>(null);

  const result = useReadContract({
    address: registryAddress,
    abi: identityRegistryAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: {
      enabled: !!address,
    },
  });

  const hasAgent = typeof result.data === "bigint" ? result.data > 0n : false;

  // Fetch agent ID from Supabase when we know the address has an agent
  useEffect(() => {
    if (!address || !hasAgent) {
      setAgentId(null);
      return;
    }
    agentSupabase
      .from("agents")
      .select("agent_id")
      .eq("chain_id", CHAIN_ID)
      .eq("owner", address.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setAgentId(data?.[0]?.agent_id ?? null);
      });
  }, [address, hasAgent]);

  return {
    hasAgent,
    agentId,
    isLoading: result.isLoading,
    refetch: result.refetch,
  };
}

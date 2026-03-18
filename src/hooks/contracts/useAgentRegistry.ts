"use client";

import { useEffect, useState, useCallback } from "react";
import { agentSupabase } from "@/lib/agent-supabase";
import { SEPOLIA_CHAIN_ID } from "@/constants/erc8004";

const CHAIN_ID = SEPOLIA_CHAIN_ID;

export interface AgentListItem {
  agentId: number;
  owner: string;
  agentWalletAddress: string | null;
  smartAccountAddress: string | null;
  telegramConnected: boolean;
  createdAt: string;
}

interface SupabaseRow {
  agent_id: number;
  chain_id: number;
  owner: string;
  agent_wallet_address: string | null;
  smart_account_address: string | null;
  telegram_bot_token: string | null;
  created_at: string;
}

/**
 * Fetch agents from Supabase (no ERC-8004 dependency).
 */
export function useAgents() {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    agentSupabase
      .from("agents")
      .select("agent_id, chain_id, owner, agent_wallet_address, smart_account_address, telegram_bot_token, created_at")
      .eq("chain_id", CHAIN_ID)
      .not("telegram_chat_id", "is", null)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to fetch agents from Supabase:", error);
          setAgents([]);
        } else {
          setAgents(
            (data as SupabaseRow[] ?? []).map((row) => ({
              agentId: row.agent_id,
              owner: row.owner,
              agentWalletAddress: row.agent_wallet_address,
              smartAccountAddress: row.smart_account_address,
              telegramConnected: !!row.telegram_bot_token,
              createdAt: row.created_at,
            }))
          );
        }
        setIsLoading(false);
      });
  }, [fetchKey]);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  return {
    agents,
    totalCount: agents.length,
    isLoading,
    refetch,
  };
}

/**
 * Check if an address already owns an agent via Supabase DB.
 */
export function useHasAgent(address?: `0x${string}`) {
  const [agentId, setAgentId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    if (!address) {
      setAgentId(null);
      return;
    }
    setIsLoading(true);
    agentSupabase
      .from("agents")
      .select("agent_id")
      .eq("chain_id", CHAIN_ID)
      .eq("owner", address.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setAgentId(data?.[0]?.agent_id ?? null);
        setIsLoading(false);
      });
  }, [address, fetchKey]);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  return {
    hasAgent: agentId !== null,
    agentId,
    isLoading,
    refetch,
  };
}

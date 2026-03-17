"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAgents, type AgentListItem } from "@/hooks/contracts/useAgentRegistry";
import { SEPOLIA_CHAIN_ID } from "@/constants/erc8004";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

function getChainName(chainId?: number): string {
  switch (chainId) {
    case SEPOLIA_CHAIN_ID:
      return "Sepolia";
    case 1:
      return "Ethereum";
    default:
      return "Unknown";
  }
}

function AgentRow({ agent }: { agent: AgentListItem }) {
  return (
    <tr className="border-b border-[var(--border-default)] last:border-b-0 hover:bg-[var(--bg-secondary)] transition-colors">
      {/* AGENT */}
      <td className="py-4 px-5">
        <Link
          href={`/agents/${agent.agentId}`}
          className="flex items-center gap-3 min-w-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.dicebear.com/9.x/bottts/svg?seed=${agent.owner.toLowerCase()}`}
            alt=""
            className="h-10 w-10 rounded-[var(--radius-lg)] object-cover bg-[var(--surface-secondary)] shrink-0"
          />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate block">
              Agent #{agent.agentId}
            </span>
            <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
              {agent.agentWalletAddress ? truncateAddress(agent.agentWalletAddress) : "No wallet"}
            </p>
          </div>
        </Link>
      </td>

      {/* CHAIN */}
      <td className="py-4 px-5">
        <Badge variant="primary" size="sm" className="gap-1">
          <span className="inline-block size-1.5 rounded-full bg-current opacity-70" />
          {getChainName(SEPOLIA_CHAIN_ID)}
        </Badge>
      </td>

      {/* OWNER */}
      <td className="py-4 px-5">
        <span className="text-sm font-mono text-[var(--text-secondary)]">
          {truncateAddress(agent.owner)}
        </span>
      </td>

      {/* TELEGRAM */}
      <td className="py-4 px-5 text-center">
        {agent.telegramConnected ? (
          <Badge variant="success" size="sm">Connected</Badge>
        ) : (
          <Badge variant="default" size="sm">Not Set</Badge>
        )}
      </td>

      {/* CREATED */}
      <td className="py-4 px-5 text-right">
        <span className="text-sm text-[var(--text-tertiary)]">
          {new Date(agent.createdAt).toLocaleDateString()}
        </span>
      </td>
    </tr>
  );
}

export function AgentList() {
  const { agents, isLoading, totalCount } = useAgents();
  const [searchQuery, setSearchQuery] = React.useState("");
  const filteredAgents = React.useMemo(() => {
    if (!searchQuery) return agents;
    const query = searchQuery.toLowerCase();
    return agents.filter((agent) => {
      const owner = agent.owner.toLowerCase();
      const wallet = agent.agentWalletAddress?.toLowerCase() ?? "";
      return owner.includes(query) || wallet.includes(query);
    });
  }, [agents, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="sm:max-w-xs">
          <div className="h-10 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] animate-pulse" />
        </div>
        <Card padding="none">
          <div className="space-y-0" role="status" aria-busy="true" aria-label="Loading agents">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[72px] border-b border-[var(--border-default)] last:border-b-0 animate-pulse bg-[var(--bg-tertiary)]"
              />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search by address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-80"
          aria-label="Search agents"
          leftIcon={
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
        />
        <span className="text-sm text-[var(--text-tertiary)] shrink-0 ml-4">
          {filteredAgents.length === totalCount
            ? `${totalCount} agent${totalCount !== 1 ? "s" : ""}`
            : `${filteredAgents.length} / ${totalCount}`}
        </span>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                <th className="py-3 px-5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[35%]">
                  Agent
                </th>
                <th className="py-3 px-5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[12%]">
                  Chain
                </th>
                <th className="py-3 px-5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[18%]">
                  Owner
                </th>
                <th className="py-3 px-5 text-center text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[15%]">
                  Telegram
                </th>
                <th className="py-3 px-5 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[20%]">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-[var(--text-tertiary)]">
                    {agents.length === 0
                      ? "No agents registered yet"
                      : "No agents found matching your search"}
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => (
                  <AgentRow key={agent.agentId} agent={agent} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AddressAvatar } from "@/components/ui/avatar";
import { useAgents, type AgentListItem } from "@/hooks/contracts/useAgentRegistry";
import { SEPOLIA_CHAIN_ID } from "@/constants/erc8004";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

function resolveImage(url: string) {
  if (url.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${url.slice(7)}`;
  return url;
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
  const meta = agent.metadata;
  const name = meta?.name || `Agent #${agent.agentId.toString()}`;
  const description = meta?.description;
  const isActive = meta?.active;

  return (
    <tr className="border-b border-[var(--border-default)] last:border-b-0 hover:bg-[var(--bg-secondary)] transition-colors">
      {/* AGENT */}
      <td className="py-4 px-5">
        <Link
          href={`/agents/${agent.agentId.toString()}`}
          className="flex items-center gap-3 min-w-0"
        >
          {meta?.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={resolveImage(meta.image)}
              alt=""
              className="h-10 w-10 rounded-[var(--radius-lg)] object-cover bg-[var(--surface-secondary)] shrink-0"
            />
          ) : (
            <AddressAvatar address={agent.owner} size="md" />
          )}
          <div className="min-w-0">
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate block">
              {name}
            </span>
            {description ? (
              <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                {description}
              </p>
            ) : (
              <p className="text-xs text-[var(--text-tertiary)] italic mt-0.5">
                No description
              </p>
            )}
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

      {/* REPUTATION */}
      <td className="py-4 px-5">
        <div className="flex items-center gap-1">
          <span className="text-amber-400">&#9733;</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">0</span>
          <span className="text-xs text-[var(--text-tertiary)]">/100</span>
        </div>
      </td>

      {/* FEEDBACK */}
      <td className="py-4 px-5 text-center">
        <span className="text-sm text-[var(--text-primary)]">0</span>
      </td>

      {/* STATUS */}
      <td className="py-4 px-5 text-right">
        {isActive ? (
          <Badge variant="success" size="sm">Active</Badge>
        ) : (
          <Badge variant="default" size="sm">Inactive</Badge>
        )}
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
      const name = agent.metadata?.name?.toLowerCase() ?? "";
      const description = agent.metadata?.description?.toLowerCase() ?? "";
      const owner = agent.owner.toLowerCase();
      const skills = agent.metadata?.skills ?? [];
      const domains = agent.metadata?.domains ?? [];
      return (
        name.includes(query) ||
        description.includes(query) ||
        owner.includes(query) ||
        skills.some((s) => s.toLowerCase().includes(query)) ||
        domains.some((d) => d.toLowerCase().includes(query))
      );
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

  if (agents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search by name, address, skill..."
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

      {filteredAgents.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          <p className="text-sm">No agents found matching your search</p>
        </div>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                  <th className="py-3 px-5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[40%]">
                    Agent
                  </th>
                  <th className="py-3 px-5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[10%]">
                    Chain
                  </th>
                  <th className="py-3 px-5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[14%]">
                    Owner
                  </th>
                  <th className="py-3 px-5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[14%]">
                    Reputation
                  </th>
                  <th className="py-3 px-5 text-center text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[11%]">
                    Feedback
                  </th>
                  <th className="py-3 px-5 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-[11%]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <AgentRow key={agent.agentId.toString()} agent={agent} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

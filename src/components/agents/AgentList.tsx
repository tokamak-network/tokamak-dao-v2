"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AddressAvatar } from "@/components/ui/avatar";
import { useAgents, type AgentListItem } from "@/hooks/contracts/useAgentRegistry";
import { useDelegateInfo } from "@/hooks/contracts/useDelegateRegistry";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function AgentCard({ agent }: { agent: AgentListItem }) {
  const meta = agent.metadata;
  const name = meta?.name || `Agent #${agent.agentId.toString()}`;
  const description = meta?.description;
  const skills = meta?.skills ?? [];
  const domains = meta?.domains ?? [];
  const isActive = meta?.active;
  const ownerAddress = agent.owner as `0x${string}`;
  const { data: delegateInfo } = useDelegateInfo(ownerAddress);
  const delegateName = delegateInfo?.profile || null;

  return (
    <Link href={`/agents/${agent.agentId.toString()}`}>
      <Card padding="none" interactive className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          {meta?.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={meta.image}
              alt=""
              className="h-10 w-10 rounded-[var(--radius-lg)] object-cover bg-[var(--surface-secondary)] shrink-0"
            />
          ) : (
            <AddressAvatar address={agent.owner} size="md" />
          )}

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-medium text-[var(--text-primary)] truncate">
                {name}
              </span>
              {isActive && (
                <Badge variant="success" size="sm">Active</Badge>
              )}
            </div>

            {description ? (
              <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mt-1">
                {description}
              </p>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)] italic mt-1">
                No description
              </p>
            )}

            {/* Tags */}
            {(skills.length > 0 || domains.length > 0) && (
              <div className="flex flex-wrap gap-1 mt-2">
                {skills.slice(0, 3).map((s) => (
                  <span key={s} className="rounded-full bg-[var(--color-primary-500)]/10 px-2 py-0.5 text-[10px] text-[var(--text-brand)]">
                    {s}
                  </span>
                ))}
                {domains.slice(0, 2).map((d) => (
                  <span key={d} className="rounded-full bg-[var(--fg-brand-primary)]/10 px-2 py-0.5 text-[10px] text-[var(--fg-brand-primary)]">
                    {d}
                  </span>
                ))}
                {skills.length + domains.length > 5 && (
                  <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] text-[var(--text-tertiary)]">
                    +{skills.length + domains.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right side info */}
          <div className="text-right shrink-0">
            <p className="text-xs font-mono text-[var(--text-tertiary)]">
              #{agent.agentId.toString()}
            </p>
            <div className="mt-1 flex items-center justify-end gap-1">
              {delegateName && (
                <Badge variant="default" size="sm">Delegate</Badge>
              )}
              <span
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = `/delegates/${agent.owner}`;
                }}
                title={`View delegate: ${agent.owner}`}
              >
                {delegateName || truncateAddress(agent.owner)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="none" className="p-5">
              <div className="flex items-start gap-4 animate-pulse">
                <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-[var(--bg-tertiary)]" />
                  <div className="h-3 w-2/3 rounded bg-[var(--bg-tertiary)]" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return null; // Let the parent show the empty state
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xl"
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
        <div className="space-y-3">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.agentId.toString()} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}

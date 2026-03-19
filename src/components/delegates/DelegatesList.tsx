"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSubgraphVoters } from "@/hooks/subgraph/useSubgraphVoters";
import { DelegateDetailCard } from "./DelegateDetailCard";

/**
 * Voters List — shows vTON holders with their delegation status from subgraph.
 */
export function DelegatesList() {
  const [searchQuery, setSearchQuery] = React.useState("");

  const { voters, isLoading } = useSubgraphVoters();

  // Filter voters by search query
  const filteredVoters = React.useMemo(() => {
    if (!searchQuery) return voters;
    const query = searchQuery.toLowerCase();
    return voters.filter((v) => v.address.toLowerCase().includes(query));
  }, [voters, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <Input
        placeholder="Search by address..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="sm:max-w-xs"
        aria-label="Search voters by address"
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

      {isLoading ? (
        <Card padding="none">
          <div className="space-y-0" role="status" aria-busy="true" aria-label="Loading voters">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 border-b border-[var(--border-default)] last:border-b-0 animate-pulse bg-[var(--bg-tertiary)]"
              />
            ))}
          </div>
        </Card>
      ) : filteredVoters.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          <p className="text-sm">
            {searchQuery
              ? "No voters found matching your search"
              : "No vTON holders found"}
          </p>
        </div>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                  <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Voting Power
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    Delegated To
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredVoters.map((voter) => (
                  <DelegateDetailCard
                    key={voter.address}
                    address={voter.address}
                    votingPower={voter.balance}
                    isActive={voter.balance > BigInt(0)}
                    delegatedTo={voter.delegatedTo ?? null}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

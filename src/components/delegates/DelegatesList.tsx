"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAllDelegates, useTotalDelegated, useDelegateInfo } from "@/hooks/contracts/useDelegateRegistry";
import { useVTONBalance } from "@/hooks/contracts/useVTON";
import { useReadContracts, useChainId } from "wagmi";
import { getContractAddresses, areContractsDeployed, DELEGATE_REGISTRY_ABI } from "@/constants/contracts";
import { useAgents } from "@/hooks/contracts/useAgentRegistry";
import { DelegateDetailCard } from "./DelegateDetailCard";
import { DelegationModal } from "./DelegationModal";


// Mock data for when contracts are not deployed
const MOCK_DELEGATES: `0x${string}`[] = [
  "0x1234567890123456789012345678901234567890",
  "0x2345678901234567890123456789012345678901",
  "0x3456789012345678901234567890123456789012",
  "0x4567890123456789012345678901234567890123",
  "0x5678901234567890123456789012345678901234",
];

const MOCK_VOTING_POWER: Record<string, bigint> = {
  "0x1234567890123456789012345678901234567890": BigInt("5000000000000000000000000"), // 5M
  "0x2345678901234567890123456789012345678901": BigInt("3500000000000000000000000"), // 3.5M
  "0x3456789012345678901234567890123456789012": BigInt("2000000000000000000000000"), // 2M
  "0x4567890123456789012345678901234567890123": BigInt("1500000000000000000000000"), // 1.5M
  "0x5678901234567890123456789012345678901234": BigInt("1000000000000000000000000"), // 1M
};

/**
 * Component to fetch and display data for a single delegate table row
 */
function DelegateItem({
  address,
  isCurrentDelegate,
  delegateDisabled,
  delegatedTo,
  onDelegate,
}: {
  address: `0x${string}`;
  isCurrentDelegate: boolean;
  delegateDisabled?: boolean;
  delegatedTo?: { address: `0x${string}`; agentName?: string } | null;
  onDelegate: (address: `0x${string}`) => void;
}) {
  const { data: votingPower, isDeployed } = useTotalDelegated(address);
  const { data: delegateInfo } = useDelegateInfo(address);

  // Use mock data if contracts not deployed
  const displayPower = isDeployed
    ? (votingPower ?? BigInt(0))
    : (MOCK_VOTING_POWER[address] ?? BigInt(0));

  return (
    <DelegateDetailCard
      address={address}
      votingPower={displayPower}
      isActive={delegateInfo?.isActive}
      isCurrentDelegate={isCurrentDelegate}
      delegateDisabled={delegateDisabled}
      delegatedTo={delegatedTo}
      onDelegate={() => onDelegate(address)}
    />
  );
}

/**
 * Delegates List — Agora-style table layout
 */
export function DelegatesList() {
  const { address: userAddress } = useAccount();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDelegate, setSelectedDelegate] = React.useState<`0x${string}` | null>(null);
  const queryClient = useQueryClient();
  const chainId = useChainId();
  const contractAddresses = getContractAddresses(chainId);

  const { data: delegates, isLoading, isDeployed, refetch: refetchDelegates } = useAllDelegates();
  const { data: vtonBalance } = useVTONBalance(userAddress);
  const hasNoVTON = !vtonBalance || vtonBalance === BigInt(0);

  // Fetch agents to identify agent wallet addresses
  const { agents } = useAgents();
  const agentWalletMap = React.useMemo(() => {
    const map = new Map<string, string>();
    agents.forEach((agent) => {
      if (agent.agentWalletAddress) {
        map.set(agent.agentWalletAddress.toLowerCase(), `Agent #${agent.agentId}`);
      }
    });
    return map;
  }, [agents]);

  // Build batch getDelegation calls: for each voter, check delegation to each other delegate
  const delegationContracts = React.useMemo(() => {
    if (!isDeployed || !delegates || delegates.length === 0) return [];
    const calls: Array<{
      address: `0x${string}`;
      abi: typeof DELEGATE_REGISTRY_ABI;
      functionName: "getDelegation";
      args: readonly [`0x${string}`, `0x${string}`];
    }> = [];
    for (const voter of delegates) {
      for (const delegate of delegates) {
        if (voter.toLowerCase() !== delegate.toLowerCase()) {
          calls.push({
            address: contractAddresses.delegateRegistry as `0x${string}`,
            abi: DELEGATE_REGISTRY_ABI,
            functionName: "getDelegation" as const,
            args: [voter, delegate] as const,
          });
        }
      }
    }
    return calls;
  }, [isDeployed, delegates, contractAddresses.delegateRegistry]);

  const { data: delegationResults } = useReadContracts({
    contracts: delegationContracts,
    query: {
      enabled: delegationContracts.length > 0,
    },
  });

  // Build a map: voter address → delegated-to info
  const delegationMap = React.useMemo(() => {
    const map = new Map<string, { address: `0x${string}`; agentName?: string }>();
    if (!delegates || !delegationResults) return map;

    let idx = 0;
    for (const voter of delegates) {
      for (const delegate of delegates) {
        if (voter.toLowerCase() !== delegate.toLowerCase()) {
          const result = delegationResults[idx];
          if (result?.status === "success" && result.result) {
            const delegation = result.result as {
              delegate: `0x${string}`;
              amount: bigint;
              delegatedAt: bigint;
              expiresAt: bigint;
            };
            if (delegation.amount > BigInt(0)) {
              map.set(voter.toLowerCase(), {
                address: delegate,
                agentName: agentWalletMap.get(delegate.toLowerCase()),
              });
            }
          }
          idx++;
        }
      }
    }
    return map;
  }, [delegates, delegationResults, agentWalletMap]);

  // Filter delegates by search query
  const filteredDelegates = React.useMemo(() => {
    // Use mock data if contracts not deployed
    const displayDelegates = isDeployed ? (delegates ?? []) : MOCK_DELEGATES;
    if (!searchQuery) return displayDelegates;
    const query = searchQuery.toLowerCase();
    return displayDelegates.filter((addr) =>
      addr.toLowerCase().includes(query)
    );
  }, [isDeployed, delegates, searchQuery]);

  const handleDelegate = (address: `0x${string}`) => {
    setSelectedDelegate(address);
  };

  const handleDelegationSuccess = React.useCallback(() => {
    refetchDelegates();
    // Invalidate all getTotalDelegated queries to refresh voting power
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
  }, [refetchDelegates, queryClient]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <Input
        placeholder="Search by address..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="sm:max-w-xs"
        aria-label="Search delegates by address"
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

      {!isDeployed && (
        <div className="text-center py-2 text-[var(--text-tertiary)]">
          <p className="text-xs">
            Showing mock data (contracts not deployed)
          </p>
        </div>
      )}

      {isLoading ? (
        <Card padding="none">
          <div className="space-y-0" role="status" aria-busy="true" aria-label="Loading delegates">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 border-b border-[var(--border-default)] last:border-b-0 animate-pulse bg-[var(--bg-tertiary)]"
              />
            ))}
          </div>
        </Card>
      ) : filteredDelegates.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          <p className="text-sm">
            {searchQuery
              ? "No delegates found matching your search"
              : "No delegates registered yet"}
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
                  <th className="py-3 px-4 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDelegates.map((address) => (
                  <DelegateItem
                    key={address}
                    address={address}
                    isCurrentDelegate={false}
                    delegateDisabled={hasNoVTON}
                    delegatedTo={delegationMap.get(address.toLowerCase()) ?? null}
                    onDelegate={handleDelegate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedDelegate && (
        <DelegationModal
          open={!!selectedDelegate}
          onClose={() => setSelectedDelegate(null)}
          delegatee={selectedDelegate}
          mode="delegate"
          onSuccess={handleDelegationSuccess}
        />
      )}
    </div>
  );
}

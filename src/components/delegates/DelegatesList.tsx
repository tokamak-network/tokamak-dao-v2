"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAllDelegators, useTotalDelegated, useDelegation } from "@/hooks/contracts/useDelegateRegistry";
import { DelegateDetailCard } from "./DelegateDetailCard";
import { DelegationModal } from "./DelegationModal";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Mock data for when contracts are not deployed
const MOCK_DELEGATORS: `0x${string}`[] = [
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
 * Component to fetch and display voting power for a single delegator
 */
function DelegatorItem({
  address,
  rank,
  isCurrentDelegate,
  onDelegate,
}: {
  address: `0x${string}`;
  rank: number;
  isCurrentDelegate: boolean;
  onDelegate: (address: `0x${string}`) => void;
}) {
  const { data: votingPower, isDeployed } = useTotalDelegated(address);

  // Use mock data if contracts not deployed
  const displayPower = isDeployed
    ? (votingPower ?? BigInt(0))
    : (MOCK_VOTING_POWER[address] ?? BigInt(0));

  return (
    <DelegateDetailCard
      address={address}
      votingPower={displayPower}
      rank={rank}
      isCurrentDelegate={isCurrentDelegate}
      onDelegate={() => onDelegate(address)}
    />
  );
}

/**
 * Delegates List Section
 * Shows all registered delegators with their voting power
 */
export function DelegatesList() {
  const { address: userAddress } = useAccount();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDelegatee, setSelectedDelegatee] = React.useState<`0x${string}` | null>(null);

  const { data: delegators, isLoading, isDeployed } = useAllDelegators();
  const { data: userDelegation } = useDelegation(userAddress);

  // Get current delegatee
  const currentDelegatee =
    userDelegation && typeof userDelegation === "object" && "delegatee" in userDelegation
      ? (userDelegation.delegatee as `0x${string}` | undefined)
      : undefined;

  const hasDelegatee = !!(currentDelegatee && currentDelegatee !== ZERO_ADDRESS);

  // Filter delegators by search query
  const filteredDelegators = React.useMemo(() => {
    // Use mock data if contracts not deployed
    const displayDelegators = isDeployed ? (delegators ?? []) : MOCK_DELEGATORS;
    if (!searchQuery) return displayDelegators;
    const query = searchQuery.toLowerCase();
    return displayDelegators.filter((addr) =>
      addr.toLowerCase().includes(query)
    );
  }, [isDeployed, delegators, searchQuery]);

  const handleDelegate = (address: `0x${string}`) => {
    setSelectedDelegatee(address);
  };

  return (
    <>
      <Card padding="none">
        <CardHeader className="p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Delegates</CardTitle>
            <Input
              placeholder="Search by address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm:w-64"
              size="sm"
              aria-label="Search delegates by address"
            />
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {!isDeployed && (
            <div className="text-center py-2 mb-4 text-[var(--text-tertiary)]">
              <p className="text-xs">
                Showing mock data (contracts not deployed)
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading delegates">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-[var(--bg-tertiary)] rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : filteredDelegators.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              <p className="text-sm">
                {searchQuery
                  ? "No delegates found matching your search"
                  : "No delegates registered yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDelegators.map((address, index) => (
                <DelegatorItem
                  key={address}
                  address={address}
                  rank={index + 1}
                  isCurrentDelegate={!!(hasDelegatee && currentDelegatee === address)}
                  onDelegate={handleDelegate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDelegatee && (
        <DelegationModal
          open={!!selectedDelegatee}
          onClose={() => setSelectedDelegatee(null)}
          delegatee={selectedDelegatee}
          mode="delegate"
        />
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DelegateCard } from "@/components/ui/delegate-card";
import { useAllDelegators } from "@/hooks/contracts/useDelegateRegistry";

// Mock top delegators for display
const MOCK_DELEGATORS: {
  address: `0x${string}`;
  ensName?: string;
  votingPower: string;
}[] = [];

/**
 * Top Delegators Section
 * Shows top 5 delegators by voting power
 */
export function TopDelegators() {
  const { isDeployed } = useAllDelegators();

  // In production, we'd fetch and sort delegators from the contract
  // For now, use mock data
  const topDelegators = MOCK_DELEGATORS.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top Delegators</CardTitle>
        <Link
          href="/delegates"
          className="text-sm text-[var(--text-brand)] hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {!isDeployed && (
          <div className="text-center py-4 text-[var(--text-tertiary)]">
            <p className="text-sm">Contracts not deployed</p>
            <p className="text-xs mt-1">
              No delegators available
            </p>
          </div>
        )}
        {isDeployed && topDelegators.length === 0 && (
          <div className="text-center py-4 text-[var(--text-tertiary)]">
            <p className="text-sm">No delegators yet</p>
            <p className="text-xs mt-1">
              Be the first to delegate your voting power
            </p>
          </div>
        )}
        {topDelegators.map((delegator, index) => (
          <DelegateCard
            key={delegator.address}
            address={delegator.address}
            ensName={delegator.ensName}
            votingPower={delegator.votingPower}
            tokenSymbol="vTON"
            rank={index + 1}
          />
        ))}
      </CardContent>
    </Card>
  );
}

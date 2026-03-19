"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DelegateListItem } from "@/components/ui/delegate-list-item";
import { useAllDelegates } from "@/hooks/contracts/useDelegateRegistry";
import { useReadContracts, useChainId } from "wagmi";
import { getContractAddresses, areContractsDeployed, DELEGATE_REGISTRY_ABI } from "@/constants/contracts";
import { useMemo } from "react";
import { formatUnits } from "viem";
import { useSubgraphDelegates } from "@/hooks/subgraph/useSubgraphDelegates";

/**
 * Top Delegates Section
 * Shows top 5 delegates by voting power.
 * Uses subgraph when available, otherwise falls back to RPC.
 */
export function TopDelegates() {
  // Subgraph path
  const {
    delegates: subgraphDelegates,
    isSubgraphEnabled,
  } = useSubgraphDelegates(5);

  // RPC fallback path
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);
  const { data: delegates } = useAllDelegates();

  const delegatedCalls = useMemo(() => {
    if (isSubgraphEnabled || !delegates || delegates.length === 0) return [];
    return delegates.map((delegate) => ({
      address: addresses.delegateRegistry as `0x${string}`,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "getTotalDelegated" as const,
      args: [delegate],
    }));
  }, [delegates, addresses.delegateRegistry, isSubgraphEnabled]);

  const { data: delegatedResults } = useReadContracts({
    contracts: delegatedCalls,
    query: {
      enabled: !isSubgraphEnabled && isDeployed && delegatedCalls.length > 0,
    },
  });

  // Combine delegates with their voting power and sort (RPC path)
  const rpcTopDelegates = useMemo(() => {
    if (isSubgraphEnabled || !delegates || !delegatedResults) return [];

    const delegatesWithPower = delegates.map((address, index) => {
      const result = delegatedResults[index];
      const votingPower = result?.status === "success" ? (result.result as bigint) : BigInt(0);
      return {
        address: address as `0x${string}`,
        votingPower,
        votingPowerFormatted: formatUnits(votingPower, 18),
      };
    });

    return delegatesWithPower
      .sort((a, b) => (b.votingPower > a.votingPower ? 1 : -1))
      .slice(0, 5);
  }, [delegates, delegatedResults, isSubgraphEnabled]);

  // Unified top delegates
  const topDelegates = isSubgraphEnabled
    ? subgraphDelegates.map((d) => ({
        address: d.address,
        votingPower: d.totalDelegated,
        votingPowerFormatted: d.totalDelegatedFormatted,
      }))
    : rpcTopDelegates;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top Voters</CardTitle>
        <Link
          href="/delegates"
          className="text-sm text-[var(--text-brand)] hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {!isSubgraphEnabled && !isDeployed && (
          <div className="text-center py-4 text-[var(--text-tertiary)]">
            <p className="text-sm">Contracts not deployed</p>
            <p className="text-xs mt-1">
              No delegates available
            </p>
          </div>
        )}
        {(isSubgraphEnabled || isDeployed) && topDelegates.length === 0 && (
          <div className="text-center py-4 text-[var(--text-tertiary)]">
            <p className="text-sm">No voters yet</p>
            <p className="text-xs mt-1">
              Be the first to delegate your voting power
            </p>
          </div>
        )}
        {topDelegates.map((delegate, index) => (
          <DelegateListItem
            key={delegate.address}
            address={delegate.address}
            votingPower={Number(delegate.votingPowerFormatted).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            tokenSymbol="vTON"
            rank={index + 1}
          />
        ))}
      </CardContent>
    </Card>
  );
}

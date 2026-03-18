"use client";

import * as React from "react";
import { useChainId, usePublicClient, useReadContracts } from "wagmi";
import {
  getContractAddresses,
  areContractsDeployed,
  getDeploymentBlock,
  VTON_ABI,
  DELEGATE_REGISTRY_ABI,
} from "@/constants/contracts";
import { getLogsInChunks } from "@/lib/getLogs";
import { zeroAddress } from "viem";

export interface VoterInfo {
  address: `0x${string}`;
  balance: bigint;
}

/**
 * Hook to fetch all vTON holders by indexing Transfer events,
 * then batch-query their current balances.
 */
export function useVTONVoters() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);
  const publicClient = usePublicClient();

  const [holderAddresses, setHolderAddresses] = React.useState<`0x${string}`[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = React.useState(true);

  // Step 1: Fetch Transfer events to discover all addresses that ever received vTON
  React.useEffect(() => {
    if (!isDeployed || !publicClient) {
      setIsLoadingEvents(false);
      return;
    }

    let cancelled = false;

    async function fetchHolders() {
      try {
        const fromBlock = getDeploymentBlock(chainId);
        const logs = await getLogsInChunks(publicClient!, {
          address: addresses.vton as `0x${string}`,
          event: {
            name: "Transfer",
            type: "event",
            inputs: [
              { name: "from", type: "address", indexed: true },
              { name: "to", type: "address", indexed: true },
              { name: "value", type: "uint256", indexed: false },
            ],
          },
          fromBlock,
          toBlock: "latest",
        });

        if (!cancelled) {
          // Collect unique "to" addresses (excluding zero address)
          const uniqueAddresses = new Set<string>();
          for (const log of logs) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const args = (log as Record<string, any>).args ?? {};
            const to = args.to as string | undefined;
            if (to && to.toLowerCase() !== zeroAddress.toLowerCase()) {
              uniqueAddresses.add(to.toLowerCase());
            }
          }
          setHolderAddresses(
            Array.from(uniqueAddresses).map((a) => a as `0x${string}`)
          );
        }
      } catch (error) {
        console.error("Failed to fetch vTON holders:", error);
      } finally {
        if (!cancelled) setIsLoadingEvents(false);
      }
    }

    fetchHolders();
    return () => { cancelled = true; };
  }, [isDeployed, publicClient, chainId, addresses.vton]);

  // Step 2: Batch-query balanceOf for all discovered addresses
  const balanceCalls = React.useMemo(() => {
    if (!isDeployed || holderAddresses.length === 0) return [];
    return holderAddresses.map((addr) => ({
      address: addresses.vton as `0x${string}`,
      abi: VTON_ABI,
      functionName: "balanceOf" as const,
      args: [addr] as const,
    }));
  }, [isDeployed, holderAddresses, addresses.vton]);

  const { data: balanceResults, isLoading: isLoadingBalances } = useReadContracts({
    contracts: balanceCalls,
    query: { enabled: balanceCalls.length > 0 },
  });

  // Step 3: Filter to holders with balance > 0
  const voters = React.useMemo(() => {
    if (!balanceResults) return [];
    const result: VoterInfo[] = [];
    holderAddresses.forEach((addr, idx) => {
      const res = balanceResults[idx];
      const balance = res?.status === "success" ? (res.result as bigint) : BigInt(0);
      if (balance > BigInt(0)) {
        result.push({ address: addr, balance });
      }
    });
    // Sort by balance descending
    result.sort((a, b) => (b.balance > a.balance ? 1 : -1));
    return result;
  }, [holderAddresses, balanceResults]);

  return {
    voters,
    isLoading: isLoadingEvents || isLoadingBalances,
    isDeployed,
  };
}

/**
 * Hook to batch-query delegation status for a list of voters against all registered delegates.
 * Returns a map: voterAddress → { delegatee, agentName? }
 */
export function useVoterDelegations(
  voterAddresses: `0x${string}`[],
  delegateAddresses: `0x${string}`[],
  agentWalletMap: Map<string, string>,
) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const contracts = React.useMemo(() => {
    if (!isDeployed || voterAddresses.length === 0 || delegateAddresses.length === 0) return [];
    const calls: Array<{
      address: `0x${string}`;
      abi: typeof DELEGATE_REGISTRY_ABI;
      functionName: "getDelegation";
      args: readonly [`0x${string}`, `0x${string}`];
    }> = [];
    for (const voter of voterAddresses) {
      for (const delegate of delegateAddresses) {
        calls.push({
          address: addresses.delegateRegistry as `0x${string}`,
          abi: DELEGATE_REGISTRY_ABI,
          functionName: "getDelegation" as const,
          args: [voter, delegate] as const,
        });
      }
    }
    return calls;
  }, [isDeployed, voterAddresses, delegateAddresses, addresses.delegateRegistry]);

  const { data: results } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 },
  });

  const delegationMap = React.useMemo(() => {
    const map = new Map<string, { address: `0x${string}`; agentName?: string }>();
    if (!results || delegateAddresses.length === 0) return map;

    let idx = 0;
    for (const voter of voterAddresses) {
      for (const delegate of delegateAddresses) {
        const result = results[idx];
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
    return map;
  }, [voterAddresses, delegateAddresses, results, agentWalletMap]);

  return delegationMap;
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { querySubgraph, isSubgraphEnabled } from "@/lib/graphql";

interface SubgraphDelegate {
  id: string;
  profile: string;
  votingPhilosophy: string;
  interests: string;
  registeredAt: string;
  isActive: boolean;
  totalDelegated: string;
}

interface SubgraphDelegatesResponse {
  delegates: SubgraphDelegate[];
}

export interface SubgraphDelegateInfo {
  address: `0x${string}`;
  profile: string;
  votingPhilosophy: string;
  interests: string;
  registeredAt: bigint;
  isActive: boolean;
  totalDelegated: bigint;
  totalDelegatedFormatted: string;
}

const TOP_DELEGATES_QUERY = `
  query GetTopDelegates($first: Int!) {
    delegates(
      first: $first
      orderBy: totalDelegated
      orderDirection: desc
      where: { isActive: true }
    ) {
      id
      profile
      votingPhilosophy
      interests
      registeredAt
      isActive
      totalDelegated
    }
  }
`;

export function useSubgraphDelegates(first = 5) {
  const enabled = isSubgraphEnabled();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["subgraph-delegates", first],
    queryFn: async () => {
      const result =
        await querySubgraph<SubgraphDelegatesResponse>(TOP_DELEGATES_QUERY, {
          first,
        });
      return result.delegates;
    },
    enabled,
    staleTime: 30_000,
  });

  const delegates: SubgraphDelegateInfo[] = (data ?? []).map((d) => {
    const totalDelegated = BigInt(d.totalDelegated);
    // Format from wei (18 decimals)
    const formatted = Number(totalDelegated) / 1e18;
    return {
      address: d.id as `0x${string}`,
      profile: d.profile,
      votingPhilosophy: d.votingPhilosophy,
      interests: d.interests,
      registeredAt: BigInt(d.registeredAt),
      isActive: d.isActive,
      totalDelegated,
      totalDelegatedFormatted: formatted.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      }),
    };
  });

  return {
    delegates,
    isLoading,
    isError,
    error,
    isSubgraphEnabled: enabled,
  };
}

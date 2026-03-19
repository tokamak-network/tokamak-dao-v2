"use client";

import { useQuery } from "@tanstack/react-query";
import { querySubgraph } from "@/lib/graphql";

interface SubgraphTokenHolder {
  id: string;
  balance: string;
  delegations: Array<{
    delegate: {
      id: string;
      profile: string;
    };
    amount: string;
    delegatedAt: string;
    expiresAt: string;
  }>;
}

interface SubgraphVotersResponse {
  tokenHolders: SubgraphTokenHolder[];
}

export interface SubgraphVoterInfo {
  address: `0x${string}`;
  balance: bigint;
  delegatedTo: {
    address: `0x${string}`;
    agentName?: string;
  } | null;
}

const VOTERS_QUERY = `
  query GetVoters($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
    tokenHolders(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: { balance_gt: "0" }
    ) {
      id
      balance
      delegations(where: { amount_gt: "0" }) {
        delegate {
          id
          profile
        }
        amount
        delegatedAt
        expiresAt
      }
    }
  }
`;

export function useSubgraphVoters(first = 100, skip = 0) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["subgraph-voters", first, skip],
    queryFn: async () => {
      const result = await querySubgraph<SubgraphVotersResponse>(VOTERS_QUERY, {
        first,
        skip,
        orderBy: "balance",
        orderDirection: "desc",
      });
      return result.tokenHolders;
    },
    staleTime: 30_000,
  });

  const voters: SubgraphVoterInfo[] = (data ?? []).map((holder) => {
    const activeDelegation = holder.delegations[0] ?? null;
    return {
      address: holder.id as `0x${string}`,
      balance: BigInt(holder.balance),
      delegatedTo: activeDelegation
        ? {
            address: activeDelegation.delegate.id as `0x${string}`,
          }
        : null,
    };
  });

  return {
    voters,
    isLoading,
    isError,
    error,
  };
}

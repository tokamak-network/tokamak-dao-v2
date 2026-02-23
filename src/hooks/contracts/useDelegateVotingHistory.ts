"use client";

import * as React from "react";
import { useChainId, usePublicClient } from "wagmi";
import {
  getContractAddresses,
  areContractsDeployed,
  getDeploymentBlock,
} from "@/constants/contracts";
import { getLogsInChunks } from "@/lib/getLogs";

export interface VoteRecord {
  proposalId: bigint;
  support: number; // 0=Against, 1=For, 2=Abstain
  weight: bigint;
  reason: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}

export interface VotingStats {
  forCount: number;
  againstCount: number;
  abstainCount: number;
  totalVotes: number;
}

export function useDelegateVotingHistory(voter?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);
  const publicClient = usePublicClient();

  const [votes, setVotes] = React.useState<VoteRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isDeployed || !publicClient || !voter) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchVotingHistory() {
      try {
        const fromBlock = getDeploymentBlock(chainId);
        const logs = await getLogsInChunks(publicClient!, {
          address: addresses.daoGovernor as `0x${string}`,
          event: {
            name: "VoteCast",
            type: "event",
            inputs: [
              { name: "voter", type: "address", indexed: true },
              { name: "proposalId", type: "uint256", indexed: true },
              { name: "support", type: "uint8", indexed: false },
              { name: "weight", type: "uint256", indexed: false },
              { name: "reason", type: "string", indexed: false },
            ],
          },
          args: {
            voter: voter,
          },
          fromBlock,
          toBlock: "latest",
        });

        if (!cancelled) {
          const records: VoteRecord[] = logs.map((log) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const args = (log as Record<string, any>).args ?? {};
            return {
              proposalId: args.proposalId!,
              support: Number(args.support!),
              weight: args.weight!,
              reason: args.reason ?? "",
              blockNumber: log.blockNumber!,
              transactionHash: log.transactionHash!,
            };
          });

          // Sort by block number descending (most recent first)
          records.sort((a, b) => Number(b.blockNumber - a.blockNumber));
          setVotes(records);
        }
      } catch (error) {
        console.error("Failed to fetch voting history:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchVotingHistory();

    return () => {
      cancelled = true;
    };
  }, [isDeployed, publicClient, voter, addresses.daoGovernor, chainId]);

  const stats: VotingStats = React.useMemo(() => {
    const forCount = votes.filter((v) => v.support === 1).length;
    const againstCount = votes.filter((v) => v.support === 0).length;
    const abstainCount = votes.filter((v) => v.support === 2).length;
    return {
      forCount,
      againstCount,
      abstainCount,
      totalVotes: votes.length,
    };
  }, [votes]);

  return { votes, stats, isLoading, isDeployed };
}

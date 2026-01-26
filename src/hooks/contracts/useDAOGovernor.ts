"use client";

import { useReadContract, useWriteContract, useChainId } from "wagmi";
import {
  getContractAddresses,
  areContractsDeployed,
  DAO_GOVERNOR_ABI,
} from "@/constants/contracts";
import { VoteType } from "@/types/governance";

// Mock data for when contracts are not deployed
const MOCK_DATA = {
  proposalCount: BigInt(0),
  quorum: BigInt(400), // 4%
  votingPeriod: BigInt(604800), // 7 days in seconds
  votingDelay: BigInt(86400), // 1 day in seconds
  proposalThreshold: BigInt("1000000000000000000000"), // 1000 vTON
  proposalCreationCost: BigInt("100000000000000000000"), // 100 TON
};

/**
 * Hook to get proposal count
 */
export function useProposalCount() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "proposalCount",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.proposalCount,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get proposal details
 */
export function useProposal(proposalId: bigint) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "getProposal",
    args: [proposalId],
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: result.data,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get proposal state
 */
export function useProposalState(proposalId: bigint) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "state",
    args: [proposalId],
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: result.data,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get governance parameters
 */
export function useGovernanceParams() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const quorumResult = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "quorum",
    query: {
      enabled: isDeployed,
    },
  });

  const votingPeriodResult = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "votingPeriod",
    query: {
      enabled: isDeployed,
    },
  });

  const votingDelayResult = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "votingDelay",
    query: {
      enabled: isDeployed,
    },
  });

  const thresholdResult = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "proposalThreshold",
    query: {
      enabled: isDeployed,
    },
  });

  const costResult = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "proposalCreationCost",
    query: {
      enabled: isDeployed,
    },
  });

  const isLoading =
    quorumResult.isLoading ||
    votingPeriodResult.isLoading ||
    votingDelayResult.isLoading ||
    thresholdResult.isLoading ||
    costResult.isLoading;

  const isError =
    quorumResult.isError ||
    votingPeriodResult.isError ||
    votingDelayResult.isError ||
    thresholdResult.isError ||
    costResult.isError;

  return {
    quorum: isDeployed ? quorumResult.data : MOCK_DATA.quorum,
    votingPeriod: isDeployed ? votingPeriodResult.data : MOCK_DATA.votingPeriod,
    votingDelay: isDeployed ? votingDelayResult.data : MOCK_DATA.votingDelay,
    proposalThreshold: isDeployed
      ? thresholdResult.data
      : MOCK_DATA.proposalThreshold,
    proposalCreationCost: isDeployed
      ? costResult.data
      : MOCK_DATA.proposalCreationCost,
    isLoading: isDeployed ? isLoading : false,
    isError: isDeployed ? isError : false,
    isDeployed,
  };
}

/**
 * Hook to check if an account has voted on a proposal
 */
export function useHasVoted(proposalId: bigint, account: `0x${string}` | undefined) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.daoGovernor,
    abi: DAO_GOVERNOR_ABI,
    functionName: "hasVoted",
    args: account ? [proposalId, account] : undefined,
    query: {
      enabled: isDeployed && !!account,
    },
  });

  return {
    data: result.data ?? false,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to create a new proposal
 */
export function usePropose() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const { writeContract, writeContractAsync, data, isPending, isError, error, isSuccess } =
    useWriteContract();

  const propose = (
    targets: `0x${string}`[],
    values: bigint[],
    calldatas: `0x${string}`[],
    description: string
  ) => {
    if (!isDeployed) return;
    writeContract({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "propose",
      args: [targets, values, calldatas, description],
    });
  };

  const proposeAsync = async (
    targets: `0x${string}`[],
    values: bigint[],
    calldatas: `0x${string}`[],
    description: string
  ) => {
    if (!isDeployed) throw new Error("Contracts not deployed");
    return writeContractAsync({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "propose",
      args: [targets, values, calldatas, description],
    });
  };

  return {
    propose,
    proposeAsync,
    data,
    isPending,
    isError,
    error,
    isSuccess,
    isDeployed,
  };
}

/**
 * Hook to cast a vote on a proposal
 */
export function useCastVote() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const { writeContract, writeContractAsync, data, isPending, isError, error, isSuccess } =
    useWriteContract();

  const castVote = (proposalId: bigint, support: VoteType) => {
    if (!isDeployed) return;
    writeContract({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "castVote",
      args: [proposalId, support],
    });
  };

  const castVoteAsync = async (proposalId: bigint, support: VoteType) => {
    if (!isDeployed) throw new Error("Contracts not deployed");
    return writeContractAsync({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "castVote",
      args: [proposalId, support],
    });
  };

  const castVoteWithReason = (proposalId: bigint, support: VoteType, reason: string) => {
    if (!isDeployed) return;
    writeContract({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "castVoteWithReason",
      args: [proposalId, support, reason],
    });
  };

  const castVoteWithReasonAsync = async (
    proposalId: bigint,
    support: VoteType,
    reason: string
  ) => {
    if (!isDeployed) throw new Error("Contracts not deployed");
    return writeContractAsync({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "castVoteWithReason",
      args: [proposalId, support, reason],
    });
  };

  return {
    castVote,
    castVoteAsync,
    castVoteWithReason,
    castVoteWithReasonAsync,
    data,
    isPending,
    isError,
    error,
    isSuccess,
    isDeployed,
  };
}

/**
 * Hook to queue a succeeded proposal
 */
export function useQueueProposal() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const { writeContract, writeContractAsync, data, isPending, isError, error, isSuccess } =
    useWriteContract();

  const queue = (proposalId: bigint) => {
    if (!isDeployed) return;
    writeContract({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "queue",
      args: [proposalId],
    });
  };

  const queueAsync = async (proposalId: bigint) => {
    if (!isDeployed) throw new Error("Contracts not deployed");
    return writeContractAsync({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "queue",
      args: [proposalId],
    });
  };

  return {
    queue,
    queueAsync,
    data,
    isPending,
    isError,
    error,
    isSuccess,
    isDeployed,
  };
}

/**
 * Hook to execute a queued proposal
 */
export function useExecuteProposal() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const { writeContract, writeContractAsync, data, isPending, isError, error, isSuccess } =
    useWriteContract();

  const execute = (proposalId: bigint) => {
    if (!isDeployed) return;
    writeContract({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "execute",
      args: [proposalId],
    });
  };

  const executeAsync = async (proposalId: bigint) => {
    if (!isDeployed) throw new Error("Contracts not deployed");
    return writeContractAsync({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "execute",
      args: [proposalId],
    });
  };

  return {
    execute,
    executeAsync,
    data,
    isPending,
    isError,
    error,
    isSuccess,
    isDeployed,
  };
}

/**
 * Hook to cancel a proposal (proposer only)
 */
export function useCancelProposal() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const { writeContract, writeContractAsync, data, isPending, isError, error, isSuccess } =
    useWriteContract();

  const cancel = (proposalId: bigint) => {
    if (!isDeployed) return;
    writeContract({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "cancel",
      args: [proposalId],
    });
  };

  const cancelAsync = async (proposalId: bigint) => {
    if (!isDeployed) throw new Error("Contracts not deployed");
    return writeContractAsync({
      address: addresses.daoGovernor,
      abi: DAO_GOVERNOR_ABI,
      functionName: "cancel",
      args: [proposalId],
    });
  };

  return {
    cancel,
    cancelAsync,
    data,
    isPending,
    isError,
    error,
    isSuccess,
    isDeployed,
  };
}

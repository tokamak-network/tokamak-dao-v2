"use client";

import * as React from "react";
import { useReadContract, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  getContractAddresses,
  areContractsDeployed,
  DELEGATE_REGISTRY_ABI,
} from "@/constants/contracts";

// Mock data for when contracts are not deployed
const MOCK_DATA = {
  delegators: [] as `0x${string}`[],
  totalDelegated: BigInt(0),
  delegationPeriodRequirement: BigInt(604800), // 7 days in seconds
  delegatorInfo: {
    profile: "",
    philosophy: "",
    interests: [] as string[],
    isRegistered: false,
  },
};

/**
 * Hook to get all delegators
 */
export function useAllDelegators() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "getAllDelegators",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.delegators,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to get total delegated amount to an address
 */
export function useTotalDelegated(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "getTotalDelegated",
    args: address ? [address] : undefined,
    query: {
      enabled: isDeployed && !!address,
    },
  });

  return {
    data: isDeployed && address ? result.data : MOCK_DATA.totalDelegated,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to get delegation info for an address
 */
export function useDelegation(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "getDelegation",
    args: address ? [address] : undefined,
    query: {
      enabled: isDeployed && !!address,
    },
  });

  return {
    data: isDeployed && address
      ? result.data
      : { delegatee: undefined, amount: BigInt(0) },
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to get delegation parameters
 */
export function useDelegationParams() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const periodResult = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "delegationPeriodRequirement",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    delegationPeriodRequirement: isDeployed
      ? periodResult.data
      : MOCK_DATA.delegationPeriodRequirement,
    isLoading: isDeployed ? periodResult.isLoading : false,
    isError: isDeployed ? periodResult.isError : false,
    isDeployed,
  };
}

/**
 * Hook to delegate vTON to a delegatee
 */
export function useDelegate() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const {
    data: hash,
    isPending,
    writeContract,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const delegate = (delegatee: `0x${string}`, amount: bigint) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, delegate action skipped");
      return;
    }
    writeContract({
      address: addresses.delegateRegistry,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "delegate",
      args: [delegatee, amount],
    });
  };

  return {
    delegate,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
  };
}

/**
 * Hook to undelegate vTON from a delegatee
 */
export function useUndelegate() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const {
    data: hash,
    isPending,
    writeContract,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const undelegate = (delegatee: `0x${string}`, amount: bigint) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, undelegate action skipped");
      return;
    }
    writeContract({
      address: addresses.delegateRegistry,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "undelegate",
      args: [delegatee, amount],
    });
  };

  return {
    undelegate,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
  };
}

/**
 * Hook to get delegator info for an address
 */
export function useDelegatorInfo(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "getDelegatorInfo",
    args: address ? [address] : undefined,
    query: {
      enabled: isDeployed && !!address,
    },
  });

  // Parse the result tuple into an object
  const data = React.useMemo(() => {
    if (!isDeployed || !address || !result.data) {
      return MOCK_DATA.delegatorInfo;
    }
    const [profile, philosophy, interests, isRegistered] = result.data as [
      string,
      string,
      string[],
      boolean
    ];
    return { profile, philosophy, interests, isRegistered };
  }, [isDeployed, address, result.data]);

  return {
    data,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to register as a delegator
 */
export function useRegisterDelegator() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const {
    data: hash,
    isPending,
    writeContract,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const registerDelegator = (
    profile: string,
    philosophy: string,
    interests: string[]
  ) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, registerDelegator action skipped");
      return;
    }
    writeContract({
      address: addresses.delegateRegistry,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "registerDelegator",
      args: [profile, philosophy, interests.join(", ")],
    });
  };

  return {
    registerDelegator,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
  };
}

/**
 * Hook to check if an address is a registered delegator
 */
export function useIsRegisteredDelegator(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "isRegisteredDelegator",
    args: address ? [address] : undefined,
    query: {
      enabled: isDeployed && !!address,
    },
  });

  return {
    data: isDeployed && address ? result.data : false,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    refetch: result.refetch,
    isDeployed,
  };
}

/**
 * Hook to get voting power for a delegator at a specific block
 */
export function useDelegatorVotingPower(
  delegator?: `0x${string}`,
  blockNumber?: bigint,
  snapshotBlock?: bigint
) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "getVotingPower",
    args:
      delegator && blockNumber && snapshotBlock
        ? [delegator, blockNumber, snapshotBlock]
        : undefined,
    query: {
      enabled: isDeployed && !!delegator && !!blockNumber && !!snapshotBlock,
    },
  });

  return {
    data: result.data ?? BigInt(0),
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to redelegate vTON from one delegatee to another
 */
export function useRedelegate() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const {
    data: hash,
    isPending,
    writeContract,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const redelegate = (
    fromDelegator: `0x${string}`,
    toDelegator: `0x${string}`,
    amount: bigint
  ) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, redelegate action skipped");
      return;
    }
    writeContract({
      address: addresses.delegateRegistry,
      abi: DELEGATE_REGISTRY_ABI,
      functionName: "redelegate",
      args: [fromDelegator, toDelegator, amount],
    });
  };

  return {
    redelegate,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
  };
}

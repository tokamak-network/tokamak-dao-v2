"use client";

import { useReadContract, useChainId } from "wagmi";
import {
  getContractAddresses,
  areContractsDeployed,
  SECURITY_COUNCIL_ABI,
} from "@/constants/contracts";

// Mock data for when contracts are not deployed
const MOCK_DATA = {
  members: [] as `0x${string}`[],
  threshold: BigInt(0),
  pendingActionsCount: BigInt(0),
};

/**
 * Hook to get Security Council members
 */
export function useCouncilMembers() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "getMembers",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.members,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get Security Council threshold
 */
export function useCouncilThreshold() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "threshold",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.threshold,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get pending actions count
 */
export function usePendingActionsCount() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "getPendingActionsCount",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.pendingActionsCount,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Combined hook for all Security Council data
 */
export function useSecurityCouncil() {
  const membersResult = useCouncilMembers();
  const thresholdResult = useCouncilThreshold();
  const pendingResult = usePendingActionsCount();

  return {
    members: membersResult.data ?? [],
    threshold: thresholdResult.data ?? BigInt(0),
    pendingActionsCount: pendingResult.data ?? BigInt(0),
    isLoading:
      membersResult.isLoading ||
      thresholdResult.isLoading ||
      pendingResult.isLoading,
    isError:
      membersResult.isError ||
      thresholdResult.isError ||
      pendingResult.isError,
    isDeployed: membersResult.isDeployed,
  };
}

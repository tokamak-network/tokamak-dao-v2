"use client";

import { useReadContract, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  getContractAddresses,
  areContractsDeployed,
  SECURITY_COUNCIL_ABI,
} from "@/constants/contracts";

/**
 * Security Council Action Types (matches contract enum)
 */
export enum ActionType {
  CancelProposal = 0,
  PauseProtocol = 1,
  UnpauseProtocol = 2,
  EmergencyUpgrade = 3,
  Custom = 4,
}

/**
 * Member struct from SecurityCouncil contract
 */
export interface SecurityCouncilMember {
  account: `0x${string}`;
  isFoundation: boolean;
  addedAt: bigint;
}

/**
 * EmergencyAction struct from SecurityCouncil contract
 */
export interface EmergencyActionData {
  id: bigint;
  actionType: number;
  target: `0x${string}`;
  data: `0x${string}`;
  reason: string;
  createdAt: bigint;
  executedAt: bigint;
  executed: boolean;
  approvers: readonly `0x${string}`[];
}

// Mock data for when contracts are not deployed
const MOCK_DATA = {
  members: [] as SecurityCouncilMember[],
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
 * Hook to check if an address is a Security Council member
 */
export function useIsMember(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "isMember",
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
    isDeployed,
  };
}

/**
 * Hook to get pending action IDs
 */
export function usePendingActions() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "getPendingActions",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : [],
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
    refetch: result.refetch,
  };
}

/**
 * Hook to get pending actions count
 * Derives count from getPendingActions() since getPendingActionsCount doesn't exist in the contract
 */
export function usePendingActionsCount() {
  const { data: pendingActions, isLoading, isError, error, isDeployed } = usePendingActions();

  return {
    data: BigInt(pendingActions?.length ?? 0),
    isLoading,
    isError,
    error,
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

/**
 * Hook to get emergency action details using getEmergencyAction
 * Returns the full EmergencyAction struct including the approvers array
 */
export function useEmergencyAction(actionId?: bigint) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.securityCouncil,
    abi: SECURITY_COUNCIL_ABI,
    functionName: "getEmergencyAction",
    args: actionId !== undefined ? [actionId] : undefined,
    query: {
      enabled: isDeployed && actionId !== undefined,
    },
  });

  // Transform the raw tuple data into a typed object
  const data: EmergencyActionData | undefined = result.data
    ? {
        id: result.data.id,
        actionType: result.data.actionType,
        target: result.data.target,
        data: result.data.data,
        reason: result.data.reason,
        createdAt: result.data.createdAt,
        executedAt: result.data.executedAt,
        executed: result.data.executed,
        approvers: result.data.approvers,
      }
    : undefined;

  return {
    data,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
    refetch: result.refetch,
  };
}

/**
 * Hook to propose an emergency action
 */
export function useProposeEmergencyAction() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const {
    data: hash,
    isPending,
    writeContract,
    writeContractAsync,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const proposeEmergencyAction = (
    actionType: ActionType,
    target: `0x${string}`,
    data: `0x${string}`,
    reason: string
  ) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, proposeEmergencyAction action skipped");
      return;
    }
    writeContract({
      address: addresses.securityCouncil,
      abi: SECURITY_COUNCIL_ABI,
      functionName: "proposeEmergencyAction",
      args: [actionType, target, data, reason],
    });
  };

  const proposeEmergencyActionAsync = async (
    actionType: ActionType,
    target: `0x${string}`,
    data: `0x${string}`,
    reason: string
  ) => {
    if (!isDeployed) {
      throw new Error("Contracts not deployed");
    }
    return writeContractAsync({
      address: addresses.securityCouncil,
      abi: SECURITY_COUNCIL_ABI,
      functionName: "proposeEmergencyAction",
      args: [actionType, target, data, reason],
    });
  };

  return {
    proposeEmergencyAction,
    proposeEmergencyActionAsync,
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
 * Hook to approve an emergency action
 */
export function useApproveEmergencyAction() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const {
    data: hash,
    isPending,
    writeContract,
    writeContractAsync,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const approveEmergencyAction = (actionId: bigint) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, approveEmergencyAction action skipped");
      return;
    }
    writeContract({
      address: addresses.securityCouncil,
      abi: SECURITY_COUNCIL_ABI,
      functionName: "approveEmergencyAction",
      args: [actionId],
    });
  };

  const approveEmergencyActionAsync = async (actionId: bigint) => {
    if (!isDeployed) {
      throw new Error("Contracts not deployed");
    }
    return writeContractAsync({
      address: addresses.securityCouncil,
      abi: SECURITY_COUNCIL_ABI,
      functionName: "approveEmergencyAction",
      args: [actionId],
    });
  };

  return {
    approveEmergencyAction,
    approveEmergencyActionAsync,
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
 * Hook to execute an emergency action
 */
export function useExecuteEmergencyAction() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const {
    data: hash,
    isPending,
    writeContract,
    writeContractAsync,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const executeEmergencyAction = (actionId: bigint) => {
    if (!isDeployed) {
      console.warn("Contracts not deployed, executeEmergencyAction action skipped");
      return;
    }
    writeContract({
      address: addresses.securityCouncil,
      abi: SECURITY_COUNCIL_ABI,
      functionName: "executeEmergencyAction",
      args: [actionId],
    });
  };

  const executeEmergencyActionAsync = async (actionId: bigint) => {
    if (!isDeployed) {
      throw new Error("Contracts not deployed");
    }
    return writeContractAsync({
      address: addresses.securityCouncil,
      abi: SECURITY_COUNCIL_ABI,
      functionName: "executeEmergencyAction",
      args: [actionId],
    });
  };

  return {
    executeEmergencyAction,
    executeEmergencyActionAsync,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
    reset,
    isDeployed,
  };
}

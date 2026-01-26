"use client";

import { useReadContract, useChainId } from "wagmi";
import { getContractAddresses, areContractsDeployed, VTON_ABI } from "@/constants/contracts";

// Mock data for when contracts are not deployed
const MOCK_DATA = {
  totalSupply: BigInt(0),
  emissionRatio: BigInt("800000000000000000"), // 80% emission ratio (1e18 = 100%)
  balance: BigInt(0),
  votingPower: BigInt(0),
};

/**
 * Hook to get vTON total supply
 */
export function useTotalSupply() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.vton,
    abi: VTON_ABI,
    functionName: "totalSupply",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.totalSupply,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get vTON emission ratio
 */
export function useEmissionRatio() {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.vton,
    abi: VTON_ABI,
    functionName: "emissionRatio",
    query: {
      enabled: isDeployed,
    },
  });

  return {
    data: isDeployed ? result.data : MOCK_DATA.emissionRatio,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get vTON balance for an address
 */
export function useVTONBalance(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.vton,
    abi: VTON_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isDeployed && !!address,
    },
  });

  return {
    data: isDeployed && address ? result.data : MOCK_DATA.balance,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

/**
 * Hook to get voting power for an address
 */
export function useVotingPower(address?: `0x${string}`) {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  const result = useReadContract({
    address: addresses.vton,
    abi: VTON_ABI,
    functionName: "getVotes",
    args: address ? [address] : undefined,
    query: {
      enabled: isDeployed && !!address,
    },
  });

  return {
    data: isDeployed && address ? result.data : MOCK_DATA.votingPower,
    isLoading: isDeployed ? result.isLoading : false,
    isError: isDeployed ? result.isError : false,
    error: isDeployed ? result.error : null,
    isDeployed,
  };
}

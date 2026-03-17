"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useReadContract, useChainId } from "wagmi";
import {
  getContractAddresses,
  areContractsDeployed,
  DELEGATE_REGISTRY_ABI,
  VOTE_RELAY_FUND_ABI,
} from "@/constants/contracts";

export type WizardStep = "create" | "delegate" | "deposit" | "telegram" | "complete";

export interface AgentSetupStatus {
  isLoading: boolean;
  agentId: number | null;
  agentWalletAddress: string | null;
  telegramTokenSaved: boolean;
  telegramConnected: boolean;
  hasDelegation: boolean;
  hasGasDeposit: boolean;
  firstIncompleteStep: WizardStep;
  refetch: () => void;
}

export function useAgentSetupStatus(ownerAddress?: `0x${string}`): AgentSetupStatus {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const isDeployed = areContractsDeployed(chainId);

  // API state
  const [agentId, setAgentId] = useState<number | null>(null);
  const [agentWalletAddress, setAgentWalletAddress] = useState<string | null>(null);
  const [telegramTokenSaved, setTelegramTokenSaved] = useState(false);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  // Fetch agent from API
  useEffect(() => {
    if (!ownerAddress) {
      setAgentId(null);
      setAgentWalletAddress(null);
      setTelegramTokenSaved(false);
      setTelegramConnected(false);
      return;
    }

    setApiLoading(true);
    fetch(`/api/agents?owner=${ownerAddress}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setAgentId(data.id);
          setAgentWalletAddress(data.agentWalletAddress || null);
          setTelegramTokenSaved(!!data.telegramTokenSaved);
          setTelegramConnected(!!data.telegramConnected);
        } else {
          setAgentId(null);
          setAgentWalletAddress(null);
          setTelegramTokenSaved(false);
          setTelegramConnected(false);
        }
      })
      .catch(() => {
        setAgentId(null);
        setAgentWalletAddress(null);
        setTelegramTokenSaved(false);
        setTelegramConnected(false);
      })
      .finally(() => setApiLoading(false));
  }, [ownerAddress, fetchKey]);

  // On-chain: getDelegation(owner, agentWallet)
  const walletAddr = agentWalletAddress as `0x${string}` | undefined;
  const { data: delegationData, isLoading: delegationLoading } = useReadContract({
    address: addresses.delegateRegistry,
    abi: DELEGATE_REGISTRY_ABI,
    functionName: "getDelegation",
    args: ownerAddress && walletAddr ? [ownerAddress, walletAddr] : undefined,
    query: {
      enabled: isDeployed && !!ownerAddress && !!walletAddr,
    },
  });

  // On-chain: VoteRelayFund.balances(agentWallet)
  const voteRelayFundAddress = addresses.voteRelayFund;
  const { data: gasBalance, isLoading: gasLoading } = useReadContract({
    address: voteRelayFundAddress,
    abi: VOTE_RELAY_FUND_ABI,
    functionName: "balances",
    args: walletAddr ? [walletAddr] : undefined,
    query: {
      enabled: isDeployed && !!voteRelayFundAddress && !!walletAddr,
    },
  });

  const hasDelegation = useMemo(() => {
    if (!delegationData) return false;
    const delegation = delegationData as { amount?: bigint };
    return (delegation.amount ?? BigInt(0)) > BigInt(0);
  }, [delegationData]);

  const hasGasDeposit = useMemo(() => {
    if (gasBalance === undefined || gasBalance === null) return false;
    return (gasBalance as bigint) > BigInt(0);
  }, [gasBalance]);

  const isLoading = apiLoading || (!!walletAddr && (delegationLoading || gasLoading));

  const firstIncompleteStep: WizardStep = useMemo(() => {
    if (!agentId) return "create";
    if (!hasDelegation) return "delegate";
    if (!hasGasDeposit) return "deposit";
    if (!telegramConnected) return "telegram";
    return "complete";
  }, [agentId, hasDelegation, hasGasDeposit, telegramConnected]);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  return {
    isLoading,
    agentId,
    agentWalletAddress,
    telegramTokenSaved,
    telegramConnected,
    hasDelegation,
    hasGasDeposit,
    firstIncompleteStep,
    refetch,
  };
}

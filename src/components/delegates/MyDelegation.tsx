"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { formatVTON } from "@/lib/utils";
import { useVTONBalance } from "@/hooks/contracts/useVTON";
import { useWalletConnection } from "@/hooks/useWalletConnection";

/**
 * My Delegation Section
 * Shows user's current delegation status and allows managing delegation
 * Note: Users can view their delegation by selecting a delegate from the list
 */
export function MyDelegation() {
  const { address, isConnected, isReady } = useWalletConnection();

  const { data: vtonBalance, isDeployed } = useVTONBalance(address);

  // Loading state (waiting for hydration and connection restore)
  if (!isReady) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] animate-pulse">
        <div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded" />
        <div className="h-4 w-32 bg-[var(--bg-tertiary)] rounded" />
      </div>
    );
  }

  // Not connected state - compact banner
  if (!isConnected || !address) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <span className="text-sm font-medium text-[var(--text-primary)]">My Delegation</span>
        <Badge variant="warning" size="sm">
          Not Connected
        </Badge>
        <span className="text-sm text-[var(--text-tertiary)]">
          Connect your wallet to view your delegation status
        </span>
      </div>
    );
  }

  // Show balance and delegation info - compact banner
  const hasBalance = vtonBalance && vtonBalance > BigInt(0);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <span className="text-sm font-medium text-[var(--text-primary)]">My Delegation</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-tertiary)]">vTON Balance</span>
        <span className="text-sm font-bold text-[var(--text-primary)]">
          {formatVTON(vtonBalance ?? BigInt(0))} vTON
        </span>
      </div>
      {!isDeployed && (
        <span className="text-xs text-[var(--text-tertiary)]">(contracts not deployed)</span>
      )}
      <span className="text-xs text-[var(--text-tertiary)]">
        {hasBalance
          ? "Select a delegate below to delegate your vTON."
          : "Acquire vTON to delegate and participate in governance."}
      </span>
    </div>
  );
}

"use client";

import * as React from "react";
import { cn, formatVTON } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { AddressAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface DelegateDetailCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  address: `0x${string}`;
  ensName?: string;
  avatarUrl?: string;
  votingPower: bigint | string | number;
  tokenSymbol?: string;
  rank?: number;
  onDelegate?: () => void;
  isCurrentDelegate?: boolean;
}

/**
 * Extended delegate card with delegate action button
 */
const DelegateDetailCard = React.forwardRef<
  HTMLDivElement,
  DelegateDetailCardProps
>(
  (
    {
      className,
      address,
      ensName,
      avatarUrl,
      votingPower,
      tokenSymbol = "vTON",
      rank,
      onDelegate,
      isCurrentDelegate,
      ...props
    },
    ref
  ) => {
    const displayName = ensName || address;
    const formattedVotingPower =
      typeof votingPower === "bigint"
        ? formatVTON(votingPower, { compact: true })
        : formatVTON(BigInt(votingPower || 0), { compact: true });

    return (
      <Card
        ref={ref}
        padding="none"
        className={cn("p-4", className)}
        {...props}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {rank && (
              <span className="text-sm font-medium text-[var(--text-tertiary)] w-6 text-center">
                {rank}
              </span>
            )}
            <AddressAvatar address={address} src={avatarUrl} size="md" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {displayName}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {formattedVotingPower} {tokenSymbol}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCurrentDelegate ? (
              <span className="text-xs text-[var(--text-brand)] font-medium px-2 py-1 bg-[var(--bg-brand-subtle)] rounded">
                Your Delegate
              </span>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelegate?.();
                }}
              >
                Delegate
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }
);
DelegateDetailCard.displayName = "DelegateDetailCard";

export { DelegateDetailCard };

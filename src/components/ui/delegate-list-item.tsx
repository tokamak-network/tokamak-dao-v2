"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AddressAvatar } from "./avatar";

export interface DelegateListItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  address: string;
  ensName?: string;
  avatarUrl?: string;
  votingPower: string | number;
  tokenSymbol?: string;
  rank?: number;
}

/**
 * Truncate address to 0x1234...5678 format
 */
const truncateAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Compact delegate list item for dashboard display
 */
const DelegateListItem = React.forwardRef<HTMLDivElement, DelegateListItemProps>(
  (
    {
      className,
      address,
      ensName,
      avatarUrl,
      votingPower,
      tokenSymbol = "vTON",
      rank,
      ...props
    },
    ref
  ) => {
    const displayName = ensName || truncateAddress(address);

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 py-2",
          "border-b border-[var(--border-secondary)] last:border-b-0",
          "hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer",
          className
        )}
        {...props}
      >
        {/* Rank */}
        {rank !== undefined && (
          <span className="text-xs font-medium text-[var(--text-tertiary)] w-4 text-center shrink-0">
            {rank}
          </span>
        )}

        {/* Avatar */}
        <AddressAvatar
          address={address}
          src={avatarUrl}
          size="xs"
          className="shrink-0"
        />

        {/* Address/Name */}
        <span className="flex-1 min-w-0 text-sm font-medium text-[var(--text-primary)] truncate">
          {displayName}
        </span>

        {/* Voting Power */}
        <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap shrink-0">
          {votingPower} {tokenSymbol}
        </span>
      </div>
    );
  }
);
DelegateListItem.displayName = "DelegateListItem";

export { DelegateListItem };

"use client";

import * as React from "react";
import { cn, formatAddress } from "@/lib/utils";
import { Card } from "./card";
import { AddressAvatar } from "./avatar";

export interface DelegateCardProps extends React.HTMLAttributes<HTMLDivElement> {
  address: string;
  ensName?: string;
  avatarUrl?: string;
  votingPower: string | number;
  tokenSymbol?: string;
  rank?: number;
}

const DelegateCard = React.forwardRef<HTMLDivElement, DelegateCardProps>(
  (
    {
      className,
      address,
      ensName,
      avatarUrl,
      votingPower,
      tokenSymbol = "W3K23",
      rank,
      ...props
    },
    ref
  ) => {
    const displayName = ensName || formatAddress(address);

    return (
      <Card
        ref={ref}
        padding="none"
        interactive
        className={cn("p-4", className)}
        {...props}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {rank && (
              <span className="text-sm font-medium text-[var(--text-tertiary)] w-5">
                {rank}
              </span>
            )}
            <AddressAvatar
              address={address}
              src={avatarUrl}
              size="sm"
            />
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {displayName}
            </span>
          </div>
          <span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
            {votingPower} {tokenSymbol}
          </span>
        </div>
      </Card>
    );
  }
);
DelegateCard.displayName = "DelegateCard";

export { DelegateCard };

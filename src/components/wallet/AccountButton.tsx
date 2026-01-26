"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AddressAvatar } from "@/components/ui/avatar";

export interface AccountButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  address: string;
  displayAddress: string;
  displayBalance?: string;
  ensAvatar?: string;
}

/**
 * AccountButton - Displays connected wallet info
 * Shows balance + avatar + truncated address
 * Triggers RainbowKit's account modal on click
 */
export const AccountButton = React.forwardRef<
  HTMLButtonElement,
  AccountButtonProps
>(
  (
    { address, displayAddress, displayBalance, ensAvatar, className, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center gap-2 h-10 pl-3 pr-2",
          "rounded-full",
          "bg-[var(--bg-secondary)] border border-[var(--border-primary)]",
          "font-medium text-sm text-[var(--text-primary)]",
          "transition-all duration-[var(--duration-fast)] ease-[var(--ease-default)]",
          "hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-secondary)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "focus-visible:ring-[var(--color-primary-500)]",
          className
        )}
        {...props}
      >
        {/* Balance */}
        {displayBalance && (
          <span className="text-[var(--text-secondary)]">{displayBalance}</span>
        )}

        {/* Divider */}
        {displayBalance && (
          <span className="w-px h-5 bg-[var(--border-primary)]" />
        )}

        {/* Avatar + Address */}
        <span className="inline-flex items-center gap-2">
          <span className="text-[var(--text-primary)]">{displayAddress}</span>
          <AddressAvatar
            address={address}
            src={ensAvatar}
            size="xs"
            className="border-none"
          />
        </span>
      </button>
    );
  }
);
AccountButton.displayName = "AccountButton";

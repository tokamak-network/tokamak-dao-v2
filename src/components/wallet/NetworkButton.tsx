"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface NetworkButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  chainName: string;
  chainIcon?: string;
  hasIcon: boolean;
  isError?: boolean;
}

/**
 * NetworkButton - Displays current network with icon
 * Triggers RainbowKit's chain modal on click
 */
export const NetworkButton = React.forwardRef<
  HTMLButtonElement,
  NetworkButtonProps
>(({ chainName, chainIcon, hasIcon, isError, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center gap-2 h-10 px-3",
        "rounded-lg border",
        "font-medium text-sm",
        "transition-all duration-[var(--duration-fast)] ease-[var(--ease-default)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "focus-visible:ring-[var(--color-primary-500)]",
        isError
          ? [
              "bg-[var(--color-error-50)] border-[var(--color-error-200)]",
              "text-[var(--color-error-700)]",
              "hover:bg-[var(--color-error-100)]",
              "dark:bg-[var(--color-error-950)] dark:border-[var(--color-error-800)]",
              "dark:text-[var(--color-error-400)]",
            ]
          : [
              "bg-[var(--bg-secondary)] border-[var(--border-primary)]",
              "text-[var(--text-primary)]",
              "hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-secondary)]",
            ],
        className
      )}
      {...props}
    >
      {hasIcon && chainIcon && (
        <img
          src={chainIcon}
          alt={chainName}
          className="size-5 rounded-full"
        />
      )}
      <span>{chainName}</span>
      {/* Dropdown indicator */}
      <svg
        className="size-4 text-[var(--text-tertiary)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
});
NetworkButton.displayName = "NetworkButton";

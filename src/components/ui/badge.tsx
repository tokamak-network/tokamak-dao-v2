"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge component variants
 */
const badgeVariants = cva(
  [
    "inline-flex items-center justify-center",
    "font-medium",
    "rounded-[var(--badge-radius)]",
    "text-xs",
    "whitespace-nowrap",
    "select-none",
  ],
  {
    variants: {
      variant: {
        default: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
        primary: "bg-[var(--bg-brand-subtle)] text-[var(--text-brand)]",
        success: "bg-[var(--status-success-bg)] text-[var(--status-success-fg)]",
        warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]",
        error: "bg-[var(--status-error-bg)] text-[var(--status-error-fg)]",
        info: "bg-[var(--status-info-bg)] text-[var(--status-info-fg)]",
        outline: [
          "bg-transparent",
          "border border-[var(--border-primary)]",
          "text-[var(--text-secondary)]",
        ],
      },
      size: {
        sm: "text-[10px] px-[var(--space-2)] py-[var(--space-0-5)]",
        md: "text-xs px-[var(--space-2-5)] py-[var(--space-1)]",
        lg: "text-sm px-[var(--space-3)] py-[var(--space-1-5)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

/**
 * Proposal status types
 */
type ProposalStatus =
  | "active"
  | "pending"
  | "executed"
  | "defeated"
  | "canceled"
  | "queued"
  | "succeeded"
  | "expired";

/**
 * Status configuration mapping
 */
const statusConfig: Record<
  ProposalStatus,
  { variant: NonNullable<BadgeProps["variant"]>; label: string }
> = {
  active: { variant: "info", label: "ACTIVE" },
  pending: { variant: "warning", label: "PENDING" },
  executed: { variant: "success", label: "EXECUTED" },
  defeated: { variant: "error", label: "DEFEATED" },
  canceled: { variant: "error", label: "CANCELED" },
  queued: { variant: "warning", label: "QUEUED" },
  succeeded: { variant: "success", label: "SUCCEEDED" },
  expired: { variant: "error", label: "EXPIRED" },
} as const;

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: ProposalStatus;
}

/**
 * Proposal status badge with predefined styling
 */
const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const config = statusConfig[status];
    return (
      <Badge
        ref={ref}
        variant={config.variant}
        className={cn("uppercase tracking-[var(--letter-spacing-wide)]", className)}
        role="status"
        {...props}
      >
        {config.label}
      </Badge>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { Badge, StatusBadge, badgeVariants };

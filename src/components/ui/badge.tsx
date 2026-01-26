"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center",
    "font-medium",
    "rounded-[var(--badge-radius)]",
    "px-[var(--badge-padding-x)] py-[var(--badge-padding-y)]",
    "text-xs",
    "whitespace-nowrap",
  ],
  {
    variants: {
      variant: {
        default: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
        primary: "bg-[var(--bg-brand-subtle)] text-[var(--text-brand)]",
        success: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
        warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
        error: "bg-[var(--status-error-bg)] text-[var(--status-error-text)]",
        info: "bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
        outline: [
          "bg-transparent",
          "border border-[var(--border-default)]",
          "text-[var(--text-secondary)]",
        ],
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-2.5 py-1",
        lg: "text-sm px-3 py-1.5",
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

// Proposal Status Badge with predefined statuses
type ProposalStatus =
  | "active"
  | "pending"
  | "executed"
  | "failed"
  | "canceled"
  | "queued";

const statusConfig: Record<
  ProposalStatus,
  { variant: BadgeProps["variant"]; label: string }
> = {
  active: { variant: "info", label: "ACTIVE" },
  pending: { variant: "warning", label: "PENDING EXECUTION" },
  executed: { variant: "success", label: "EXECUTED" },
  failed: { variant: "error", label: "FAILED" },
  canceled: { variant: "error", label: "CANCELED" },
  queued: { variant: "warning", label: "QUEUED" },
};

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: ProposalStatus;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const config = statusConfig[status];
    return (
      <Badge
        ref={ref}
        variant={config.variant}
        className={cn("uppercase tracking-wider", className)}
        {...props}
      >
        {config.label}
      </Badge>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { Badge, StatusBadge, badgeVariants };

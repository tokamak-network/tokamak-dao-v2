"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Card } from "./card";

const statCardVariants = cva(
  ["flex flex-col gap-1"],
  {
    variants: {
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  interactive?: boolean;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      size,
      label,
      value,
      description,
      icon,
      trend,
      interactive = false,
      ...props
    },
    ref
  ) => {
    return (
      <Card
        ref={ref}
        padding="none"
        interactive={interactive}
        className={cn(statCardVariants({ size, className }))}
        {...props}
      >
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </span>
          {icon && (
            <span className="text-[var(--text-tertiary)]">{icon}</span>
          )}
          {interactive && (
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[var(--text-primary)]">
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                "text-sm font-medium",
                trend.isPositive
                  ? "text-[var(--status-success)]"
                  : "text-[var(--status-error)]"
              )}
            >
              {trend.isPositive ? "+" : "-"}
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {description && (
          <span className="text-sm text-[var(--text-tertiary)]">
            {description}
          </span>
        )}
      </Card>
    );
  }
);
StatCard.displayName = "StatCard";

export { StatCard, statCardVariants };

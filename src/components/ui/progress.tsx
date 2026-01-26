"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, indicatorClassName, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={cn(
          "h-[var(--progress-height)] w-full overflow-hidden rounded-[var(--progress-radius)] bg-[var(--progress-bg)]",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full transition-all duration-[var(--duration-slow)] ease-[var(--ease-out)]",
            "bg-[var(--interactive-primary)]",
            indicatorClassName
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

// Voting Progress Bar (For / Against / Abstain)
export interface VotingProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  forVotes: number;
  againstVotes: number;
  abstainVotes?: number;
  showLabels?: boolean;
}

const VotingProgress = React.forwardRef<HTMLDivElement, VotingProgressProps>(
  (
    {
      className,
      forVotes,
      againstVotes,
      abstainVotes = 0,
      showLabels = false,
      ...props
    },
    ref
  ) => {
    const total = forVotes + againstVotes + abstainVotes;
    const forPercentage = total > 0 ? (forVotes / total) * 100 : 0;
    const againstPercentage = total > 0 ? (againstVotes / total) * 100 : 0;
    const abstainPercentage = total > 0 ? (abstainVotes / total) * 100 : 0;

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {showLabels && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-[var(--color-vote-for)]">{forVotes}</span>
              <span className="text-[var(--text-tertiary)]">•</span>
              <span className="text-[var(--color-vote-against)]">{againstVotes}</span>
              {abstainVotes > 0 && (
                <>
                  <span className="text-[var(--text-tertiary)]">•</span>
                  <span className="text-[var(--color-vote-abstain)]">{abstainVotes}</span>
                </>
              )}
            </div>
            <span className="text-[var(--text-secondary)]">{total}</span>
          </div>
        )}
        <div
          role="progressbar"
          aria-label="Voting progress"
          className={cn(
            "flex h-2 w-full overflow-hidden rounded-[var(--progress-radius)] bg-[var(--progress-bg)]"
          )}
        >
          {forPercentage > 0 && (
            <div
              className="h-full bg-[var(--color-vote-for)] transition-all duration-[var(--duration-slow)]"
              style={{ width: `${forPercentage}%` }}
            />
          )}
          {againstPercentage > 0 && (
            <div
              className="h-full bg-[var(--color-vote-against)] transition-all duration-[var(--duration-slow)]"
              style={{ width: `${againstPercentage}%` }}
            />
          )}
          {abstainPercentage > 0 && (
            <div
              className="h-full bg-[var(--color-vote-abstain)] transition-all duration-[var(--duration-slow)]"
              style={{ width: `${abstainPercentage}%` }}
            />
          )}
        </div>
      </div>
    );
  }
);
VotingProgress.displayName = "VotingProgress";

export { Progress, VotingProgress };

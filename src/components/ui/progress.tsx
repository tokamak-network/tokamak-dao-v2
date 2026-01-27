"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
}

/**
 * Calculate percentage with bounds checking
 */
const calculatePercentage = (value: number, max: number): number =>
  Math.min(Math.max((value / max) * 100, 0), 100);

/**
 * Basic progress bar component
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, indicatorClassName, ...props }, ref) => {
    const percentage = calculatePercentage(value, max);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={`${Math.round(percentage)}% complete`}
        className={cn(
          "h-[var(--progress-height)] w-full overflow-hidden",
          "rounded-[var(--progress-radius)] bg-[var(--progress-bg)]",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full transition-all duration-[var(--duration-slow)] ease-[var(--ease-out)]",
            "bg-[var(--fg-brand-primary)]",
            indicatorClassName
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

/**
 * Voting progress bar props
 */
export interface VotingProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  forVotes: number;
  againstVotes: number;
  abstainVotes?: number;
  showLabels?: boolean;
}

/**
 * Vote segment component
 */
const VoteSegment = ({
  percentage,
  color,
  label,
}: {
  percentage: number;
  color: string;
  label: string;
}) =>
  percentage > 0 ? (
    <div
      className={cn(
        "h-full transition-all duration-[var(--duration-slow)]",
        color
      )}
      style={{ width: `${percentage}%` }}
      role="presentation"
      aria-label={`${label}: ${Math.round(percentage)}%`}
    />
  ) : null;

/**
 * Voting progress bar with For/Against/Abstain segments
 */
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
      <div ref={ref} className={cn("space-y-[var(--space-2)]", className)} {...props}>
        {showLabels && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-[var(--space-4)]">
              <span className="text-[var(--color-vote-for)] font-medium">{forVotes}</span>
              <span className="text-[var(--text-tertiary)]" aria-hidden="true">•</span>
              <span className="text-[var(--color-vote-against)] font-medium">{againstVotes}</span>
              {abstainVotes > 0 && (
                <>
                  <span className="text-[var(--text-tertiary)]" aria-hidden="true">•</span>
                  <span className="text-[var(--color-vote-abstain)] font-medium">{abstainVotes}</span>
                </>
              )}
            </div>
            <span className="text-[var(--text-secondary)]">{total} total</span>
          </div>
        )}
        <div
          role="progressbar"
          aria-label={`Voting progress: ${Math.round(forPercentage)}% for, ${Math.round(againstPercentage)}% against${abstainVotes > 0 ? `, ${Math.round(abstainPercentage)}% abstain` : ""}`}
          aria-valuenow={total}
          className="flex h-2 w-full overflow-hidden rounded-[var(--progress-radius)] bg-[var(--progress-bg)]"
        >
          <VoteSegment percentage={forPercentage} color="bg-[var(--color-vote-for)]" label="For" />
          <VoteSegment percentage={againstPercentage} color="bg-[var(--color-vote-against)]" label="Against" />
          <VoteSegment percentage={abstainPercentage} color="bg-[var(--color-vote-abstain)]" label="Abstain" />
        </div>
      </div>
    );
  }
);
VotingProgress.displayName = "VotingProgress";

export { Progress, VotingProgress };

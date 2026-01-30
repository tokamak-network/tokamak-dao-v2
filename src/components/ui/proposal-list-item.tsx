"use client";

import * as React from "react";
import { cn, formatNumber } from "@/lib/utils";
import { StatusBadge } from "./badge";
import { VotingProgress } from "./progress";

type ProposalStatus =
  | "active"
  | "pending"
  | "executed"
  | "failed"
  | "canceled"
  | "queued"
  | "succeeded"
  | "expired";

export interface ProposalListItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  title: string;
  status?: ProposalStatus;
  showStatus?: boolean;
  forVotes: number;
  againstVotes: number;
  abstainVotes?: number;
}

/**
 * Compact proposal list item for dashboard display
 */
const ProposalListItem = React.forwardRef<HTMLDivElement, ProposalListItemProps>(
  (
    {
      className,
      id,
      title,
      status,
      showStatus = false,
      forVotes,
      againstVotes,
      abstainVotes = 0,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 py-3",
          "border-b border-[var(--border-secondary)] last:border-b-0",
          "hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer",
          className
        )}
        {...props}
      >
        {/* Status Badge (optional) */}
        {showStatus && status && (
          <StatusBadge status={status} size="sm" className="shrink-0" />
        )}

        {/* Title */}
        <span className="flex-1 min-w-0 text-sm font-medium text-[var(--text-primary)] truncate">
          {title}
        </span>

        {/* Vote counts */}
        <div className="flex items-center gap-1 text-xs whitespace-nowrap shrink-0">
          <span className="text-[var(--color-vote-for)]">
            {formatNumber(forVotes, { compact: true })}
          </span>
          <span className="text-[var(--text-tertiary)]">/</span>
          <span className="text-[var(--color-vote-against)]">
            {formatNumber(againstVotes, { compact: true })}
          </span>
          <span className="text-[var(--text-tertiary)]">/</span>
          <span className="text-[var(--color-vote-abstain)]">
            {formatNumber(abstainVotes, { compact: true })}
          </span>
        </div>

        {/* Progress bar - hidden on mobile */}
        <div className="hidden sm:block w-16 shrink-0">
          <VotingProgress
            forVotes={forVotes}
            againstVotes={againstVotes}
            abstainVotes={abstainVotes}
          />
        </div>
      </div>
    );
  }
);
ProposalListItem.displayName = "ProposalListItem";

export { ProposalListItem };

"use client";

import * as React from "react";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { Card } from "./card";
import { StatusBadge } from "./badge";
import { VotingProgress } from "./progress";

type ProposalStatus =
  | "active"
  | "pending"
  | "executed"
  | "defeated"
  | "canceled"
  | "queued"
  | "succeeded"
  | "expired";

export interface ProposalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  title: string;
  status: ProposalStatus;
  date: Date | string;
  forVotes: number;
  againstVotes: number;
  abstainVotes?: number;
  totalVoters?: number;
  infoIcon?: boolean;
}

const ProposalCard = React.forwardRef<HTMLDivElement, ProposalCardProps>(
  (
    {
      className,
      id,
      title,
      status,
      date,
      forVotes,
      againstVotes,
      abstainVotes = 0,
      totalVoters,
      infoIcon = false,
      ...props
    },
    ref
  ) => {
    const totalVotes = forVotes + againstVotes + abstainVotes;

    return (
      <Card
        ref={ref}
        padding="none"
        interactive
        className={cn("p-5", className)}
        {...props}
      >
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-[var(--text-primary)] truncate">
                  {title}
                </h3>
                {infoIcon && (
                  <svg
                    className="size-4 text-[var(--text-tertiary)] shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={status} size="sm" />
                <span className="text-sm text-[var(--text-tertiary)]">
                  {formatDate(date)}
                </span>
              </div>
            </div>

            {/* Vote counts */}
            <div className="text-right shrink-0">
              {totalVotes > 0 ? (
                <>
                  <div className="flex items-center justify-end gap-1 text-sm whitespace-nowrap">
                    <span className="text-[var(--color-vote-for)]">{formatNumber(forVotes, { compact: true })}</span>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-vote-against)]">{formatNumber(againstVotes, { compact: true })}</span>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span className="text-[var(--color-vote-abstain)]">{formatNumber(abstainVotes, { compact: true })}</span>
                  </div>
                  <div className="text-sm text-[var(--text-secondary)] mt-0.5">
                    <span className="font-medium">{formatNumber(totalVotes, { compact: true })}</span>
                  </div>
                  {totalVoters !== undefined && totalVoters > 0 && (
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {formatNumber(totalVoters, { compact: true })} addresses
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-[var(--text-tertiary)]">
                  No votes yet
                </div>
              )}
            </div>
          </div>

          {/* Progress bar - only show when there are votes */}
          {totalVotes > 0 && (
            <VotingProgress
              forVotes={forVotes}
              againstVotes={againstVotes}
              abstainVotes={abstainVotes}
            />
          )}
        </div>
      </Card>
    );
  }
);
ProposalCard.displayName = "ProposalCard";

export { ProposalCard };

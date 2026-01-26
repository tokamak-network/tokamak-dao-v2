"use client";

import * as React from "react";
import { cn, formatDate } from "@/lib/utils";
import type { ProposalStatus } from "@/types/governance";

interface TimelineEvent {
  label: string;
  date: Date | null;
  status: "completed" | "current" | "upcoming";
}

export interface ProposalTimelineProps {
  className?: string;
  proposalStatus: ProposalStatus;
  createdAt: Date;
  votingStartsAt: Date;
  votingEndsAt: Date;
  executedAt?: Date;
  queuedAt?: Date;
}

export function ProposalTimeline({
  className,
  proposalStatus,
  createdAt,
  votingStartsAt,
  votingEndsAt,
  executedAt,
  queuedAt,
}: ProposalTimelineProps) {
  const events: TimelineEvent[] = React.useMemo(() => {
    const now = new Date();

    const getStatus = (date: Date, isComplete: boolean): TimelineEvent["status"] => {
      if (isComplete) return "completed";
      if (date <= now) return "current";
      return "upcoming";
    };

    const baseEvents: TimelineEvent[] = [
      {
        label: "Created",
        date: createdAt,
        status: "completed",
      },
      {
        label: "Voting Starts",
        date: votingStartsAt,
        status: getStatus(votingStartsAt, votingStartsAt < now),
      },
      {
        label: "Voting Ends",
        date: votingEndsAt,
        status: getStatus(votingEndsAt, votingEndsAt < now),
      },
    ];

    // Add queued event if applicable
    if (queuedAt || proposalStatus === "queued") {
      baseEvents.push({
        label: "Queued",
        date: queuedAt || null,
        status: queuedAt ? "completed" : proposalStatus === "queued" ? "current" : "upcoming",
      });
    }

    // Add execution event if applicable
    if (executedAt || proposalStatus === "executed" || proposalStatus === "queued") {
      baseEvents.push({
        label: "Executed",
        date: executedAt || null,
        status: executedAt ? "completed" : "upcoming",
      });
    }

    return baseEvents;
  }, [proposalStatus, createdAt, votingStartsAt, votingEndsAt, executedAt, queuedAt]);

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-medium text-[var(--text-primary)]">Timeline</h3>
      <div className="relative">
        {events.map((event, index) => (
          <div key={event.label} className="flex items-start gap-3 pb-4 last:pb-0">
            {/* Vertical line */}
            {index < events.length - 1 && (
              <div
                className={cn(
                  "absolute left-[7px] top-4 w-0.5 h-[calc(100%-16px)]",
                  event.status === "completed"
                    ? "bg-[var(--color-success-500)]"
                    : "bg-[var(--border-default)]"
                )}
                style={{
                  top: `${index * 40 + 16}px`,
                  height: "24px",
                }}
              />
            )}

            {/* Dot */}
            <div
              className={cn(
                "relative z-10 mt-0.5 size-4 rounded-full border-2 shrink-0",
                event.status === "completed" &&
                  "bg-[var(--color-success-500)] border-[var(--color-success-500)]",
                event.status === "current" &&
                  "bg-[var(--bg-primary)] border-[var(--color-primary-500)]",
                event.status === "upcoming" &&
                  "bg-[var(--bg-primary)] border-[var(--border-default)]"
              )}
            >
              {event.status === "completed" && (
                <svg
                  className="absolute inset-0 m-auto size-2.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  event.status === "upcoming"
                    ? "text-[var(--text-tertiary)]"
                    : "text-[var(--text-primary)]"
                )}
              >
                {event.label}
              </p>
              {event.date && (
                <p className="text-xs text-[var(--text-tertiary)]">
                  {formatDate(event.date, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

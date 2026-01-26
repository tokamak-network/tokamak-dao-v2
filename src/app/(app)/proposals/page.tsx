"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProposalsList } from "@/components/proposals/ProposalsList";

/**
 * Proposals Page
 *
 * Displays:
 * - List of all governance proposals
 * - Proposal details and voting status
 * - Ability to vote on active proposals
 */
export default function ProposalsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Proposals
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            View and vote on governance proposals
          </p>
        </div>

        <Button asChild>
          <Link href="/proposals/create">
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Create Proposal
          </Link>
        </Button>
      </div>

      {/* Proposals List */}
      <ProposalsList />
    </div>
  );
}

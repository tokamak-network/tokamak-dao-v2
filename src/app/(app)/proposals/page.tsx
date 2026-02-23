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
      {/* Hero Section */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 py-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
            Tokamak DAO
          </h1>
          <p className="text-base text-[var(--text-secondary)] max-w-lg">
            Participate in Tokamak Network governance. Vote on proposals,
            delegate your vTON, and shape the future of the protocol.
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
      </section>

      {/* Proposals List */}
      <ProposalsList />
    </div>
  );
}

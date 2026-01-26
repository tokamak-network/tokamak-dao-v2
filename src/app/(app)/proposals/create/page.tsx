"use client";

import Link from "next/link";
import { CreateProposalForm } from "@/components/proposals/CreateProposalForm";

/**
 * Create Proposal Page
 *
 * Allows users to create new governance proposals
 */
export default function CreateProposalPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/proposals"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
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
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Back to Proposals
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Create Proposal
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Submit a new governance proposal for the community to vote on
        </p>
      </div>

      {/* Form */}
      <CreateProposalForm />
    </div>
  );
}

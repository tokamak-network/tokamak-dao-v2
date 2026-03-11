"use client";

import Link from "next/link";
import { CreateProposalForm } from "@/components/proposals/CreateProposalForm";
import { useCompanion, CharacterAvatar } from "@/components/companion";

/**
 * Create Proposal Page
 *
 * Allows users to create new governance proposals
 */
export default function CreateProposalPage() {
  const { isExpanded, setIsExpanded } = useCompanion();

  return (
    <div className="space-y-6">
      {/* Back link + Companion CTA */}
      <div className="relative">
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

        {/* Companion CTA — same style as ProposalDetail, hidden when panel is open */}
        {!isExpanded && <button
          onClick={() => setIsExpanded(true)}
          className="group absolute right-0 top-0 flex items-start cursor-pointer transition-transform duration-200 hover:scale-[1.03]"
        >
          <div className="relative px-5 py-3 rounded-2xl bg-[var(--companion-bg,var(--bg-secondary))] border border-[var(--border-default)] text-base font-medium text-[var(--text-secondary)] group-hover:border-[var(--border-hover)] group-hover:text-[var(--text-primary)] transition-colors shadow-lg mr-2 mt-2">
            Need help creating a proposal?
            <svg className="absolute -right-[10px] -bottom-[6px] w-4 h-4 transition-colors scale-x-[-1]" viewBox="0 0 16 16" fill="none">
              <path d="M16 0 C12 4 4 6 0 16 C2 10 6 6 16 0Z" fill="var(--companion-bg,var(--bg-secondary))" />
              <path d="M16 0 C12 4 4 6 0 16" stroke="var(--border-default)" strokeWidth="1" className="group-hover:[stroke:var(--border-hover)] transition-colors" />
            </svg>
          </div>
          <CharacterAvatar size="lg" className="!w-16 !h-16 !border-[3px] flex-shrink-0" />
        </button>}
      </div>

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

"use client";

import Link from "next/link";
import { AgentRegisterForm } from "@/components/agents/AgentRegisterForm";

export default function AgentRegisterPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="py-4">
        <Link
          href="/agents"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Agents
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
          Register Agent
        </h1>
        <p className="text-base text-[var(--text-secondary)] max-w-lg">
          Register a new AI agent on-chain via the ERC-8004 Identity Registry
        </p>
      </section>

      {/* Registration Form */}
      <section>
        <AgentRegisterForm />
      </section>
    </div>
  );
}

"use client";

import { DelegatesList } from "@/components/delegates";

/**
 * Voters Page (formerly Delegates/Holders)
 *
 * Displays:
 * - List of all registered delegates (agents auto-registered as delegates)
 * - Ability to delegate/undelegate vTON
 */
export default function VotersPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 py-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
            Voters
          </h1>
          <p className="text-base text-[var(--text-secondary)] max-w-lg">
            vTON voters and delegates participating in governance
          </p>
        </div>
      </section>

      {/* All Delegates */}
      <section>
        <DelegatesList />
      </section>
    </div>
  );
}

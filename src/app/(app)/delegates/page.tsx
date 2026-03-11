"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { DelegatesList, DelegateRegistrationModal } from "@/components/delegates";
import { Button } from "@/components/ui/button";
import { useDelegateInfo } from "@/hooks/contracts/useDelegateRegistry";
import { useVTONBalance } from "@/hooks/contracts/useVTON";
import { formatVTON } from "@/lib/utils";

/**
 * Delegates Page
 *
 * Displays:
 * - User's current delegation status
 * - List of all registered delegates
 * - Ability to delegate/undelegate vTON
 * - Option to register as a delegate
 *
 * Key rules:
 * - vTON holders cannot vote directly, must delegate
 * - Delegation cap: 20% of total supply
 * - Minimum delegation period: 7 days
 */
export default function DelegatesPage() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const { data: delegateInfo, isLoading, refetch } = useDelegateInfo(address);
  const { data: vtonBalance } = useVTONBalance(address);
  const [registrationModalOpen, setRegistrationModalOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Only check connection after mounting to avoid hydration mismatch
  const ready = mounted && isConnected;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 py-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
            Delegates
          </h1>
          <p className="text-base text-[var(--text-secondary)] max-w-lg">
            Delegate your vTON to participate in governance voting
          </p>
        </div>
        {ready && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <span className="text-xs text-[var(--text-tertiary)]">vTON</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {formatVTON(vtonBalance ?? BigInt(0))}
              </span>
            </div>
            <Button
              onClick={() => setRegistrationModalOpen(true)}
              loading={isLoading}
              disabled={delegateInfo && delegateInfo.registeredAt > BigInt(0) && delegateInfo.isActive}
            >
              {delegateInfo && delegateInfo.registeredAt > BigInt(0) && delegateInfo.isActive
                ? "Already Registered"
                : "Become a Delegate"}
            </Button>
          </div>
        )}
      </section>

      {/* All Delegates */}
      <section>
        <DelegatesList />
      </section>

      {/* Delegate Registration Modal */}
      <DelegateRegistrationModal
        open={registrationModalOpen}
        onClose={() => setRegistrationModalOpen(false)}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["readContract"] });
        }}
      />
    </div>
  );
}

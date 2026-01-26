"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { MyDelegation, DelegatesList, DelegatorRegistrationModal } from "@/components/delegates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDelegatorInfo } from "@/hooks/contracts/useDelegateRegistry";

/**
 * Delegates Page
 *
 * Displays:
 * - User's current delegation status
 * - List of all registered delegates
 * - Ability to delegate/undelegate vTON
 * - Option to register as a delegator
 *
 * Key rules:
 * - vTON holders cannot vote directly, must delegate
 * - Delegation cap: 20% of total supply
 * - Minimum delegation period: 7 days
 */
export default function DelegatesPage() {
  const { address, isConnected } = useAccount();
  const { data: delegatorInfo, isLoading } = useDelegatorInfo(address);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Delegates
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Delegate your vTON to participate in governance voting
          </p>
        </div>
        {ready && (
          <div className="flex items-center gap-2">
            {delegatorInfo?.isRegistered ? (
              <Badge variant="success">Registered Delegator</Badge>
            ) : (
              <Button
                onClick={() => setRegistrationModalOpen(true)}
                loading={isLoading}
              >
                Register as Delegator
              </Button>
            )}
          </div>
        )}
      </div>

      {/* My Delegation Status */}
      <section>
        <MyDelegation />
      </section>

      {/* All Delegates */}
      <section>
        <DelegatesList />
      </section>

      {/* Delegator Registration Modal */}
      <DelegatorRegistrationModal
        open={registrationModalOpen}
        onClose={() => setRegistrationModalOpen(false)}
      />
    </div>
  );
}

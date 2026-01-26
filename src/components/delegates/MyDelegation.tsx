"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddressAvatar } from "@/components/ui/avatar";
import { formatAddress, formatVTON } from "@/lib/utils";
import { useVTONBalance } from "@/hooks/contracts/useVTON";
import { useDelegation, useDelegationParams } from "@/hooks/contracts/useDelegateRegistry";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { DelegationModal } from "./DelegationModal";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * My Delegation Section
 * Shows user's current delegation status and allows managing delegation
 */
export function MyDelegation() {
  const { address, isConnected, isReady } = useWalletConnection();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"delegate" | "undelegate">("delegate");

  const { data: vtonBalance, isDeployed } = useVTONBalance(address);
  const { data: delegation } = useDelegation(address);
  const { delegationPeriodRequirement } = useDelegationParams();

  const delegatee =
    delegation && typeof delegation === "object" && "delegatee" in delegation
      ? (delegation.delegatee as `0x${string}` | undefined)
      : undefined;

  const delegatedAmount =
    delegation && typeof delegation === "object" && "amount" in delegation
      ? (delegation.amount as bigint)
      : BigInt(0);

  const hasDelegated = delegatee && delegatee !== ZERO_ADDRESS;

  const handleManage = () => {
    setModalMode("undelegate");
    setModalOpen(true);
  };

  // Loading state (waiting for hydration and connection restore)
  if (!isReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            My Delegation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-16 bg-[var(--bg-secondary)] rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-[var(--bg-tertiary)] rounded-lg" />
              <div className="h-16 bg-[var(--bg-tertiary)] rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected state
  if (!isConnected || !address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            My Delegation
            <Badge variant="warning" size="sm">
              Not Connected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-[var(--text-tertiary)]">
            <p className="text-sm">Connect your wallet to view your delegation status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Delegated state
  if (hasDelegated) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              My Delegation
              <Badge variant="success" size="sm">
                Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isDeployed && (
              <div className="text-center py-2 mb-4 text-[var(--text-tertiary)]">
                <p className="text-xs">
                  Showing default values (contracts not deployed)
                </p>
              </div>
            )}
            <div className="space-y-4">
              {/* Delegatee Info */}
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <div className="flex items-center gap-3">
                  <AddressAvatar address={delegatee} size="md" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {formatAddress(delegatee)}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      Your current delegatee
                    </span>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={handleManage}>
                  Manage
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-xs text-[var(--text-tertiary)]">Delegated Amount</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {formatVTON(delegatedAmount, { compact: true })} vTON
                  </p>
                </div>
                <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-xs text-[var(--text-tertiary)]">Available Balance</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {formatVTON(vtonBalance ?? BigInt(0), { compact: true })} vTON
                  </p>
                </div>
              </div>

              {/* Info */}
              <div className="text-xs text-[var(--text-tertiary)]">
                <p>
                  Minimum delegation period:{" "}
                  <span className="font-medium">
                    {delegationPeriodRequirement
                      ? `${Number(delegationPeriodRequirement) / 86400} days`
                      : "7 days"}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <DelegationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          delegatee={delegatee}
          mode={modalMode}
          currentDelegatedAmount={delegatedAmount}
        />
      </>
    );
  }

  // Not delegated state
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          My Delegation
          <Badge variant="default" size="sm">
            Not Delegated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isDeployed && (
          <div className="text-center py-2 mb-4 text-[var(--text-tertiary)]">
            <p className="text-xs">
              Showing default values (contracts not deployed)
            </p>
          </div>
        )}
        <div className="space-y-4">
          {/* Balance Info */}
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg text-center">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Your vTON Balance</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {formatVTON(vtonBalance ?? BigInt(0), { compact: true })} vTON
            </p>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg text-sm text-[var(--text-secondary)]">
            <p>
              vTON holders cannot vote directly. Delegate your vTON to a delegatee
              below to participate in governance.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

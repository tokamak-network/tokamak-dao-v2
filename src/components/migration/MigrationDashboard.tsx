"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhaseProgress } from "./PhaseProgress";
import { ContractGraph } from "./ContractGraph";
import { TransactionLog } from "./TransactionLog";
import type { MigrationResult } from "@/types/migration";

interface MigrationDashboardProps {
  result: MigrationResult | null;
  isRunning: boolean;
  currentStep: number;
  highlightContract?: string;
}

function CheckItem({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0",
          ok
            ? "bg-green-100 text-green-600"
            : "bg-red-100 text-red-600"
        )}
      >
        {ok ? "\u2713" : "\u2717"}
      </span>
      <span className="text-[var(--text-secondary)]">{label}:</span>
      <span className="font-mono text-xs text-[var(--text-primary)] truncate">
        {value}
      </span>
    </div>
  );
}

export function MigrationDashboard({
  result,
  isRunning,
  currentStep,
  highlightContract,
}: MigrationDashboardProps) {
  const currentPhase = useMemo(() => {
    if (!result) return isRunning ? 0 : -1;
    const running = result.phases.findIndex((p) => p.status === "running");
    if (running >= 0) return running;
    const lastCompleted = result.phases
      .map((p, i) => (p.status === "completed" ? i : -1))
      .filter((i) => i >= 0);
    return lastCompleted.length > 0
      ? lastCompleted[lastCompleted.length - 1] + 1
      : 0;
  }, [result, isRunning]);

  // Initial state: no result and not running
  if (!result && !isRunning) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              DAO Migration Simulator
            </h2>
            <p className="text-sm text-[var(--text-secondary)] max-w-md">
              Simulate the Tokamak DAO V1 to V2 migration process.
              Start the simulation to explore the 5-phase migration workflow.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Running state with no result yet
  if (!result && isRunning) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin mb-4" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Preparing migration...
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Initializing simulation environment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Result available (running or completed)
  if (!result) return null;

  const isComplete = result.phases.every((p) => p.status === "completed");
  const hasFailed = result.phases.some((p) => p.status === "failed");

  return (
    <div className="space-y-6">
      {/* Phase Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Migration Progress</CardTitle>
              <CardDescription>
                {isComplete
                  ? "Migration completed successfully."
                  : hasFailed
                  ? "An error occurred during migration."
                  : "Migration in progress..."}
              </CardDescription>
            </div>
            {isComplete && (
              <Badge variant="success" size="lg">
                Done
              </Badge>
            )}
            {hasFailed && (
              <Badge variant="error" size="lg">
                Failed
              </Badge>
            )}
            {isRunning && !isComplete && !hasFailed && (
              <Badge variant="info" size="lg">
                In Progress
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <PhaseProgress phases={result.phases} currentPhase={currentPhase} />
        </CardContent>
      </Card>

      {/* Contract Graph */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contract Architecture</CardTitle>
          <CardDescription>
            Migration architecture from V1 to V2 contracts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContractGraph
            contracts={result.contracts}
            activePhase={currentPhase}
            highlightContract={highlightContract}
          />
        </CardContent>
      </Card>

      {/* Transaction Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction Log</CardTitle>
          <CardDescription>
            Transaction execution log for each phase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionLog phases={result.phases} visibleUpTo={currentStep} />
        </CardContent>
      </Card>

      {/* Summary Stats (shown when complete) */}
      {isComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Migration Summary</CardTitle>
            <CardDescription>
              Migration result summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stats */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  Execution Stats
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-[var(--bg-tertiary)] px-3 py-2">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Total Transactions
                    </p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">
                      {result.totalTransactions}
                    </p>
                  </div>
                  <div className="rounded-md bg-[var(--bg-tertiary)] px-3 py-2">
                    <p className="text-xs text-[var(--text-secondary)]">
                      Execution Time
                    </p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">
                      {(result.executionTimeMs / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>
              </div>

              {/* Final State Checks */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  Final State Verification
                </h4>
                <div className="space-y-2">
                  <CheckItem
                    label="pauseProxy"
                    value={result.finalState.pauseProxy ? "true" : "false"}
                    ok={result.finalState.pauseProxy}
                  />
                  <CheckItem
                    label="Vault Owner"
                    value={result.finalState.daoVaultOwner}
                    ok={result.finalState.daoVaultOwner.length > 0}
                  />
                  <CheckItem
                    label="vTON Owner"
                    value={result.finalState.vtonOwner}
                    ok={result.finalState.vtonOwner.length > 0}
                  />
                  <CheckItem
                    label="Timelock Admin"
                    value={result.finalState.timelockAdmin}
                    ok={result.finalState.timelockAdmin.length > 0}
                  />
                  <CheckItem
                    label="Governor Owner"
                    value={result.finalState.governorOwner}
                    ok={result.finalState.governorOwner.length > 0}
                  />
                  <CheckItem
                    label="DelegateRegistry Owner"
                    value={result.finalState.delegateRegistryOwner}
                    ok={result.finalState.delegateRegistryOwner.length > 0}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

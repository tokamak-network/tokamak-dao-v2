"use client";

import { useMigrationStepper } from "@/hooks/useMigrationStepper";
import { TOTAL_STEPS } from "@/lib/migration-steps";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MigrationDashboard } from "@/components/migration/MigrationDashboard";
import type { MigrationResult } from "@/types/migration";

const PHASE_NAMES = [
  "V1 Deploy",
  "V2 Deploy",
  "Configure",
  "Transition",
  "Deprecate V1",
];

export default function MigrationPage() {
  const stepper = useMigrationStepper();
  const {
    isExecuting,
    isComplete,
    error,
    currentStep,
    progress,
    executeNextStep,
    retry,
    reset,
  } = stepper;

  // Build MigrationResult for the dashboard
  const migrationResult: MigrationResult | null =
    stepper.progress.completed > 0
      ? {
          success: stepper.isComplete,
          phases: stepper.phases,
          contracts: stepper.contracts,
          finalState: {
            pauseProxy: stepper.isComplete,
            daoVaultOwner: "",
            vtonOwner: "",
            timelockAdmin: "",
            governorOwner: "",
            delegateRegistryOwner: "",
          },
          totalTransactions: stepper.progress.completed,
          executionTimeMs: 0,
        }
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="py-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
          Migration Simulator
        </h1>
        <p className="text-base text-[var(--text-secondary)] max-w-lg">
          Tokamak DAO V1에서 V2로의 마이그레이션을 단계별로 실행하고 시각적으로
          확인하세요.
        </p>
      </section>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">
            Step {progress.completed}/{progress.total}
            {currentStep &&
              ` · Phase ${currentStep.phase}: ${PHASE_NAMES[currentStep.phase]}`}
          </span>
          {isComplete && <Badge variant="success">Migration Complete</Badge>}
        </div>
        <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--fg-brand-primary)] transition-all duration-500"
            style={{
              width: `${(progress.completed / progress.total) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Current Step Preview Card */}
      <Card>
        <CardContent className="py-4">
          {isComplete ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-600">
                  Migration Complete
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  모든 {TOTAL_STEPS}개 스텝이 성공적으로 실행되었습니다.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={reset}>
                Reset &amp; Restart
              </Button>
            </div>
          ) : currentStep ? (
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      currentStep.phase <= 1
                        ? currentStep.contractVersion === "v1"
                          ? "error"
                          : "info"
                        : "default"
                    }
                    size="sm"
                  >
                    Phase {currentStep.phase} · Step {currentStep.stepInPhase}
                  </Badge>
                  {currentStep.type === "deploy" && (
                    <Badge variant="success" size="sm">
                      Deploy
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {currentStep.description}
                </p>
                {currentStep.requires.length > 0 && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Requires: {currentStep.requires.join(", ")}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {error && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={retry}
                    disabled={isExecuting}
                  >
                    Retry
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={executeNextStep}
                  disabled={isExecuting}
                  loading={isExecuting}
                >
                  {isExecuting ? "Executing..." : "Execute Step"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Ready to Start
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Anvil 노드가 실행 중이어야 합니다. (npm run anvil)
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={executeNextStep}>
                Start Migration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold mb-1">Step Execution Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Migration Dashboard */}
      <MigrationDashboard
        result={migrationResult}
        isRunning={stepper.isExecuting}
        currentStep={stepper.progress.completed - 1}
        highlightContract={stepper.lastDeployedContract ?? undefined}
      />

      {/* Bottom Reset button */}
      {stepper.progress.completed > 0 && !stepper.isComplete && (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={stepper.reset}
            disabled={stepper.isExecuting}
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}

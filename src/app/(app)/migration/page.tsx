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
    initializeV1,
    isV1Deployed,
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
    <div className="space-y-6 pb-24">
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
            {!isV1Deployed
              ? "V1 컨트랙트를 배포하여 시작하세요"
              : `Step ${progress.completed}/${progress.total}${
                  currentStep
                    ? ` · Phase ${currentStep.phase}: ${PHASE_NAMES[currentStep.phase]}`
                    : ""
                }`}
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

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--card-border)] bg-[var(--bg-primary)]/95 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl px-4 py-3">
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
          ) : !isV1Deployed ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  V1 컨트랙트 배포
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  마이그레이션을 시작하려면 V1 컨트랙트를 먼저 배포합니다. (Anvil
                  필요)
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={initializeV1}
                loading={isExecuting}
                disabled={isExecuting}
              >
                {isExecuting ? "Deploying V1..." : "Deploy V1 & Start"}
              </Button>
            </div>
          ) : currentStep ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
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
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {currentStep.description}
                  </p>
                  {currentStep.requires.length > 0 && (
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      Requires: {currentStep.requires.join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {stepper.progress.completed > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={reset}
                    disabled={isExecuting}
                  >
                    Reset
                  </Button>
                )}
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MigrationDashboard } from "@/components/migration/MigrationDashboard";
import type { MigrationResult, MigrationPhase } from "@/types/migration";

const STEP_INTERVAL_MS = 300;

/**
 * Compute the total number of steps across all phases.
 */
function countTotalSteps(phases: MigrationPhase[]): number {
  return phases.reduce((sum, phase) => sum + phase.steps.length, 0);
}

/**
 * Given the original phases and a currentStep index, produce a new set of
 * phases where each step/phase status reflects the animation progress.
 *
 * Steps with index < currentStep are "success", the step at currentStep
 * is "success" (just revealed), and steps beyond are "pending".
 * Phase status is derived: all steps done = "completed", any step revealed
 * = "running", otherwise "pending".
 */
function buildAnimatedPhases(
  phases: MigrationPhase[],
  currentStep: number,
  isFinished: boolean,
): MigrationPhase[] {
  let stepCounter = 0;

  return phases.map((phase) => {
    const animatedSteps = phase.steps.map((step) => {
      const idx = stepCounter;
      stepCounter++;

      if (isFinished || idx <= currentStep) {
        return { ...step, status: "success" as const };
      }
      return { ...step, status: "pending" as const };
    });

    const completedCount = animatedSteps.filter(
      (s) => s.status === "success",
    ).length;
    let phaseStatus: MigrationPhase["status"];

    if (completedCount === animatedSteps.length) {
      phaseStatus = "completed";
    } else if (completedCount > 0) {
      phaseStatus = "running";
    } else {
      phaseStatus = "pending";
    }

    return { ...phase, steps: animatedSteps, status: phaseStatus };
  });
}

export default function MigrationPage() {
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rawResultRef = useRef<MigrationResult | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startMigration = useCallback(async () => {
    // Reset state
    setIsRunning(true);
    setError(null);
    setResult(null);
    setCurrentStep(0);
    rawResultRef.current = null;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    try {
      const response = await fetch("/api/migration/simulate", {
        method: "POST",
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          body || `Simulation failed with status ${response.status}`,
        );
      }

      const data: MigrationResult = await response.json();
      rawResultRef.current = data;

      const totalSteps = countTotalSteps(data.phases);

      if (totalSteps === 0) {
        setResult(data);
        setIsRunning(false);
        return;
      }

      // Initialize with all phases/steps pending
      const initialPhases = buildAnimatedPhases(data.phases, -1, false);
      setResult({ ...data, phases: initialPhases });

      // Animate through steps
      let step = 0;
      intervalRef.current = setInterval(() => {
        const isLast = step >= totalSteps - 1;
        const animated = buildAnimatedPhases(data.phases, step, isLast);

        setResult({ ...data, phases: animated });
        setCurrentStep(step);

        if (isLast) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRunning(false);
        }

        step++;
      }, STEP_INTERVAL_MS);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setIsRunning(false);
    }
  }, []);

  const isComplete =
    result !== null &&
    !isRunning &&
    result.phases.every((p) => p.status === "completed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="py-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
          Migration Simulator
        </h1>
        <p className="text-base text-[var(--text-secondary)] max-w-lg">
          Tokamak DAO V1에서 V2로의 마이그레이션 전체 과정을 로컬 환경에서
          시뮬레이션합니다.
        </p>
      </section>

      {/* Controls */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button
          variant="primary"
          size="lg"
          onClick={startMigration}
          disabled={isRunning}
          loading={isRunning}
        >
          {isRunning
            ? "Simulating..."
            : isComplete
              ? "Re-run Simulation"
              : "Start Migration"}
        </Button>

        <p className="text-xs text-[var(--text-secondary)]">
          로컬 Anvil 노드가 실행 중이어야 합니다. (
          <code className="font-mono text-[var(--text-primary)]">
            npm run anvil
          </code>
          )
        </p>
      </section>

      {/* Execution stats after completion */}
      {isComplete && result && (
        <section className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
          <span>
            총 트랜잭션:{" "}
            <strong className="text-[var(--text-primary)]">
              {result.totalTransactions}
            </strong>
          </span>
          <span>
            실행 시간:{" "}
            <strong className="text-[var(--text-primary)]">
              {(result.executionTimeMs / 1000).toFixed(1)}s
            </strong>
          </span>
        </section>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold mb-1">Simulation Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Dashboard */}
      <MigrationDashboard
        result={result}
        isRunning={isRunning}
        currentStep={currentStep}
      />
    </div>
  );
}

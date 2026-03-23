"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { MigrationPhase } from "@/types/migration";

interface TransactionLogProps {
  phases: MigrationPhase[];
  visibleUpTo?: number;
}

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const STATUS_CONFIG = {
  pending: { variant: "default" as const, label: "대기" },
  success: { variant: "success" as const, label: "완료" },
  failed: { variant: "error" as const, label: "실패" },
} as const;

const PHASE_BG = [
  "bg-red-50/30",
  "bg-blue-50/30",
  "bg-yellow-50/30",
  "bg-green-50/30",
  "bg-purple-50/30",
];

export function TransactionLog({ phases, visibleUpTo }: TransactionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastVisibleRef = useRef<HTMLDivElement>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(
    () => new Set(phases.map((_, i) => i))
  );

  const togglePhase = useCallback((phaseIndex: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseIndex)) {
        next.delete(phaseIndex);
      } else {
        next.add(phaseIndex);
      }
      return next;
    });
  }, []);

  // Auto-scroll to the latest visible step
  useEffect(() => {
    if (lastVisibleRef.current) {
      lastVisibleRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [visibleUpTo]);

  // Track the global step index to compare with visibleUpTo
  let globalStepIndex = 0;

  return (
    <div
      ref={scrollRef}
      className="max-h-[400px] overflow-y-auto rounded-md border border-[var(--card-border)]"
    >
      {phases.map((phase, phaseIdx) => {
        const isExpanded = expandedPhases.has(phaseIdx);
        const phaseBg = PHASE_BG[phaseIdx % PHASE_BG.length];

        return (
          <div key={phaseIdx} className={cn("border-b border-[var(--card-border)] last:border-b-0", phaseBg)}>
            {/* Phase Header */}
            <button
              onClick={() => togglePhase(phaseIdx)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5",
                "text-left hover:bg-black/5 transition-colors duration-150",
                "sticky top-0 z-10 backdrop-blur-sm"
              )}
            >
              <div className="flex items-center gap-2">
                <svg
                  className={cn(
                    "w-3 h-3 text-[var(--text-secondary)] transition-transform duration-200",
                    isExpanded && "rotate-90"
                  )}
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  <path d="M4 2l5 4-5 4V2z" />
                </svg>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Phase {phase.phase}: {phase.name}
                </span>
                <span className="text-[10px] font-normal text-[var(--text-secondary)] bg-[var(--card-bg)] px-1.5 py-0.5 rounded-full">
                  {phase.steps.length} steps
                </span>
              </div>
              <Badge
                variant={
                  phase.status === "completed"
                    ? "success"
                    : phase.status === "running"
                    ? "info"
                    : phase.status === "failed"
                    ? "error"
                    : "default"
                }
                size="sm"
              >
                {phase.status === "completed"
                  ? "완료"
                  : phase.status === "running"
                  ? "진행 중"
                  : phase.status === "failed"
                  ? "실패"
                  : "대기"}
              </Badge>
            </button>

            {/* Steps */}
            {isExpanded && (
              <div className="px-4 pb-3 space-y-1">
                {phase.steps.map((step, stepIdx) => {
                  const currentGlobalIdx = globalStepIndex++;
                  const isVisible =
                    visibleUpTo === undefined ||
                    currentGlobalIdx <= visibleUpTo;
                  const isLastVisible =
                    visibleUpTo !== undefined &&
                    currentGlobalIdx === visibleUpTo;
                  const statusConfig = STATUS_CONFIG[step.status];

                  if (!isVisible) return null;

                  return (
                    <div
                      key={stepIdx}
                      ref={isLastVisible ? lastVisibleRef : undefined}
                      className={cn(
                        "flex items-start gap-3 px-3 py-2 rounded-md text-sm",
                        "bg-[var(--card-bg)]/50",
                        "transition-all duration-300",
                        isLastVisible && "ring-1 ring-blue-300"
                      )}
                    >
                      {/* Step number */}
                      <span className="text-xs font-mono text-[var(--text-secondary)] mt-0.5 shrink-0 w-6 text-right">
                        #{step.step}
                      </span>

                      {/* Description and target */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] truncate">
                          {step.description}
                        </p>
                        <p className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">
                          Target: {truncateAddress(step.target)}
                        </p>
                        {step.contractCreated && (
                          <p className="text-xs text-green-600 mt-0.5">
                            + {step.contractCreated.name} (
                            {truncateAddress(step.contractCreated.address)})
                          </p>
                        )}
                      </div>

                      {/* Status badge */}
                      <Badge
                        variant={statusConfig.variant}
                        size="sm"
                        className="shrink-0"
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {phases.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
          트랜잭션 로그가 비어 있습니다.
        </div>
      )}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import type { MigrationPhase } from "@/types/migration";

const PHASE_NAMES = [
  "V1 배포",
  "V2 배포",
  "연동 설정",
  "거버넌스 전환",
  "V1 비활성화",
] as const;

const PHASE_DESCRIPTIONS = [
  "V1 컨트랙트 배포",
  "V2 컨트랙트 배포",
  "컨트랙트 연동 설정",
  "거버넌스 전환",
  "V1 비활성화",
] as const;

interface PhaseProgressProps {
  phases: MigrationPhase[];
  currentPhase: number;
}

function getPhaseStyles(status: MigrationPhase["status"]) {
  switch (status) {
    case "completed":
      return {
        circle: "bg-green-500 text-white",
        line: "bg-green-500",
        label: "text-green-600",
      };
    case "running":
      return {
        circle: "bg-blue-500 text-white animate-pulse",
        line: "bg-blue-300",
        label: "text-blue-600 font-semibold",
      };
    case "failed":
      return {
        circle: "bg-red-500 text-white",
        line: "bg-red-300",
        label: "text-red-600",
      };
    case "pending":
    default:
      return {
        circle: "bg-gray-200 text-gray-500",
        line: "bg-gray-200",
        label: "text-[var(--text-secondary)]",
      };
  }
}

export function PhaseProgress({ phases, currentPhase }: PhaseProgressProps) {
  return (
    <div className="w-full">
      {/* Desktop: horizontal layout */}
      <div className="hidden sm:flex items-start justify-between relative">
        {PHASE_NAMES.map((name, index) => {
          const phase = phases[index];
          const status = phase?.status ?? "pending";
          const styles = getPhaseStyles(status);
          const isLast = index === PHASE_NAMES.length - 1;

          return (
            <div
              key={index}
              className="flex flex-col items-center relative flex-1"
            >
              {/* Connecting line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute top-4 left-[50%] w-full h-0.5 transition-colors duration-500",
                    index < currentPhase ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}

              {/* Circle */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-500",
                  styles.circle
                )}
              >
                {status === "completed" ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "mt-2 text-xs text-center transition-colors duration-300",
                  styles.label
                )}
              >
                {name}
              </span>
              <span className="mt-0.5 text-[10px] text-center text-[var(--text-secondary)] leading-tight">
                {PHASE_DESCRIPTIONS[index]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical layout */}
      <div className="flex sm:hidden flex-col gap-2">
        {PHASE_NAMES.map((name, index) => {
          const phase = phases[index];
          const status = phase?.status ?? "pending";
          const styles = getPhaseStyles(status);
          const isLast = index === PHASE_NAMES.length - 1;

          return (
            <div key={index} className="flex items-center gap-3 relative">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-[15px] top-8 w-0.5 h-full transition-colors duration-500",
                    index < currentPhase ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}

              {/* Circle */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 transition-all duration-500",
                  styles.circle
                )}
              >
                {status === "completed" ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index
                )}
              </div>

              {/* Label */}
              <div className="flex flex-col">
                <span
                  className={cn(
                    "text-sm transition-colors duration-300",
                    styles.label
                  )}
                >
                  Phase {index}: {name}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] leading-tight">
                  {PHASE_DESCRIPTIONS[index]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

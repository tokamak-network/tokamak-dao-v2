"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ContractCard } from "./ContractCard";
import type { ContractInfo } from "@/types/migration";

interface ContractGraphProps {
  contracts: { v1: ContractInfo[]; v2: ContractInfo[] };
  activePhase: number;
}

const MIGRATION_ARROWS: {
  v1Name: string;
  v2Name: string;
  label: string;
}[] = [
  { v1Name: "MockTON", v2Name: "vTON", label: "token migration" },
  {
    v1Name: "MockDAOCommitteeProxy",
    v2Name: "DAOGovernor",
    label: "governance migration",
  },
  { v1Name: "MockDAOVault", v2Name: "Timelock", label: "treasury control" },
  {
    v1Name: "MockSeigManager",
    v2Name: "vTON",
    label: "seigniorage \u2192 mint",
  },
];

const V1_ORDER = [
  "MockTON",
  "MockDAOCommitteeProxy",
  "MockDAOAgendaManager",
  "MockDAOVault",
  "MockCandidateFactory",
  "MockSeigManager",
];

const V2_ORDER = [
  "vTON",
  "DelegateRegistry",
  "Timelock",
  "DAOGovernor",
  "SecurityCouncil",
];

function sortContracts(contracts: ContractInfo[], order: string[]) {
  const orderMap = new Map(order.map((name, i) => [name, i]));
  return [...contracts].sort(
    (a, b) => (orderMap.get(a.name) ?? 99) - (orderMap.get(b.name) ?? 99)
  );
}

export function ContractGraph({ contracts, activePhase }: ContractGraphProps) {
  const v1Sorted = sortContracts(contracts.v1, V1_ORDER);
  const v2Sorted = sortContracts(contracts.v2, V2_ORDER);

  // Phase-based visual states
  const v2Active = activePhase >= 1; // V2 contracts light up after phase 1
  const connectionsVisible = activePhase >= 2; // Connections after phase 2
  const v1Dimmed = activePhase >= 4; // V1 dims after phase 4

  return (
    <div className="w-full">
      {/* Desktop grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-6">
        {/* V1 Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              V1 Contracts
            </h3>
            <Badge variant="error" size="sm">
              V1
            </Badge>
          </div>
          <div
            className={cn(
              "space-y-2 transition-all duration-700",
              v1Dimmed ? "opacity-40 scale-[0.97]" : "opacity-100 scale-100"
            )}
          >
            {v1Sorted.map((contract, i) => (
              <div
                key={contract.address}
                className={cn(
                  "transition-all duration-500",
                  activePhase >= 0
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 translate-y-2"
                )}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <ContractCard
                  contract={contract}
                  isActive={!v1Dimmed}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Center: Migration indicator */}
        <div className="flex lg:flex-col items-center justify-center gap-3 py-4 lg:py-0">
          <div
            className={cn(
              "flex flex-col items-center gap-2 transition-all duration-500",
              connectionsVisible ? "opacity-100" : "opacity-30"
            )}
          >
            {/* Arrow */}
            <div className="hidden lg:flex flex-col items-center gap-1">
              {MIGRATION_ARROWS.map((arrow, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]",
                    "transition-all duration-500",
                    connectionsVisible
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-2"
                  )}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <span className="w-16 text-right truncate font-mono text-[9px]">
                    {arrow.v1Name.replace("Mock", "")}
                  </span>
                  <svg
                    className="w-6 h-3 text-blue-400 shrink-0"
                    viewBox="0 0 24 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  >
                    <line x1="0" y1="6" x2="18" y2="6" />
                    <polyline points="15,2 20,6 15,10" />
                  </svg>
                  <span className="w-16 truncate font-mono text-[9px]">
                    {arrow.v2Name}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile: simple arrow */}
            <div className="flex lg:hidden items-center gap-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Migration
              </span>
              <svg
                className="w-8 h-4 text-blue-400"
                viewBox="0 0 32 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <line x1="0" y1="8" x2="24" y2="8" />
                <polyline points="20,3 27,8 20,13" />
              </svg>
            </div>

            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full",
                "bg-blue-50 text-blue-600 border border-blue-200",
                "transition-opacity duration-500",
                connectionsVisible ? "opacity-100" : "opacity-0"
              )}
            >
              V1 → V2
            </span>
          </div>
        </div>

        {/* V2 Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              V2 Contracts
            </h3>
            <Badge variant="info" size="sm">
              V2
            </Badge>
          </div>
          <div
            className={cn(
              "space-y-2 transition-all duration-700",
              v2Active ? "opacity-100 scale-100" : "opacity-30 scale-[0.97]"
            )}
          >
            {v2Sorted.map((contract, i) => (
              <div
                key={contract.address}
                className={cn(
                  "transition-all duration-500",
                  v2Active
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 translate-y-2"
                )}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <ContractCard
                  contract={contract}
                  isActive={v2Active}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

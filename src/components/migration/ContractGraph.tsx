"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ContractInfo } from "@/types/migration";

interface ContractGraphProps {
  contracts: { v1: ContractInfo[]; v2: ContractInfo[] };
  activePhase: number;
  highlightContract?: string;
}

const MIGRATION_RELATIONS = [
  {
    v1: "MockTON",
    v2: "vTON",
    label: "Token Migration",
    description: "TON → vTON 거버넌스 토큰 전환",
  },
  {
    v1: "MockDAOCommitteeProxy",
    v2: "DAOGovernor",
    label: "Governance",
    description: "위원회 → 대의 민주주의 전환",
  },
  {
    v1: "MockDAOVault",
    v2: "Timelock",
    label: "Treasury",
    description: "금고 → Timelock 제어",
  },
  {
    v1: "MockSeigManager",
    v2: "vTON",
    label: "Seigniorage",
    description: "시뇨리지 → vTON 민팅",
  },
  {
    v1: "MockDAOAgendaManager",
    v2: "DAOGovernor",
    label: "Proposals",
    description: "안건 관리 → Governor 통합",
  },
  {
    v1: "MockCandidateFactory",
    v2: "DelegateRegistry",
    label: "Delegates",
    description: "후보 → 위임자 등록",
  },
];

/** V2 contracts that have no V1 counterpart */
const STANDALONE_V2 = ["SecurityCouncil"];

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function V1Card({
  contract,
  isDimmed,
  isHighlighted,
}: {
  contract: ContractInfo;
  isDimmed: boolean;
  isHighlighted: boolean;
}) {
  return (
    <div className="relative">
      <div
        className={cn(
          "px-3 py-2 rounded-lg border text-left",
          "transition-all duration-500",
          "border-l-4 border-l-red-400 border-[var(--card-border)]",
          !isDimmed
            ? "bg-[var(--card-bg)] shadow-sm"
            : "bg-[var(--card-bg)]/50",
          isDimmed && "opacity-40",
          isHighlighted && "ring-2 ring-green-400 animate-pulse"
        )}
      >
        <p className="text-xs font-semibold text-[var(--text-primary)]">
          {contract.name}
        </p>
        <p className="text-[10px] font-mono text-[var(--text-secondary)] truncate">
          {truncateAddress(contract.address)}
        </p>
      </div>
      {isDimmed && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]/60 rounded-lg">
          <span className="text-[10px] font-bold text-red-500 tracking-wider">
            DEPRECATED
          </span>
        </div>
      )}
    </div>
  );
}

function V2Card({
  contract,
  isActive,
  isHighlighted,
  isReference,
}: {
  contract: ContractInfo | null;
  isActive: boolean;
  isHighlighted: boolean;
  isReference?: boolean;
}) {
  if (!contract || !isActive) {
    return (
      <div className="px-3 py-2 rounded-lg border border-dashed border-[var(--card-border)] bg-transparent">
        <p className="text-xs text-[var(--text-secondary)]">
          {contract?.name ?? "—"}
        </p>
        <p className="text-[10px] text-[var(--text-tertiary)]">not deployed</p>
      </div>
    );
  }

  if (isReference) {
    return (
      <div
        className={cn(
          "px-3 py-2 rounded-lg border text-left",
          "transition-all duration-500",
          "border-l-4 border-l-blue-400/50 border-[var(--card-border)]",
          "bg-[var(--card-bg)]/70"
        )}
      >
        <p className="text-xs text-[var(--text-secondary)]">
          → {contract.name}
        </p>
        <p className="text-[10px] font-mono text-[var(--text-tertiary)] truncate">
          {truncateAddress(contract.address)}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-3 py-2 rounded-lg border text-left",
        "transition-all duration-500",
        "border-l-4 border-l-blue-400 border-[var(--card-border)]",
        "bg-[var(--card-bg)] shadow-sm",
        isHighlighted && "ring-2 ring-blue-400 animate-pulse"
      )}
    >
      <p className="text-xs font-semibold text-[var(--text-primary)]">
        {contract.name}
      </p>
      <p className="text-[10px] font-mono text-[var(--text-secondary)] truncate">
        {truncateAddress(contract.address)}
      </p>
    </div>
  );
}

function ConnectionLine({
  label,
  isConnected,
  isTransitioning,
  delay,
}: {
  label: string;
  isConnected: boolean;
  isTransitioning: boolean;
  delay: number;
}) {
  const lineClass = cn(
    "flex-1 h-px transition-all duration-700",
    isTransitioning && "animate-pulse"
  );

  const lineStyle: React.CSSProperties = isConnected
    ? {
        backgroundColor: isTransitioning
          ? "rgb(74, 222, 128)"
          : "rgb(96, 165, 250)",
      }
    : {
        backgroundImage:
          "repeating-linear-gradient(90deg, var(--card-border) 0, var(--card-border) 4px, transparent 4px, transparent 8px)",
        backgroundColor: "transparent",
        opacity: 0.3,
      };

  return (
    <div
      className="flex items-center gap-1 flex-1 min-w-0"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={lineClass} style={lineStyle} />
      <span
        className={cn(
          "text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0",
          "transition-all duration-500",
          isConnected
            ? "bg-blue-50 text-blue-600 border border-blue-200 opacity-100"
            : "opacity-0"
        )}
      >
        {label}
      </span>
      <div className={lineClass} style={lineStyle} />
      <svg
        className={cn(
          "w-3 h-3 shrink-0 transition-opacity duration-500",
          isConnected
            ? isTransitioning
              ? "text-green-400 opacity-100"
              : "text-blue-400 opacity-100"
            : "opacity-0"
        )}
        viewBox="0 0 12 12"
        fill="currentColor"
      >
        <path d="M4 2l6 4-6 4V2z" />
      </svg>
    </div>
  );
}

export function ContractGraph({
  contracts,
  activePhase,
  highlightContract,
}: ContractGraphProps) {
  const v1Map = new Map(contracts.v1.map((c) => [c.name, c]));
  const v2Map = new Map(contracts.v2.map((c) => [c.name, c]));

  const v2Active = activePhase >= 1;
  const connectionsVisible = activePhase >= 2;
  const isTransitioning = activePhase === 3;
  const v1Dimmed = activePhase >= 4;

  // Track which V2 contracts have been rendered as full cards
  const v2Rendered = new Set<string>();

  // Find standalone V2 contracts (not in any relation)
  const relatedV2Names = new Set(MIGRATION_RELATIONS.map((r) => r.v2));
  const standaloneV2Contracts = contracts.v2.filter(
    (c) => !relatedV2Names.has(c.name) || STANDALONE_V2.includes(c.name)
  );

  return (
    <div className="w-full space-y-4">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_minmax(100px,1fr)_1fr] gap-2 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            V1 Contracts
          </span>
          <Badge variant="error" size="sm">
            V1
          </Badge>
        </div>
        <div className="text-center">
          <span className="text-[10px] text-[var(--text-tertiary)]">
            Migration
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            V2 Contracts
          </span>
          <Badge variant="info" size="sm">
            V2
          </Badge>
        </div>
      </div>

      {/* Migration relationship rows */}
      <div className="space-y-2">
        {MIGRATION_RELATIONS.map((rel, i) => {
          const v1Contract = v1Map.get(rel.v1);
          const v2Contract = v2Map.get(rel.v2);
          const isV2Reference = v2Rendered.has(rel.v2);

          if (!isV2Reference) {
            v2Rendered.add(rel.v2);
          }

          return (
            <div
              key={`${rel.v1}-${rel.v2}-${i}`}
              className={cn(
                "grid grid-cols-[1fr_minmax(100px,1fr)_1fr] gap-2 items-center",
                "transition-all duration-500"
              )}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              {/* V1 card */}
              <div
                className={cn(
                  "transition-all duration-500",
                  activePhase >= 0
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-4"
                )}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {v1Contract ? (
                  <V1Card
                    contract={v1Contract}
                    isDimmed={v1Dimmed}
                    isHighlighted={highlightContract === v1Contract.name}
                  />
                ) : (
                  <div className="px-3 py-2" />
                )}
              </div>

              {/* Connection line */}
              <ConnectionLine
                label={rel.label}
                isConnected={connectionsVisible}
                isTransitioning={isTransitioning}
                delay={i * 100}
              />

              {/* V2 card */}
              <div
                className={cn(
                  "transition-all duration-500",
                  v2Active
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-4"
                )}
                style={{ transitionDelay: `${i * 80 + 200}ms` }}
              >
                <V2Card
                  contract={v2Contract ?? null}
                  isActive={v2Active}
                  isHighlighted={
                    highlightContract === v2Contract?.name && !isV2Reference
                  }
                  isReference={isV2Reference}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Standalone V2 contracts */}
      {standaloneV2Contracts.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[var(--card-border)]">
          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            New in V2 (no V1 counterpart)
          </p>
          <div className="grid grid-cols-[1fr_minmax(100px,1fr)_1fr] gap-2 items-center">
            {standaloneV2Contracts.map((contract, i) => (
              <div
                key={contract.address}
                className="col-start-3 transition-all duration-500"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <V2Card
                  contract={contract}
                  isActive={v2Active}
                  isHighlighted={highlightContract === contract.name}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase indicator */}
      <div className="flex items-center justify-center gap-2 pt-2">
        {[0, 1, 2, 3, 4].map((phase) => (
          <div
            key={phase}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              activePhase >= phase
                ? activePhase === phase
                  ? "bg-blue-500 scale-125"
                  : "bg-blue-400"
                : "bg-[var(--card-border)]"
            )}
          />
        ))}
        <span className="text-[10px] text-[var(--text-tertiary)] ml-1">
          Phase {activePhase}
        </span>
      </div>
    </div>
  );
}

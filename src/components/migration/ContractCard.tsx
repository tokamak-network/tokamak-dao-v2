"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ContractInfo } from "@/types/migration";

interface ContractCardProps {
  contract: ContractInfo;
  isActive?: boolean;
  ownerLabel?: string;
}

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const categoryBadgeVariant: Record<
  string,
  "default" | "primary" | "success" | "warning" | "info"
> = {
  token: "primary",
  governance: "info",
  treasury: "success",
  staking: "warning",
};

export function ContractCard({
  contract,
  isActive = false,
  ownerLabel,
}: ContractCardProps) {
  const isV1 = contract.version === "v1";
  const borderColor = isV1 ? "border-l-red-400" : "border-l-blue-400";
  const badgeVariant = categoryBadgeVariant[contract.category] ?? "default";

  return (
    <div
      className={cn(
        "border-l-4 rounded-md px-3 py-2.5",
        "bg-[var(--card-bg)] border border-[var(--card-border)]",
        "transition-all duration-300",
        borderColor,
        isActive && [
          "shadow-md",
          isV1
            ? "ring-1 ring-red-300/50"
            : "ring-1 ring-blue-300/50",
        ],
        !isActive && "opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {contract.name}
          </p>
          <p className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">
            {truncateAddress(contract.address)}
          </p>
          {ownerLabel && (
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              Owner: {ownerLabel}
            </p>
          )}
        </div>
        <Badge variant={badgeVariant} size="sm" className="shrink-0">
          {contract.category}
        </Badge>
      </div>
    </div>
  );
}

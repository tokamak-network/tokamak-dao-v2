"use client";

import { MAX_SUPPLY, EPOCH_SIZE, MAX_EPOCHS } from "@/lib/halving";

interface SupplyProgressBarProps {
  totalSupply: number;
  currentEpoch: number;
}

export function SupplyProgressBar({
  totalSupply,
  currentEpoch,
}: SupplyProgressBarProps) {
  const percentage = (totalSupply / MAX_SUPPLY) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--text-secondary)]">Total Supply</span>
        <span className="text-[var(--text-primary)] font-medium">
          {formatNumber(totalSupply)} / {formatNumber(MAX_SUPPLY)} vTON
        </span>
      </div>
      <div className="relative">
        {/* Background track */}
        <div className="h-6 w-full rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] overflow-hidden">
          {/* Fill */}
          <div
            className="h-full bg-[var(--fg-brand-primary)] transition-all duration-500 ease-out rounded-[var(--radius-lg)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Epoch boundary markers */}
        <div className="absolute inset-0 h-6">
          {Array.from({ length: MAX_EPOCHS - 1 }, (_, i) => {
            const pos = ((i + 1) * EPOCH_SIZE) / MAX_SUPPLY * 100;
            return (
              <div
                key={i}
                className="absolute top-0 h-full w-px bg-[var(--border-primary)] opacity-30"
                style={{ left: `${pos}%` }}
              />
            );
          })}
        </div>
      </div>
      <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
        <span>Epoch 0</span>
        <span>Current: Epoch {currentEpoch}</span>
        <span>Epoch {MAX_EPOCHS}</span>
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

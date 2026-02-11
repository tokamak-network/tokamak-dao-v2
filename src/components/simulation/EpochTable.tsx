"use client";

import { memo } from "react";
import { generateEpochTable } from "@/lib/halving";

// Static data — computed once
const EPOCH_ROWS = generateEpochTable();

interface EpochTableProps {
  currentEpoch: number;
}

export const EpochTable = memo(function EpochTable({
  currentEpoch,
}: EpochTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-primary)]">
            <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">
              Epoch
            </th>
            <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">
              Halving Ratio
            </th>
            <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">
              Epoch Supply
            </th>
            <th className="text-right py-2 px-3 text-[var(--text-secondary)] font-medium">
              Cumulative Supply
            </th>
          </tr>
        </thead>
        <tbody>
          {EPOCH_ROWS.map((row) => (
            <tr
              key={row.epoch}
              className={`border-b border-[var(--border-secondary)] transition-colors ${
                row.epoch === currentEpoch
                  ? "bg-[var(--bg-brand-subtle)]"
                  : "hover:bg-[var(--bg-secondary)]"
              }`}
            >
              <td className="py-2 px-3 text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                  {row.epoch === currentEpoch && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--fg-brand-primary)]" />
                  )}
                  {row.epoch}
                </div>
              </td>
              <td className="py-2 px-3 text-right text-[var(--text-primary)] font-mono">
                {(row.halvingRatio * 100).toFixed(2)}%
              </td>
              <td className="py-2 px-3 text-right text-[var(--text-primary)] font-mono">
                {formatNumber(row.epochMintable)}
              </td>
              <td className="py-2 px-3 text-right text-[var(--text-primary)] font-mono">
                {formatNumber(row.cumulativeSupply)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

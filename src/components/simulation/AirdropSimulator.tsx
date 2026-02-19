"use client";

import { useState, useMemo, useDeferredValue } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useStakers } from "@/hooks/useStakers";
import {
  calculateAirdrop,
  type AirdropParams,
  type AirdropResult,
} from "@/lib/airdrop";
import { formatNumber } from "@/lib/utils";
import { AirdropParameterPanel } from "./AirdropParameterPanel";
import { AirdropResultsTable } from "./AirdropResultsTable";
import { AirdropDistributionChart } from "./AirdropDistributionChart";

// Default: Jan 1 2020 → now
const DEFAULT_FROM = Math.floor(new Date("2020-01-01").getTime() / 1000);
const DEFAULT_TO = Math.floor(Date.now() / 1000);

const DEFAULT_PARAMS: AirdropParams = {
  totalBudget: 10_000_000,
  stakeMetric: "totalDeposited",
  periodFrom: DEFAULT_FROM,
  periodTo: DEFAULT_TO,
  minStakeThreshold: 0,
};

export function AirdropSimulator() {
  const { data: stakers, isLoading, error } = useStakers();
  const [params, setParams] = useState<AirdropParams>(DEFAULT_PARAMS);

  const deferredParams = useDeferredValue(params);
  const isStale = deferredParams !== params;

  const result: AirdropResult | null = useMemo(() => {
    if (!stakers || stakers.length === 0) return null;
    return calculateAirdrop(stakers, deferredParams);
  }, [stakers, deferredParams]);

  // Protocol stats from raw staker data
  const protocolStats = useMemo(() => {
    if (!stakers) return null;
    let totalDeposited = 0;
    let netStaked = 0;
    for (const s of stakers) {
      totalDeposited += s.totalDeposited;
      netStaked += s.netStaked;
    }
    return {
      totalStakers: stakers.length,
      totalDeposited,
      totalNetStaked: netStaked,
    };
  }, [stakers]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-[var(--fg-brand-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-secondary)]">
          Loading staker data from subgraph...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="py-8 text-center">
            <p className="text-[var(--status-error-fg)] font-medium">
              Failed to load staker data
            </p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Protocol Stats Banner */}
      {protocolStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatBanner
            label="Total Stakers"
            value={protocolStats.totalStakers.toLocaleString()}
          />
          <StatBanner
            label="Total Deposited"
            value={`${formatNumber(protocolStats.totalDeposited, { compact: true })} TON`}
          />
          <StatBanner
            label="Net Staked"
            value={`${formatNumber(protocolStats.totalNetStaked, { compact: true })} TON`}
          />
        </div>
      )}

      {/* Parameter Panel */}
      <AirdropParameterPanel params={params} onChange={setParams} />

      {/* Results */}
      {result && (
        <div
          className={`space-y-6 transition-opacity duration-150 ${
            isStale ? "opacity-70" : "opacity-100"
          }`}
        >
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBanner
              label="Eligible Stakers"
              value={result.summary.eligibleCount.toLocaleString()}
            />
            <StatBanner
              label="Mean Allocation"
              value={`${formatNumber(result.summary.meanAllocation, { decimals: 2 })} vTON`}
            />
            <StatBanner
              label="Median Allocation"
              value={`${formatNumber(result.summary.medianAllocation, { decimals: 2 })} vTON`}
            />
            <StatBanner
              label="Top 10 Concentration"
              value={`${result.summary.top10Concentration.toFixed(1)}%`}
            />
          </div>

          {/* Charts */}
          <AirdropDistributionChart allocations={result.allocations} />

          {/* Table */}
          <AirdropResultsTable allocations={result.allocations} />
        </div>
      )}
    </div>
  );
}

function StatBanner({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="sm">
      <CardContent>
        <p className="text-xs text-[var(--text-tertiary)] mb-0.5">{label}</p>
        <p className="text-lg font-semibold text-[var(--text-primary)] font-mono">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

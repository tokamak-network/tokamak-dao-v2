"use client";

import { memo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { AirdropParams, StakeMetric } from "@/lib/airdrop";

interface AirdropParameterPanelProps {
  params: AirdropParams;
  onChange: (params: AirdropParams) => void;
}

function unixToDateString(unix: number): string {
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

function dateStringToUnix(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

export const AirdropParameterPanel = memo(function AirdropParameterPanel({
  params,
  onChange,
}: AirdropParameterPanelProps) {
  const update = (partial: Partial<AirdropParams>) => {
    onChange({ ...params, ...partial });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Airdrop Parameters</CardTitle>
        <CardDescription>
          Configure the airdrop simulation parameters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Budget */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Total Budget (vTON)
            </label>
            <input
              type="number"
              min={0}
              step={100000}
              value={params.totalBudget}
              onChange={(e) =>
                update({ totalBudget: Math.max(0, Number(e.target.value) || 0) })
              }
              className="flex w-full h-10 px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-[var(--input-radius)] hover:border-[var(--input-border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus)] focus:ring-offset-1 font-mono"
            />
          </div>

          {/* Stake Metric */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Stake Metric
            </label>
            <div className="flex h-10 rounded-[var(--input-radius)] border border-[var(--input-border)] overflow-hidden">
              <MetricButton
                active={params.stakeMetric === "totalDeposited"}
                onClick={() => update({ stakeMetric: "totalDeposited" as StakeMetric })}
              >
                Total Deposited
              </MetricButton>
              <MetricButton
                active={params.stakeMetric === "netStaked"}
                onClick={() => update({ stakeMetric: "netStaked" as StakeMetric })}
              >
                Net Staked
              </MetricButton>
            </div>
          </div>

          {/* Min Stake Threshold */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Min Stake (TON)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={params.minStakeThreshold}
              onChange={(e) =>
                update({
                  minStakeThreshold: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="flex w-full h-10 px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-[var(--input-radius)] hover:border-[var(--input-border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus)] focus:ring-offset-1 font-mono"
            />
          </div>

          {/* Period From */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Period From
            </label>
            <input
              type="date"
              value={unixToDateString(params.periodFrom)}
              onChange={(e) => {
                const unix = dateStringToUnix(e.target.value);
                if (!isNaN(unix)) update({ periodFrom: unix });
              }}
              className="flex w-full h-10 px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-[var(--input-radius)] hover:border-[var(--input-border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus)] focus:ring-offset-1"
            />
          </div>

          {/* Period To */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Period To
            </label>
            <input
              type="date"
              value={unixToDateString(params.periodTo)}
              onChange={(e) => {
                const unix = dateStringToUnix(e.target.value);
                if (!isNaN(unix)) update({ periodTo: unix });
              }}
              className="flex w-full h-10 px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-[var(--input-radius)] hover:border-[var(--input-border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus)] focus:ring-offset-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

function MetricButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-xs font-medium transition-colors ${
        active
          ? "bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)]"
          : "bg-[var(--input-bg)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
      }`}
    >
      {children}
    </button>
  );
}

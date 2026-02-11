"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  MintSimulator,
  type MintHistoryEntry,
} from "@/components/simulation/MintSimulator";
import { EpochTable } from "@/components/simulation/EpochTable";
import { SupplyChart } from "@/components/simulation/SupplyChart";
import { HalvingRatioChart } from "@/components/simulation/HalvingRatioChart";
import { getEpoch, generateEpochTimeEstimates } from "@/lib/halving";

const DEFAULT_SEIGNIORAGE = 3.92;
const DEFAULT_BLOCK_TIME = 12;

export default function VTONIssuanceSimulatorPage() {
  const [history, setHistory] = useState<MintHistoryEntry[]>([]);
  const [seignioragePerBlock, setSeignioragePerBlock] =
    useState(DEFAULT_SEIGNIORAGE);
  const [blockTimeSec, setBlockTimeSec] = useState(DEFAULT_BLOCK_TIME);

  const totalSupply =
    history.length > 0 ? history[history.length - 1].cumulativeSupply : 0;
  const currentEpoch = getEpoch(totalSupply);

  const handleMint = useCallback((entry: MintHistoryEntry) => {
    setHistory((prev) => [...prev, entry]);
  }, []);

  const handleReset = useCallback(() => {
    setHistory([]);
  }, []);

  const chartHistory = useMemo(
    () =>
      history.map((h) => ({
        cumulativeRaw: h.cumulativeRaw,
        cumulativeSupply: h.cumulativeSupply,
      })),
    [history]
  );

  const timeEstimates = useMemo(
    () => generateEpochTimeEstimates(seignioragePerBlock, blockTimeSec),
    [seignioragePerBlock, blockTimeSec]
  );

  // Defer heavy chart/table updates so Mint button responds instantly
  const deferredChartHistory = useDeferredValue(chartHistory);
  const deferredEpoch = useDeferredValue(currentEpoch);
  const deferredTimeEstimates = useDeferredValue(timeEstimates);
  const isStale = deferredChartHistory !== chartHistory;

  const tonPerDay =
    blockTimeSec > 0
      ? seignioragePerBlock * (86400 / blockTimeSec)
      : 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          vTON Issuance Simulator
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Explore the vTON halving mechanism interactively. Each epoch reduces
          the minting ratio by 25% (decay rate = 0.75).
        </p>
      </div>

      {/* Mint Simulator — uses live state, always instant */}
      <section>
        <MintSimulator
          history={history}
          totalSupply={totalSupply}
          onMint={handleMint}
          onReset={handleReset}
        />
      </section>

      {/* Charts — use deferred state, update after mint interaction settles */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-opacity duration-150 ${
          isStale ? "opacity-70" : "opacity-100"
        }`}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supply Curve</CardTitle>
            <CardDescription>
              Total vTON supply vs. cumulative raw TON minted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SupplyChart mintHistory={deferredChartHistory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Halving Ratio by Epoch</CardTitle>
            <CardDescription>
              Minting efficiency decreases 25% per epoch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HalvingRatioChart currentEpoch={deferredEpoch} />
          </CardContent>
        </Card>
      </div>

      {/* Epoch Table — also deferred */}
      <Card className={`transition-opacity duration-150 ${isStale ? "opacity-70" : "opacity-100"}`}>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Epoch Halving Schedule</CardTitle>
              <CardDescription>
                Each epoch represents 5M vTON of total supply capacity
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <span className="whitespace-nowrap">TON/block</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={seignioragePerBlock}
                    onChange={(e) =>
                      setSeignioragePerBlock(
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="w-20 px-2 py-1 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono text-right text-sm focus:outline-none focus:ring-1 focus:ring-[var(--fg-brand-primary)]"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <span className="whitespace-nowrap">sec/block</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={blockTimeSec}
                    onChange={(e) =>
                      setBlockTimeSec(
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    className="w-16 px-2 py-1 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono text-right text-sm focus:outline-none focus:ring-1 focus:ring-[var(--fg-brand-primary)]"
                  />
                </label>
              </div>
              {tonPerDay > 0 && (
                <span className="text-xs text-[var(--text-tertiary)] font-mono">
                  = {Math.round(tonPerDay).toLocaleString()} TON/day
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EpochTable
            currentEpoch={deferredEpoch}
            timeEstimates={deferredTimeEstimates}
          />
        </CardContent>
      </Card>
    </div>
  );
}

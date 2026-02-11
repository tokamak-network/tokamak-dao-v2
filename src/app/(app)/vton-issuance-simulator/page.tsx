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
import { getEpoch } from "@/lib/halving";

export default function VTONIssuanceSimulatorPage() {
  const [history, setHistory] = useState<MintHistoryEntry[]>([]);
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

  // Defer heavy chart/table updates so Mint button responds instantly
  const deferredChartHistory = useDeferredValue(chartHistory);
  const deferredEpoch = useDeferredValue(currentEpoch);
  const isStale = deferredChartHistory !== chartHistory;

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
          <CardTitle className="text-base">Epoch Halving Schedule</CardTitle>
          <CardDescription>
            Each epoch represents 5M vTON of total supply capacity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EpochTable currentEpoch={deferredEpoch} />
        </CardContent>
      </Card>
    </div>
  );
}

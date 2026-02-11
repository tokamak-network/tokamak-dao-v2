"use client";

import { memo, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { generateSupplyCurve, MAX_SUPPLY } from "@/lib/halving";

// Static curve — computed once at module level
const CURVE_DATA = generateSupplyCurve().map((p) => ({
  rawMinted: p.rawMinted / 1_000_000,
  totalSupply: p.totalSupply / 1_000_000,
}));

interface SupplyChartProps {
  mintHistory: Array<{
    cumulativeRaw: number;
    cumulativeSupply: number;
  }>;
}

export const SupplyChart = memo(function SupplyChart({
  mintHistory,
}: SupplyChartProps) {
  const chartData = useMemo(() => {
    if (mintHistory.length === 0) {
      return CURVE_DATA;
    }

    // Build history lookup as sorted array (already sorted by construction)
    const historyPoints = mintHistory.map((p) => ({
      rawMinted: p.cumulativeRaw / 1_000_000,
      simulated: p.cumulativeSupply / 1_000_000,
    }));

    // Merge: start with curve data, insert history points in order
    const result: Array<{
      rawMinted: number;
      totalSupply: number;
      simulated?: number;
    }> = [];

    let hi = 0;
    for (const cp of CURVE_DATA) {
      // Insert any history points that come before this curve point
      while (hi < historyPoints.length && historyPoints[hi].rawMinted < cp.rawMinted - 0.01) {
        result.push({
          rawMinted: historyPoints[hi].rawMinted,
          totalSupply: cp.totalSupply, // approximate
          simulated: historyPoints[hi].simulated,
        });
        hi++;
      }
      // Check if current history point matches this curve point
      if (
        hi < historyPoints.length &&
        Math.abs(historyPoints[hi].rawMinted - cp.rawMinted) < 1
      ) {
        result.push({
          ...cp,
          simulated: historyPoints[hi].simulated,
        });
        hi++;
      } else {
        result.push(cp);
      }
    }
    // Append remaining history points
    while (hi < historyPoints.length) {
      result.push({
        rawMinted: historyPoints[hi].rawMinted,
        totalSupply: historyPoints[hi].simulated,
        simulated: historyPoints[hi].simulated,
      });
      hi++;
    }

    return result;
  }, [mintHistory]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="supplyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--fg-brand-primary)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--fg-brand-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border-secondary)"
          opacity={0.5}
        />
        <XAxis
          dataKey="rawMinted"
          stroke="var(--text-tertiary)"
          fontSize={12}
          tickFormatter={(v) => `${v.toFixed(0)}M`}
          label={{
            value: "Raw TON Minted (M)",
            position: "insideBottom",
            offset: -2,
            style: { fill: "var(--text-tertiary)", fontSize: 11 },
          }}
        />
        <YAxis
          stroke="var(--text-tertiary)"
          fontSize={12}
          tickFormatter={(v) => `${v.toFixed(0)}M`}
          domain={[0, 100]}
          label={{
            value: "vTON Supply (M)",
            angle: -90,
            position: "insideLeft",
            offset: 10,
            style: { fill: "var(--text-tertiary)", fontSize: 11 },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
          }}
          labelFormatter={(v) => `Raw: ${Number(v).toFixed(2)}M TON`}
          formatter={(value, name) => [
            `${Number(value).toFixed(2)}M vTON`,
            name === "totalSupply" ? "Theoretical" : "Simulated",
          ]}
        />
        <ReferenceLine
          y={MAX_SUPPLY / 1_000_000}
          stroke="var(--status-error-fg)"
          strokeDasharray="5 5"
          label={{
            value: "MAX 100M",
            position: "right",
            style: { fill: "var(--status-error-fg)", fontSize: 11 },
          }}
        />
        <Area
          type="stepAfter"
          dataKey="totalSupply"
          stroke="var(--fg-brand-primary)"
          fill="url(#supplyGradient)"
          strokeWidth={2}
          dot={false}
          name="totalSupply"
          isAnimationActive={false}
        />
        {mintHistory.length > 0 && (
          <Area
            type="monotone"
            dataKey="simulated"
            stroke="var(--color-success-500)"
            fill="none"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3, fill: "var(--color-success-500)" }}
            connectNulls
            name="simulated"
            isAnimationActive={false}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
});

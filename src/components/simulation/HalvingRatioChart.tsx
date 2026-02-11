"use client";

import { memo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import { getHalvingRatio, MAX_EPOCHS } from "@/lib/halving";

// Static data — computed once
const RATIO_DATA = Array.from({ length: MAX_EPOCHS + 1 }, (_, epoch) => ({
  epoch,
  ratio: getHalvingRatio(epoch) * 100,
}));

interface HalvingRatioChartProps {
  currentEpoch: number;
}

export const HalvingRatioChart = memo(function HalvingRatioChart({
  currentEpoch,
}: HalvingRatioChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={RATIO_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border-secondary)"
          opacity={0.5}
        />
        <XAxis
          dataKey="epoch"
          stroke="var(--text-tertiary)"
          fontSize={12}
          label={{
            value: "Epoch",
            position: "insideBottom",
            offset: -2,
            style: { fill: "var(--text-tertiary)", fontSize: 11 },
          }}
        />
        <YAxis
          stroke="var(--text-tertiary)"
          fontSize={12}
          tickFormatter={(v) => `${v}%`}
          domain={[0, 105]}
          label={{
            value: "Halving Ratio",
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
          labelFormatter={(v) => `Epoch ${v}`}
          formatter={(value) => [`${Number(value).toFixed(2)}%`, "Halving Ratio"]}
        />
        <Line
          type="stepAfter"
          dataKey="ratio"
          stroke="var(--fg-brand-primary)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--fg-brand-primary)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
        {currentEpoch <= MAX_EPOCHS && (
          <ReferenceDot
            x={currentEpoch}
            y={getHalvingRatio(currentEpoch) * 100}
            r={7}
            fill="var(--color-success-500)"
            stroke="var(--card-bg)"
            strokeWidth={2}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
});

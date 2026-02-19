"use client";

import { memo, useMemo } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { StakerAllocation } from "@/lib/airdrop";

interface AirdropDistributionChartProps {
  allocations: StakerAllocation[];
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--card-bg)",
  border: "1px solid var(--card-border)",
  borderRadius: "var(--radius-md)",
  fontSize: 12,
};

export const AirdropDistributionChart = memo(function AirdropDistributionChart({
  allocations,
}: AirdropDistributionChartProps) {
  // Top 20 bar chart data
  const top20 = useMemo(
    () =>
      allocations.slice(0, 20).map((a, i) => ({
        label: `#${i + 1}`,
        address: a.address,
        allocation: a.allocation,
      })),
    [allocations]
  );

  // Histogram: distribution of allocation amounts
  const histogram = useMemo(() => {
    if (allocations.length === 0) return [];

    const max = allocations[0]?.allocation ?? 0;
    if (max === 0) return [];

    const BUCKET_COUNT = 20;
    const bucketSize = max / BUCKET_COUNT;
    const buckets: { range: string; count: number; from: number; to: number }[] = [];

    for (let i = 0; i < BUCKET_COUNT; i++) {
      const from = i * bucketSize;
      const to = (i + 1) * bucketSize;
      buckets.push({
        range: `${formatNumber(from, { compact: true })}–${formatNumber(to, { compact: true })}`,
        from,
        to,
        count: 0,
      });
    }

    for (const a of allocations) {
      const idx = Math.min(
        Math.floor(a.allocation / bucketSize),
        BUCKET_COUNT - 1
      );
      buckets[idx].count++;
    }

    return buckets;
  }, [allocations]);

  if (allocations.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top 20 Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 20 Allocations</CardTitle>
          <CardDescription>Largest individual airdrop amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={top20}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-secondary)"
                opacity={0.5}
              />
              <XAxis
                dataKey="label"
                stroke="var(--text-tertiary)"
                fontSize={11}
              />
              <YAxis
                stroke="var(--text-tertiary)"
                fontSize={12}
                tickFormatter={(v) => formatNumber(v, { compact: true })}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => [
                  `${formatNumber(Number(value), { decimals: 2 })} vTON`,
                  "Allocation",
                ]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.address
                    ? `${item.address.slice(0, 10)}...${item.address.slice(-6)}`
                    : label;
                }}
              />
              <Bar
                dataKey="allocation"
                fill="var(--fg-brand-primary)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribution Histogram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribution Histogram</CardTitle>
          <CardDescription>
            Number of stakers by allocation range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={histogram}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <defs>
                <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--fg-brand-primary)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--fg-brand-primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-secondary)"
                opacity={0.5}
              />
              <XAxis
                dataKey="range"
                stroke="var(--text-tertiary)"
                fontSize={10}
                angle={-30}
                textAnchor="end"
                height={50}
                interval={Math.max(0, Math.floor(histogram.length / 6) - 1)}
              />
              <YAxis
                stroke="var(--text-tertiary)"
                fontSize={12}
                label={{
                  value: "Stakers",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fill: "var(--text-tertiary)", fontSize: 11 },
                }}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => [
                  `${value} stakers`,
                  "Count",
                ]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--fg-brand-primary)"
                fill="url(#histGradient)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
});

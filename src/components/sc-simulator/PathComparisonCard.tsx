"use client";

import { Card } from "@/components/ui/card";
import type { ClassifiedFunction } from "@/lib/sc-action-classification";

interface PathComparisonCardProps {
  classifications: ClassifiedFunction[];
}

interface PathData {
  title: string;
  color: string;
  stats: { label: string; value: string }[];
}

function PathColumn({ data }: { data: PathData }) {
  return (
    <div className="flex-1 py-4 px-5">
      <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4 -ml-4">
        <span className={`inline-flex h-1.5 w-1.5 rounded-full ${data.color}`} />
        {data.title}
      </h3>
      <dl className="space-y-2.5">
        {data.stats.map((stat) => (
          <div key={stat.label} className="flex items-baseline justify-between gap-4 text-sm">
            <dt className="text-[var(--text-tertiary)] shrink-0">{stat.label}</dt>
            <dd className="font-medium text-[var(--text-primary)] text-right">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PathComparisonCard({ classifications }: PathComparisonCardProps) {
  const vetoFns = classifications.filter((f) => f.path === "veto-only");
  const directFns = classifications.filter((f) => f.path === "direct-execution");

  const vetoContracts = new Set(vetoFns.map((f) => f.contractId)).size;
  const directContracts = new Set(directFns.map((f) => f.contractId)).size;

  const veto: PathData = {
    title: "Veto-Only Path",
    color: "bg-[var(--fg-info)]",
    stats: [
      { label: "Steps", value: "5 steps" },
      { label: "Duration", value: "~14 days" },
      { label: "SC Role", value: "Cancel only (during timelock)" },
      { label: "Contracts", value: `${vetoContracts} contracts, ${vetoFns.length} functions` },
    ],
  };

  const direct: PathData = {
    title: "Direct Execution Path",
    color: "bg-[var(--fg-warning)]",
    stats: [
      { label: "Steps", value: "3 steps" },
      { label: "Duration", value: "Immediate" },
      { label: "SC Role", value: "Propose, approve & execute" },
      { label: "Contracts", value: `${directContracts} contracts, ${directFns.length} functions` },
    ],
  };

  return (
    <Card variant="outlined" padding="none">
      <div className="flex flex-col sm:flex-row sm:divide-x sm:divide-[var(--border-primary)]">
        <PathColumn data={veto} />
        <PathColumn data={direct} />
      </div>
    </Card>
  );
}

"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { ClassifiedFunction } from "@/lib/sc-action-classification";

interface PathComparisonCardProps {
  classifications: ClassifiedFunction[];
}

export function PathComparisonCard({
  classifications,
}: PathComparisonCardProps) {
  const vetoCount = classifications.filter(
    (f) => f.path === "veto-only"
  ).length;
  const directCount = classifications.filter(
    (f) => f.path === "direct-execution"
  ).length;

  const vetoContracts = new Set(
    classifications
      .filter((f) => f.path === "veto-only")
      .map((f) => f.contractId)
  ).size;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Veto-Only Path */}
      <Card variant="outlined">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--fg-info)]" />
            Veto-Only Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Steps</dt>
              <dd className="font-medium text-[var(--text-primary)]">
                5 steps
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Duration</dt>
              <dd className="font-medium text-[var(--text-primary)]">~14 days</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">SC Role</dt>
              <dd className="font-medium text-[var(--text-primary)]">
                Cancel only (during timelock)
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Contracts</dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {vetoContracts} contracts, {vetoCount} functions
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Direct Execution Path */}
      <Card variant="outlined">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--fg-warning)]" />
            Direct Execution Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Steps</dt>
              <dd className="font-medium text-[var(--text-primary)]">
                3 steps
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Duration</dt>
              <dd className="font-medium text-[var(--text-primary)]">
                Immediate
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">SC Role</dt>
              <dd className="font-medium text-[var(--text-primary)]">
                Propose, approve &amp; execute
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Actions</dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {directCount} action types
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

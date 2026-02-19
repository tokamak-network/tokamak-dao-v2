"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PathComparisonCard, PathBadge } from "@/components/sc-simulator";
import { useScClassification } from "@/hooks/useScClassification";
import type {
  ClassifiedFunction,
  GovernancePath,
} from "@/lib/sc-action-classification";

type PathFilter = "all" | GovernancePath;

export default function ScActionSimulatorPage() {
  const {
    classifications,
    isLoading,
    updateClassification,
    resetClassification,
    searchActions,
  } = useScClassification();

  const [searchQuery, setSearchQuery] = useState("");
  const [pathFilter, setPathFilter] = useState<PathFilter>("all");

  // Apply search + filter
  const filtered = useMemo(() => {
    let result = searchQuery ? searchActions(searchQuery) : classifications;
    if (pathFilter !== "all") {
      result = result.filter((fn) => fn.path === pathFilter);
    }
    return result;
  }, [searchQuery, pathFilter, searchActions, classifications]);

  const handleTogglePath = async (fn: ClassifiedFunction) => {
    const newPath: GovernancePath =
      fn.path === "veto-only" ? "direct-execution" : "veto-only";
    await updateClassification(fn, newPath);
  };

  const handleReset = async (fn: ClassifiedFunction) => {
    await resetClassification(fn.contractId, fn.signature);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          SC Action Simulator
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Explore how Security Council actions flow through governance paths.
        </p>
      </div>

      {/* Path Comparison Overview */}
      <PathComparisonCard classifications={classifications} />

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search functions or contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>
        <div className="flex gap-1">
          {(["all", "veto-only", "direct-execution"] as PathFilter[]).map(
            (f) => (
              <Button
                key={f}
                variant={pathFilter === f ? "primary" : "ghost"}
                size="sm"
                onClick={() => setPathFilter(f)}
              >
                {f === "all"
                  ? "All"
                  : f === "veto-only"
                    ? "Veto Only"
                    : "Direct"}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Flat Function List */}
      {isLoading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          Loading classifications...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          No functions match your search.
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((fn) => {
            const key = `${fn.contractId}::${fn.signature}`;

            return (
              <div
                key={key}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
              >
                {/* Function name */}
                <code className="text-sm font-mono font-semibold text-[var(--text-primary)] shrink-0">
                  {fn.functionName}
                </code>

                {/* Contract badge */}
                <Badge variant="outline" size="sm">
                  {fn.contractName}
                </Badge>

                {/* Parameters — each in its own pill */}
                {fn.parameters.length > 0 && (
                  <span className="hidden sm:flex items-center gap-1.5 min-w-0 overflow-hidden">
                    {fn.parameters.map((p, i) => (
                      <span key={`${p.name}-${i}`} className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                          <span className="text-[var(--text-tertiary)]">
                            {p.type}
                          </span>
                          {" "}
                          {p.name}
                        </span>
                      </span>
                    ))}
                  </span>
                )}

                {/* Spacer */}
                <span className="flex-1" />

                {/* Overridden indicator + reset */}
                {fn.isOverridden && (
                  <button
                    onClick={() => handleReset(fn)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors shrink-0"
                    title="Reset to default"
                  >
                    edited &times;
                  </button>
                )}

                {/* Path badge — clickable to toggle */}
                <button
                  onClick={() => handleTogglePath(fn)}
                  className="flex items-center gap-0.5 shrink-0 group"
                  title={`Switch to ${fn.path === "veto-only" ? "Direct Execution" : "Veto Only"}`}
                >
                  <PathBadge path={fn.path} size="sm" />
                  <svg
                    className="h-3 w-3 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      {!isLoading && (
        <p className="text-xs text-[var(--text-tertiary)] text-center">
          Showing {filtered.length} of {classifications.length} functions
          {classifications.filter((f) => f.isOverridden).length > 0 &&
            ` (${classifications.filter((f) => f.isOverridden).length} overridden)`}
        </p>
      )}
    </div>
  );
}

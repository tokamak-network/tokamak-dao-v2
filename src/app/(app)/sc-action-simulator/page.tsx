"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClassificationCriteria, PathComparisonCard, PathBadge } from "@/components/sc-simulator";
import { useScClassification } from "@/hooks/useScClassification";
import type {
  ClassifiedFunction,
  CriteriaTag,
  GovernancePath,
} from "@/lib/sc-action-classification";

type PathFilter = "all" | GovernancePath;

const CRITERIA_COLORS: Record<CriteriaTag, string> = {
  "Emergency Safety":        "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "Token Operations":        "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "Governance Participation": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "Ownership / Admin":       "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "Proxy Upgrades":          "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "Protocol Parameters":     "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "Treasury Operations":     "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "Registry / Address":      "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  "Governance Control":      "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export default function ScActionSimulatorPage() {
  const {
    classifications,
    isLoading,
    updateClassification,
    searchActions,
  } = useScClassification();

  const [searchQuery, setSearchQuery] = useState("");
  const [pathFilter, setPathFilter] = useState<PathFilter>("all");
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenDropdownKey(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Apply search + filter
  const filtered = useMemo(() => {
    let result = searchQuery ? searchActions(searchQuery) : classifications;
    if (pathFilter !== "all") {
      result = result.filter((fn) => fn.path === pathFilter);
    }
    return result;
  }, [searchQuery, pathFilter, searchActions, classifications]);

  const handleChangePath = async (
    fn: ClassifiedFunction,
    newPath: GovernancePath
  ) => {
    setOpenDropdownKey(null);
    if (fn.path !== newPath) {
      await updateClassification(fn, newPath);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <section className="py-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
          SC Action Simulator
        </h1>
        <p className="text-base text-[var(--text-secondary)] max-w-lg">
          Explore how Security Council actions flow through governance paths.
        </p>
      </section>

      {/* Path Comparison Overview */}
      <PathComparisonCard classifications={classifications} />

      {/* Classification Criteria */}
      <ClassificationCriteria />

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

                {/* Criteria tag + Path select dropdown */}
                <span className={`hidden sm:inline text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0 ${CRITERIA_COLORS[fn.criteria]}`}>
                  {fn.criteria}
                </span>
                <div className="relative shrink-0" ref={openDropdownKey === key ? dropdownRef : undefined}>
                  <button
                    onClick={() =>
                      setOpenDropdownKey(openDropdownKey === key ? null : key)
                    }
                    className="flex items-center gap-0.5 group"
                  >
                    <PathBadge path={fn.path} size="sm" />
                    <svg
                      className={`h-3 w-3 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-transform ${openDropdownKey === key ? "rotate-180" : ""}`}
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

                  {openDropdownKey === key && (
                    <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-lg py-1">
                      {(
                        [
                          { value: "veto-only" as GovernancePath, label: "VETO ONLY", variant: "info" },
                          { value: "direct-execution" as GovernancePath, label: "DIRECT EXECUTION", variant: "warning" },
                        ] as const
                      ).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleChangePath(fn, option.value)}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          <span className="w-4 text-center">
                            {fn.path === option.value && (
                              <svg className="h-3.5 w-3.5 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <Badge variant={option.variant} size="sm">
                            {option.label}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      {!isLoading && (
        <p className="text-xs text-[var(--text-tertiary)] text-center">
          Showing {filtered.length} of {classifications.length} functions
        </p>
      )}
    </div>
  );
}

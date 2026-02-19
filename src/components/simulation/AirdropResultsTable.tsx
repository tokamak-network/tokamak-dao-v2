"use client";

import { memo, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatAddress, formatNumber } from "@/lib/utils";
import type { StakerAllocation } from "@/lib/airdrop";

const ROWS_PER_PAGE = 50;

interface AirdropResultsTableProps {
  allocations: StakerAllocation[];
}

export const AirdropResultsTable = memo(function AirdropResultsTable({
  allocations,
}: AirdropResultsTableProps) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return allocations;
    const q = search.toLowerCase();
    return allocations.filter((a) => a.address.toLowerCase().includes(q));
  }, [allocations, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePageIndex = Math.min(page, totalPages - 1);
  const pageData = filtered.slice(
    safePageIndex * ROWS_PER_PAGE,
    (safePageIndex + 1) * ROWS_PER_PAGE
  );

  const exportCSV = useCallback(() => {
    const header =
      "Rank,Address,Total Deposited (TON),Net Staked (TON),Duration (days),Score,Allocation (vTON),Share (%)";
    const rows = allocations.map(
      (a, i) =>
        `${i + 1},${a.address},${a.totalDeposited.toFixed(2)},${a.netStaked.toFixed(2)},${a.durationDays.toFixed(1)},${a.score.toFixed(2)},${a.allocation.toFixed(2)},${a.percentage.toFixed(4)}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "airdrop-simulation.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [allocations]);

  // Reset page when search changes
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Allocation Details</CardTitle>
            <CardDescription>
              {filtered.length.toLocaleString()} stakers
              {search && ` matching "${search}"`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search address..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-8 px-3 text-sm bg-[var(--input-bg)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] border border-[var(--input-border)] rounded-[var(--input-radius)] hover:border-[var(--input-border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--input-border-focus)] focus:ring-offset-1 w-48"
            />
            <Button variant="secondary" size="sm" onClick={exportCSV}>
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <Th align="left">Rank</Th>
                <Th align="left">Address</Th>
                <Th align="right">Total Deposited</Th>
                <Th align="right">Net Staked</Th>
                <Th align="right">Duration</Th>
                <Th align="right">Score</Th>
                <Th align="right">Allocation</Th>
                <Th align="right">Share</Th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((row) => {
                // Find original rank (index in full sorted allocations)
                const rank = search
                  ? allocations.findIndex((a) => a.address === row.address) + 1
                  : safePageIndex * ROWS_PER_PAGE +
                    pageData.indexOf(row) +
                    1;
                return (
                  <tr
                    key={row.address}
                    className="border-b border-[var(--border-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <Td align="left">{rank}</Td>
                    <Td align="left" mono>
                      {formatAddress(row.address, 6)}
                    </Td>
                    <Td align="right" mono>
                      {formatNumber(row.totalDeposited, { decimals: 2 })}
                    </Td>
                    <Td align="right" mono>
                      {formatNumber(row.netStaked, { decimals: 2 })}
                    </Td>
                    <Td align="right" mono>
                      {row.durationDays.toFixed(1)}d
                    </Td>
                    <Td align="right" mono>
                      {formatNumber(row.score, { compact: true })}
                    </Td>
                    <Td align="right" mono>
                      {formatNumber(row.allocation, { decimals: 2 })}
                    </Td>
                    <Td align="right" mono>
                      {row.percentage.toFixed(2)}%
                    </Td>
                  </tr>
                );
              })}
              {pageData.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-[var(--text-tertiary)]"
                  >
                    No eligible stakers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-[var(--text-tertiary)]">
              Page {safePageIndex + 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="xs"
                disabled={safePageIndex === 0}
                onClick={() => setPage(safePageIndex - 1)}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="xs"
                disabled={safePageIndex >= totalPages - 1}
                onClick={() => setPage(safePageIndex + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align: "left" | "right";
}) {
  return (
    <th
      className={`py-2 px-3 text-[var(--text-secondary)] font-medium whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  mono,
}: {
  children: React.ReactNode;
  align: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      className={`py-2 px-3 text-[var(--text-primary)] whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      } ${mono ? "font-mono" : ""}`}
    >
      {children}
    </td>
  );
}

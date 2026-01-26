"use client";

import { cn } from "@/lib/utils";

/**
 * Skeleton loading component
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-[var(--bg-tertiary)]",
        className
      )}
      {...props}
    />
  );
}

/**
 * Dashboard Skeleton
 * Full page loading skeleton matching the dashboard layout
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-6 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]"
          >
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Two Column Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Proposals Skeleton */}
        <div className="p-6 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="flex justify-between mb-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>

        {/* Top Delegators Skeleton */}
        <div className="p-6 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]">
          <div className="flex justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAO Parameters Skeleton */}
        <div className="p-6 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex justify-between py-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* My Status Skeleton */}
        <div className="p-6 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]">
          <Skeleton className="h-6 w-24 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between py-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Council Skeleton */}
      <div className="p-6 rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

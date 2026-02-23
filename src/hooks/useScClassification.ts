"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useChainId } from "wagmi";
import {
  type ClassifiedFunction,
  type GovernancePath,
  type SupabaseOverride,
  groupByContract,
} from "@/lib/sc-action-classification";

export function useScClassification() {
  const chainId = useChainId();
  const [classifications, setClassifications] = useState<ClassifiedFunction[]>(
    []
  );
  const [, setOverrides] = useState<SupabaseOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch merged classifications from API (server-side computation)
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sc-classification?network=${chainId}`);
      if (res.ok) {
        const data = await res.json();
        setClassifications(data.classifications ?? []);
        setOverrides(data.overrides ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update (or create) an override, then re-fetch
  const updateClassification = useCallback(
    async (
      fn: ClassifiedFunction,
      newPath: GovernancePath,
      updatedBy?: string
    ) => {
      const res = await fetch("/api/sc-classification", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_id: fn.contractId,
          contract_name: fn.contractName,
          function_signature: fn.signature,
          function_name: fn.functionName,
          path: newPath,
          updated_by: updatedBy ?? null,
          network: chainId,
        }),
      });

      if (!res.ok) throw new Error("Failed to update classification");

      // Re-fetch to get fresh merged data
      await fetchData();
    },
    [chainId, fetchData]
  );

  // Remove an override (restore default), then re-fetch
  const resetClassification = useCallback(
    async (contractId: string, signature: string) => {
      const res = await fetch(
        `/api/sc-classification?contract_id=${encodeURIComponent(contractId)}&function_signature=${encodeURIComponent(signature)}&network=${chainId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to reset classification");

      await fetchData();
    },
    [chainId, fetchData]
  );

  // Search across all classifications
  const searchActions = useCallback(
    (query: string): ClassifiedFunction[] => {
      if (!query.trim()) return classifications;
      const q = query.toLowerCase();
      return classifications.filter(
        (fn) =>
          fn.functionName.toLowerCase().includes(q) ||
          fn.contractName.toLowerCase().includes(q) ||
          fn.signature.toLowerCase().includes(q)
      );
    },
    [classifications]
  );

  // Group by contract
  const grouped = useMemo(
    () => groupByContract(classifications),
    [classifications]
  );

  // Filter by path
  const filterByPath = useCallback(
    (path: GovernancePath): ClassifiedFunction[] =>
      classifications.filter((fn) => fn.path === path),
    [classifications]
  );

  return {
    classifications,
    grouped,
    isLoading,
    updateClassification,
    resetClassification,
    searchActions,
    filterByPath,
  };
}

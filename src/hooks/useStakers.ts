"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllStakers } from "@/lib/subgraph";

export function useStakers() {
  return useQuery({
    queryKey: ["stakers"],
    queryFn: fetchAllStakers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

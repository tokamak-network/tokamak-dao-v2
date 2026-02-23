"use client";

import { useState, useEffect, useCallback } from "react";
import { useChainId } from "wagmi";

export interface DelegateProfile {
  id: number;
  address: string;
  network: number;
  display_name: string | null;
  avatar_url: string | null;
  statement: string | null;
  voting_philosophy: string | null;
  interests: string[] | null;
  twitter: string | null;
  discord: string | null;
  github: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export function useDelegateProfile(address?: string) {
  const chainId = useChainId();
  const [profile, setProfile] = useState<DelegateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/delegate-profile?address=${encodeURIComponent(address)}&network=${chainId}`
      );
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
    } catch {
      // Silently fail — profile is optional
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (data: Partial<Omit<DelegateProfile, "id" | "created_at" | "updated_at" | "network">>) => {
      if (!address) throw new Error("No address provided");

      const res = await fetch("/api/delegate-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, network: chainId, ...data }),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      await fetchProfile();
    },
    [address, chainId, fetchProfile]
  );

  return { profile, isLoading, updateProfile };
}

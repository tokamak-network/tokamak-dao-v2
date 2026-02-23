"use client";

import { use } from "react";
import { isAddress } from "viem";
import { notFound } from "next/navigation";
import { DelegateProfile } from "@/components/delegates/DelegateProfile";

export default function DelegateProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);

  if (!isAddress(address)) {
    notFound();
  }

  return <DelegateProfile address={address as `0x${string}`} />;
}

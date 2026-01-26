"use client";

import dynamic from "next/dynamic";

// SSR 비활성화 - 하이드레이션 미스매치 방지
const CustomConnectButton = dynamic(
  () => import("@/components/wallet").then((mod) => mod.CustomConnectButton),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-[140px] animate-pulse rounded-lg bg-[var(--bg-tertiary)]" />
    ),
  }
);

/**
 * Connect Wallet Button - CustomConnectButton 렌더링 (클라이언트 전용)
 */
export function ConnectWalletButton() {
  return <CustomConnectButton />;
}

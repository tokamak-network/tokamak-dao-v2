'use client';

import * as React from 'react';
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiAdapter, projectId, networks, metadata } from '@/config/wagmi';
import { WalletConnectionProvider } from '@/hooks/useWalletConnection';

// Initialize AppKit at module level (must be outside component)
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  features: {
    analytics: true,
    email: false,
    socials: [],
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#3376f7',
    '--w3m-border-radius-master': '8px',
  },
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // SSR-safe QueryClient 생성 - 모듈 레벨이 아닌 컴포넌트 내부에서 생성
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletConnectionProvider>
          {children}
        </WalletConnectionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

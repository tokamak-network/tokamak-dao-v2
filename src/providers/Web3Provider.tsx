'use client';

import * as React from 'react';
import { RainbowKitProvider, lightTheme, darkTheme, type Theme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/config/wagmi';
import { WalletConnectionProvider } from '@/hooks/useWalletConnection';

// Shared theme configuration
const sharedConfig = {
  borderRadius: 'medium' as const,
  fontStack: 'system' as const,
  overlayBlur: 'small' as const,
};

// Custom RainbowKit light theme matching our design system
const customLightTheme = lightTheme({
  accentColor: '#3376f7', // --color-primary-500
  accentColorForeground: '#ffffff',
  ...sharedConfig,
});

// Custom RainbowKit dark theme matching our design system
const customDarkTheme = darkTheme({
  accentColor: '#3376f7', // --color-primary-500
  accentColorForeground: '#ffffff',
  ...sharedConfig,
});

// Override specific light theme properties
const tokamakLightTheme: Theme = {
  ...customLightTheme,
  colors: {
    ...customLightTheme.colors,
    // Modal backgrounds
    modalBackground: '#ffffff',
    modalBackdrop: 'rgba(0, 0, 0, 0.5)',
    // General backgrounds
    generalBorder: '#d0d5dd', // --color-gray-300
    generalBorderDim: '#eaecf0', // --color-gray-200
    // Action button (connected state)
    connectButtonBackground: '#ffffff',
    connectButtonBackgroundError: '#fef2f2',
    connectButtonInnerBackground: '#f9fafb', // --color-gray-50
    connectButtonText: '#344054', // --color-gray-700
    connectButtonTextError: '#dc2626',
    // Profile action
    profileAction: '#f9fafb',
    profileActionHover: '#f2f4f7',
    profileForeground: '#ffffff',
    // Menu
    menuItemBackground: '#f9fafb',
    // Text colors
    modalText: '#101828', // --color-gray-900
    modalTextDim: '#667085', // --color-gray-500
    modalTextSecondary: '#475467', // --color-gray-600
    // Shadows
    selectedOptionBorder: '#3376f7',
  },
  shadows: {
    ...customLightTheme.shadows,
    connectButton: '0 1px 2px 0 rgba(16, 24, 40, 0.05)',
    dialog: '0 24px 48px -12px rgba(16, 24, 40, 0.18)',
    profileDetailsAction: '0 1px 2px 0 rgba(16, 24, 40, 0.05)',
    selectedOption: '0 0 0 4px rgba(51, 118, 247, 0.24)',
    selectedWallet: '0 0 0 4px rgba(51, 118, 247, 0.24)',
    walletLogo: '0 1px 2px 0 rgba(16, 24, 40, 0.05)',
  },
  radii: {
    ...customLightTheme.radii,
    actionButton: '8px',
    connectButton: '8px',
    menuButton: '8px',
    modal: '16px', // --modal-radius
    modalMobile: '16px',
  },
};

// Override specific dark theme properties
const tokamakDarkTheme: Theme = {
  ...customDarkTheme,
  colors: {
    ...customDarkTheme.colors,
    // Modal backgrounds
    modalBackground: '#1c1c1e', // dark bg
    modalBackdrop: 'rgba(0, 0, 0, 0.7)',
    // General backgrounds
    generalBorder: '#3a3a3c',
    generalBorderDim: '#2c2c2e',
    // Action button (connected state)
    connectButtonBackground: '#2c2c2e',
    connectButtonBackgroundError: '#450a0a',
    connectButtonInnerBackground: '#1c1c1e',
    connectButtonText: '#f5f5f5',
    connectButtonTextError: '#fca5a5',
    // Profile action
    profileAction: '#2c2c2e',
    profileActionHover: '#3a3a3c',
    profileForeground: '#1c1c1e',
    // Menu
    menuItemBackground: '#2c2c2e',
    // Text colors
    modalText: '#f5f5f5',
    modalTextDim: '#a1a1aa',
    modalTextSecondary: '#d4d4d8',
    // Shadows
    selectedOptionBorder: '#3376f7',
  },
  shadows: {
    ...customDarkTheme.shadows,
    connectButton: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    dialog: '0 24px 48px -12px rgba(0, 0, 0, 0.5)',
    profileDetailsAction: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    selectedOption: '0 0 0 4px rgba(51, 118, 247, 0.32)',
    selectedWallet: '0 0 0 4px rgba(51, 118, 247, 0.32)',
    walletLogo: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  },
  radii: {
    ...customDarkTheme.radii,
    actionButton: '8px',
    connectButton: '8px',
    menuButton: '8px',
    modal: '16px', // --modal-radius
    modalMobile: '16px',
  },
};

/**
 * RainbowKit 초기화 래퍼
 *
 * wagmi 상태 복원이 완료된 후 RainbowKitProvider를 마운트하여
 * 모달 포털이 올바르게 생성되도록 함
 */
function RainbowKitWithHydration({ children }: { children: React.ReactNode }) {
  const { isReconnecting } = useAccount();
  const [rainbowKitKey, setRainbowKitKey] = React.useState(0);
  const hasReconnectedRef = React.useRef(false);

  React.useEffect(() => {
    // isReconnecting이 true에서 false로 바뀌면 reconnect 완료
    // 이 시점에 RainbowKitProvider를 리마운트하여 모달 포털 재생성
    if (!isReconnecting && !hasReconnectedRef.current) {
      hasReconnectedRef.current = true;
      // 약간의 지연 후 리마운트 (wagmi 상태 안정화 대기)
      const timer = setTimeout(() => {
        setRainbowKitKey(prev => prev + 1);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isReconnecting]);

  return (
    <RainbowKitProvider
      key={rainbowKitKey}
      theme={tokamakDarkTheme}
      modalSize="compact"
    >
      {children}
    </RainbowKitProvider>
  );
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // SSR-safe QueryClient 생성 - 모듈 레벨이 아닌 컴포넌트 내부에서 생성
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletConnectionProvider>
          <RainbowKitWithHydration>
            {children}
          </RainbowKitWithHydration>
        </WalletConnectionProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

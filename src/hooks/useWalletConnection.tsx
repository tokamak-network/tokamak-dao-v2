"use client";

import * as React from "react";
import { useAppKitAccount } from "@reown/appkit/react";

/**
 * Wallet connection context for consistent state across all components
 */
interface WalletConnectionContextValue {
  /** Whether the app has completed hydration and connection restoration */
  isReady: boolean;
  /** Whether the wallet is connected */
  isConnected: boolean;
  /** Connected wallet address */
  address: `0x${string}` | undefined;
}

const WalletConnectionContext = React.createContext<WalletConnectionContextValue | null>(null);

/**
 * Provider that manages wallet connection state centrally
 * This ensures all components see the same connection state at the same time
 */
export function WalletConnectionProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, status } = useAppKitAccount();
  const [isReady, setIsReady] = React.useState(false);

  // Mark as ready when AppKit reaches a stable state
  // status: 'connecting' | 'reconnecting' | 'connected' | 'disconnected'
  React.useEffect(() => {
    const isStable =
      status === 'connected' ||   // Connected
      status === 'disconnected';  // Not connected (confirmed)

    if (isStable && !isReady) {
      setIsReady(true);
    }
  }, [status, isReady]);

  const value = React.useMemo(
    () => ({
      isReady,
      isConnected,
      address: address as `0x${string}` | undefined,
    }),
    [isReady, isConnected, address]
  );

  return (
    <WalletConnectionContext.Provider value={value}>
      {children}
    </WalletConnectionContext.Provider>
  );
}

/**
 * Hook to get consistent wallet connection state
 * Use this instead of useAccount() in components that need to show connection status
 */
export function useWalletConnection() {
  const context = React.useContext(WalletConnectionContext);

  if (!context) {
    throw new Error("useWalletConnection must be used within WalletConnectionProvider");
  }

  return context;
}

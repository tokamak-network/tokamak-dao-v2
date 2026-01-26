"use client";

import * as React from "react";
import { useAccount } from "wagmi";

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
  const { address, status } = useAccount();
  const [isReady, setIsReady] = React.useState(false);

  // Mark as ready when wagmi reaches a stable state
  React.useEffect(() => {
    // 'connecting' with address = connected (RainbowKit pattern - wagmi may stay in 'connecting' but address is available)
    // 'connected' = connected (normal case)
    // 'disconnected' = not connected (stable state)
    const isStable =
      (status === 'connecting' && !!address) ||  // Connected (address available)
      status === 'connected' ||                   // Connected (normal case)
      status === 'disconnected';                  // Not connected (confirmed)

    if (isStable && !isReady) {
      setIsReady(true);
    }
  }, [status, address, isReady]);

  // Determine connection based on address presence (matches RainbowKit behavior)
  const isConnected = !!address;

  const value = React.useMemo(
    () => ({
      isReady,
      isConnected,
      address,
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

'use client';

import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';

export function WalletConnect() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const { data: balance } = useBalance({ address: address as `0x${string}` | undefined });

  return (
    <div className="flex flex-col items-center gap-6">
      <Button
        variant="primary"
        size="lg"
        onClick={() => open()}
      >
        {isConnected ? 'Open Wallet' : 'Connect Wallet'}
      </Button>

      {isConnected && address && (
        <div className="mt-4 p-6 rounded-xl bg-zinc-100 dark:bg-zinc-900 w-full max-w-md">
          <h2 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
            Wallet Info
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Address:</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Network:</span>
              <span className="text-zinc-900 dark:text-zinc-100">
                {caipNetwork?.name ?? 'Unknown'}
              </span>
            </div>
            {balance && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Balance:</span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {parseFloat(formatEther(balance.value)).toFixed(4)} {balance.symbol}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

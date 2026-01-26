'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });

  return (
    <div className="flex flex-col items-center gap-6">
      <ConnectButton />

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
                {chain?.name ?? 'Unknown'}
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

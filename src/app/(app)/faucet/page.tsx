"use client";

import { useChainId } from "wagmi";
import { FaucetCard } from "@/components/faucet";
import { SANDBOX_CHAIN_ID } from "@/config/wagmi";

/**
 * Testnet Faucet Page
 *
 * Allows users to claim free vTON and TON tokens for testing governance features
 * such as delegation, voting, and creating proposals on the testnet.
 */
export default function FaucetPage() {
  const chainId = useChainId();
  const isLocalhost = chainId === 1337 || chainId === SANDBOX_CHAIN_ID;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="py-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
          Testnet Faucet
        </h1>
        <p className="text-base text-[var(--text-secondary)] max-w-lg">
          Claim free vTON and TON tokens for testing governance features
        </p>
      </section>

      {/* Faucet Card */}
      <FaucetCard />

      {/* ETH Faucet Notice - only show for Sepolia */}
      {!isLocalhost && (
        <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-secondary)]">
          <p className="text-sm text-[var(--text-secondary)]">
            Need Sepolia ETH for gas fees?{" "}
            <a
              href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-brand)] hover:underline font-medium"
            >
              Get free testnet ETH from Google Cloud Faucet
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

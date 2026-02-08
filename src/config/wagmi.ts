import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, sepolia, localhost } from '@reown/appkit/networks';
import type { AppKitNetwork } from '@reown/appkit/networks';
import { cookieStorage, createStorage } from 'wagmi';
import { http, custom, defineChain } from 'viem';

// Sandbox uses a distinct chain ID so MetaMask gets a fresh RPC entry
// (wallet_addEthereumChain can't update RPC for existing chains like 1337)
export const SANDBOX_CHAIN_ID = 13371;

// Sandbox RPC URL (set when sandbox session starts)
let sandboxRpcUrl: string | null = null;

export function setSandboxRpcUrl(url: string | null): void {
  sandboxRpcUrl = url;
}

export function getSandboxRpcUrl(): string | null {
  return sandboxRpcUrl;
}

// Sandbox chain definition
const sandboxChain = defineChain({
  id: SANDBOX_CHAIN_ID,
  name: 'Tokamak Sandbox',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
  },
});

// Sandbox transport: routes RPC calls to the sandbox proxy URL
function createSandboxTransport() {
  return custom({
    async request({ method, params }) {
      if (!sandboxRpcUrl) {
        throw new Error('Sandbox not active');
      }
      let response: Response;
      try {
        response = await fetch(sandboxRpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
          signal: AbortSignal.timeout(30_000),
        });
      } catch (err) {
        // Timeout or network error — machine is likely dead
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sandbox-rpc-error'));
        }
        throw new Error('Sandbox connection timed out — the machine may have expired');
      }
      if (!response.ok) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sandbox-rpc-error'));
        }
        const errData = await response.json().catch(() => ({ error: { message: 'Sandbox unavailable' } }));
        throw new Error(errData.error?.message || `RPC error: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'RPC Error');
      }
      return data.result;
    },
  }, { retryCount: 0 });
}

export const projectId = 'ed9db8435ea432ec164cf02c06c0b969';
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [localhost, sandboxChain as AppKitNetwork, mainnet, sepolia];

const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

export const metadata = {
  name: 'Tokamak DAO',
  description: 'Tokamak DAO Governance Platform',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://tokamak.network',
  icons: ['/favicon.ico'],
};

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  networks,
  projectId,
  transports: {
    [localhost.id]: http(),
    [sandboxChain.id]: createSandboxTransport(),
    [mainnet.id]: alchemyApiKey
      ? http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`)
      : http(),
    [sepolia.id]: alchemyApiKey
      ? http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`)
      : http(),
  },
});

export const config = wagmiAdapter.wagmiConfig;

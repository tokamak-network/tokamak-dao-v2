import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, sepolia, localhost } from '@reown/appkit/networks';
import type { AppKitNetwork } from '@reown/appkit/networks';
import { cookieStorage, createStorage } from 'wagmi';

export const projectId = 'ed9db8435ea432ec164cf02c06c0b969';
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [localhost, mainnet, sepolia];

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
});

export const config = wagmiAdapter.wagmiConfig;

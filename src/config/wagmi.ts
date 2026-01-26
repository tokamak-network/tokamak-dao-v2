import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  coinbaseWallet,
  walletConnectWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { mainnet, sepolia, localhost } from 'wagmi/chains';

const projectId = 'ed9db8435ea432ec164cf02c06c0b969';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Installed',
      wallets: [
        // injectedWallet will detect MetaMask, Rivet, and other browser extension wallets
        injectedWallet,
      ],
    },
    {
      groupName: 'Other Wallets',
      wallets: [
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: 'Tokamak DAO',
    projectId,
  }
);

export const config = createConfig({
  connectors,
  chains: [localhost, mainnet, sepolia],
  transports: {
    [localhost.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});

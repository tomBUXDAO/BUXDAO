import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
  GlowWalletAdapter,
} from '@solana/wallet-adapter-wallets';

export const network = WalletAdapterNetwork.Mainnet;
export const endpoint = clusterApiUrl(network);

export const getWallets = () => {
  return [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new BackpackWalletAdapter(),
    new GlowWalletAdapter(),
  ];
}; 
import { http, createConfig } from "@wagmi/core";
import {
  baseSepolia
} from "@wagmi/core/chains";
import { createWalletClient, custom } from 'viem'
// import { base } from 'viem/chains'

export const config = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
   
  },
});

export const walletClient = typeof window !== "undefined" && window.ethereum
  ? createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum),
    })
  : null;


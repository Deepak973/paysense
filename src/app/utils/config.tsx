import { http, createConfig } from "@wagmi/core";
import {
  base
} from "@wagmi/core/chains";
import { createWalletClient, custom } from 'viem'
// import { base } from 'viem/chains'

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
   
  },
});

export const walletClient = createWalletClient({
  chain: base,
  transport: custom(window.ethereum!),
})


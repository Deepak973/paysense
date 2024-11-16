import { getPublicClient } from "@wagmi/core";
import { config } from "@/app/utils/config";
import {
  baseSepolia,
} from "@wagmi/core/chains";

// Define a union type of allowed chain IDs
type AllowedChainIds =
  typeof baseSepolia.id
 

// Utility function to initialize a client for a specific chain
export const initializeClient = (chainId: AllowedChainIds) => {
  const client = getPublicClient(config, { chainId });
  return client;
};



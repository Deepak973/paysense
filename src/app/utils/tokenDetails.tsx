import { createPublicClient, http } from "viem";
import erc20Abi from "../Contract/ERC20ABI.json";
import { getContract } from "viem";
import { base } from "viem/chains";
import { getChainId } from '@wagmi/core';
import { initializeClient } from "./publicClient";
import { config } from "@/app/utils/config";


interface TokenDetails {
  name: string;
  symbol: string;
  decimals: string;
  balance: bigint;
}




// Define the function with proper types for parameters and return value
export async function getTokenDetails(TokenAddress: string, userAddress: string): Promise<TokenDetails | null> {

    const chainId = getChainId(config);
    const client = initializeClient(chainId);
  try {
    const contract = getContract({
      address: TokenAddress as `0x${string}`, // Ensure the address is of the right format
      abi: erc20Abi.abi,
      client: client,
    });
    const name: any = await contract.read.name();
    const symbol: any = await contract.read.symbol();
    const decimals: any = await contract.read.decimals(); // Assuming decimals is returned as a number
    const balance: any = await contract.read.balanceOf([userAddress as `0x${string}`]); // Ensure address is of the right format

    console.log(name)
    // console.log(balance);
    return {
      name,
      symbol,
      decimals: decimals.toString(),
      balance: balance,
    };
  } catch (error: any) {
    console.log("loading token error", error.message);
    return null;
  }
}

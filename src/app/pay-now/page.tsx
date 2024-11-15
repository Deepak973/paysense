"use client";
import React, { useEffect, useState } from "react";
import { ethers, parseEther, parseUnits } from "ethers";
import PaySenseApp from "../Components/PaySense";
import { walletClient } from "../utils/config";
import { useAccount, useWriteContract } from "wagmi";
import { Address, formatUnits } from "viem";
import erc20Abi from "../Contract/ERC20ABI.json";
import { getTokenDetails } from "../utils/tokenDetails";

interface TokenDetails {
  name: string;
  symbol: string;
  decimals: string;
  balance: bigint;
}

function Page() {
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [isERC20, setIsERC20] = useState<boolean>(false);
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);

  const loadTokenDetails = async () => {
    if (tokenAddress && address) {
      try {
        const details = await getTokenDetails(tokenAddress, address);
        console.log(details);
        setTokenDetails(details);
      } catch (error) {
        console.error("Error fetching token details:", error);
      }
    }
  };

  useEffect(() => {
    if (isERC20 && tokenAddress && address) {
      loadTokenDetails();
    }
  }, [isERC20, tokenAddress, address]);

  const handleSendTransaction = async () => {
    if (!recipientAddress || !amount) {
      alert("Please enter a valid address and amount.");
      return;
    }

    if (isERC20 && tokenAddress) {
      try {
        if (!tokenDetails) {
          alert("Token details are not loaded yet.");
          return;
        }

        const tx =await writeContractAsync({
          address: tokenAddress as Address,
          abi: erc20Abi.abi,
          functionName: "transfer",
          args: [
            recipientAddress,
            parseUnits(amount, tokenDetails?.decimals),
          ],
        });
        console.log()

        alert("ERC-20 Token Transfer Successful!");
      } catch (error) {
        alert("Error during ERC-20 token transfer: ");
      }
    } else {
      // Native Token (ETH) Transfer
      try {
        const tx = await walletClient.sendTransaction({
          account: address as Address,
          to: recipientAddress as `0x${string}`,
          value: parseEther(amount),
        });

        console.log("Transaction Hash", tx);

        alert("Native Token (ETH) Transfer Successful!");
      } catch (error) {
        alert("Error during native token transfer: ");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-6xl w-full text-gray-800 flex justify-between">
        <div className="w-full max-w-lg">
          <h1 className="text-center text-3xl font-bold text-gray-800 mb-6">Send Funds</h1>

          {/* Ethereum address input */}
          <input
            type="text"
            placeholder="Enter Ethereum Address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="w-full p-4 rounded-md border border-gray-300 mb-4 text-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Amount input */}
          <input
            type="text"
            placeholder="Enter Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-4 rounded-md border border-gray-300 mb-4 text-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Toggle for ERC20 vs Native Token */}
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="isERC20"
              checked={isERC20}
              onChange={() => setIsERC20(!isERC20)}
              className="mr-2"
            />
            <label htmlFor="isERC20" className="text-lg text-gray-800">Send ERC-20 Token</label>
          </div>

          {/* ERC20 Token Address Input (if ERC-20 selected) */}
          {isERC20 && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter ERC-20 Token Address"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="w-full p-4 rounded-md border border-gray-300 mb-4 text-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Token Details Display */}
          {isERC20 && tokenDetails && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Token Details</h2>
              <p><strong>Name:</strong> {tokenDetails.name}</p>
              <p><strong>Symbol:</strong> {tokenDetails.symbol}</p>
              <p><strong>Balance:</strong> {formatUnits(tokenDetails.balance, Number(tokenDetails.decimals))} </p>
            </div>
          )}

          {/* Button to initiate transaction */}
          <button
            onClick={handleSendTransaction}
            className="w-full bg-blue-500 text-white p-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isERC20 ? "Send ERC-20 Token" : "Send Native Token"}
          </button>
        </div>

        <div className="w-full max-w-md">
          <PaySenseApp address={recipientAddress} />
        </div>
      </div>
    </div>
  );
}

export default Page;

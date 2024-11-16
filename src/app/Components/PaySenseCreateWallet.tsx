"use client";
import React, { useState, useEffect } from "react";
import { ethers, parseEther } from "ethers";
import { useAccount, useWriteContract } from "wagmi";
import { Wallet, Users } from "lucide-react";
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/app/utils/config';
import Link from "next/link";
import multisigFactoryAbi from "../Contract/PaysenseFactoryABI.json";

interface WalletType {
  owners: string[];
  numConfirmationsRequired: number;
  createdAt: string;
  walletAddress: string;
  chain: string;
}

function PaySenseCreateWallet() {
  const [owners, setOwners] = useState<string[]>([""]);
  const [numConfirmationsRequired, setNumConfirmationsRequired] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [wallets, setWallets] = useState<WalletType[]>([]);

  const fetchWallets = async () => {
    try {
      const res = await fetch(`/api/wallets?ownerAddress=${address}`);
      const data = await res.json();
      if (res.ok) {
        setWallets(data.wallets);
      }
    } catch (error) {
      console.error("Error fetching wallets:", error);
    }
  };

  useEffect(() => {
    if (address) {
      fetchWallets();
    }
  }, [address]);

  const handleCreateWallet = async () => {
    if (owners.some(owner => !owner) || !numConfirmationsRequired) {
      setSuccessMessage("Please fill out all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      const tx = await writeContractAsync({
        address: "0x8E0B8D2854ee5f764cF996250F5D388fb57ec42F",
        abi: multisigFactoryAbi,
        functionName: "createWallet",
        args: ["5224473277236331295", "0x8E0B8D2854ee5f764cF996250F5D388fb57ec42F", owners, numConfirmationsRequired],
        value: parseEther("0.0001"),
      });

      const receipt = await waitForTransactionReceipt(config as any, { hash: tx });
      const eventTopic = ethers.id("WalletCreated(address,address[],uint256)");
      const event = receipt.logs.find(log => log.topics[0] === eventTopic);

      if (event) {
        const walletAddress = ethers.getAddress(`0x${(event.topics[1])?.slice(-40)}`);
        
        await Promise.all([
          fetch("/api/wallets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              owners,
              numConfirmationsRequired,
              createdBy: address,
              walletAddress,
              chain: "Base"
            }),
          }),
          fetch("/api/wallets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              owners,
              numConfirmationsRequired,
              createdBy: address,
              walletAddress,
              chain: "Optimism"
            }),
          })
        ]);

        setSuccessMessage("Multisig wallet created successfully!");
        fetchWallets();
      }
    } catch (error) {
      console.error("Error creating multisig wallet:", error);
      setSuccessMessage("Error creating multisig wallet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const WalletCard = ({ wallet }: { wallet: WalletType }) => (
    <Link href={`/pay-now/${wallet.walletAddress}`}>
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer border border-gray-200">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="font-semibold text-black text-lg">Wallet Details</span>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
              {wallet.chain}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-black">Address</span>
              <span className="text-sm text-black font-mono">
                {`${wallet.walletAddress.slice(0, 6)}...${wallet.walletAddress.slice(-4)}`}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium text-black">Required Confirmations</span>
              <span className="text-black">{wallet.numConfirmationsRequired}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium text-black">Created</span>
              <span className="text-black">
                {new Date(wallet.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="font-medium text-black">Members</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                {wallet.owners.map((owner, idx) => (
                  <div key={idx} className="text-sm text-black font-mono">
                    {`${owner.slice(0, 6)}...${owner.slice(-4)}`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Creation Form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-black">
              <Wallet className="w-6 h-6" />
              Create MultiSig Wallet
            </h1>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-black">Wallet Owners</label>
              {owners.map((owner, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Owner ${index + 1} address`}
                    value={owner}
                    onChange={(e) => {
                      const newOwners = [...owners];
                      newOwners[index] = e.target.value;
                      setOwners(newOwners);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-black"
                  />
                  {index === owners.length - 1 && (
                    <button
                      onClick={() => setOwners([...owners, ""])}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-black"
                    >
                      Add Owner
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Required Confirmations
              </label>
              <input
                type="number"
                min="1"
                max={owners.length}
                value={numConfirmationsRequired}
                onChange={(e) => setNumConfirmationsRequired(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-black"
              />
            </div>

            {successMessage && (
              <div className={`p-4 rounded-lg ${
                successMessage.includes("Error") 
                  ? "bg-red-50 text-red-700 border border-red-200" 
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}>
                {successMessage}
              </div>
            )}

            <button
              onClick={handleCreateWallet}
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium 
                ${isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                }`}
            >
              {isLoading ? "Creating..." : "Create Wallet"}
            </button>
          </div>
        </div>

        {/* Wallets List */}
        {wallets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Base Chain Wallets */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-black flex items-center gap-2">
                Base Chain Wallets
              </h2>
              {wallets
                .filter(wallet => wallet.chain === "Base")
                .map((wallet, index) => (
                  <WalletCard key={index} wallet={wallet} />
                ))}
            </div>

            {/* Optimism Chain Wallets */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-black flex items-center gap-2">
                Optimism Chain Wallets
              </h2>
              {wallets
                .filter(wallet => wallet.chain === "Optimism")
                .map((wallet, index) => (
                  <WalletCard key={index} wallet={wallet} />
                ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 text-center text-black">
            No wallets created yet
          </div>
        )}
      </div>
    </div>
  );
}

export default PaySenseCreateWallet;
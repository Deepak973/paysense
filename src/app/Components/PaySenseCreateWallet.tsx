"use client";
import React, { useState, useEffect } from "react";
import { ethers, parseEther } from "ethers";
import { useAccount, useWriteContract } from "wagmi";
import multisigFactoryAbi from "../Contract/PaysenseFactoryABI.json";
import Link from "next/link";
import { waitForTransactionReceipt } from '@wagmi/core'
import { config } from '@/app/utils/config';


// Define an interface for the wallet data, including walletAddress
interface Wallet {
  owners: string[];
  numConfirmationsRequired: number;
  createdAt: string;
  walletAddress: string; // Add walletAddress property
}

function PaySenseCreateWallet() {
  const [owners, setOwners] = useState<string[]>([""]);
  const [numConfirmationsRequired, setNumConfirmationsRequired] = useState<number>(1);
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [wallets, setWallets] = useState<Wallet[]>([]); // Adjust Wallet type here

  // Fetch wallets from MongoDB
  const fetchWallets = async () => {
    try {
    const res = await fetch(`/api/wallets?ownerAddress=${address}`);
      const data = await res.json();
      console.log(data);
      if (res.ok) {
        setWallets(data.wallets);
      } else {
        console.error("Failed to fetch wallets:", data.message);
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

  // Handle wallet creation
  const handleCreateWallet = async () => {
    if (owners.length === 0 || !numConfirmationsRequired) {
      alert("Please fill out all required fields.");
      return;
    }

    try {
      const tx = await writeContractAsync({
        address: "0xbFC86e78EaF81E3488CB3c4D9b8862633c843Bb4",
        abi: multisigFactoryAbi,
        functionName: "createWallet",
        args: ["5224473277236331295","0x44C28f39432e87cb486aB80A7030e68BCfD20770",owners, numConfirmationsRequired],
        value : parseEther("0.0001"),
      });
            let walletAddress;
            // Wait for the transaction to be confirmed
            const receipt = await waitForTransactionReceipt(config as any, {
            hash: tx,
            });
            console.log(receipt)
            // Topic for the WalletCreated event (hash of the event signature)
            const eventTopic = ethers.id("WalletCreated(address,address[],uint256)");
            console.log(eventTopic)
            // Find the event log that matches the WalletCreated event
            const event = receipt.logs.find(log => log.topics[0] === eventTopic);
            console.log(event)
            if (event) {
            console.log("inside of event")
            // Decode the event data to extract the wallet address
            // Decode the indexed wallet address from topics[1]
            walletAddress = ethers.getAddress(`0x${(event.topics[1])?.slice(-40)}`);

            console.log('Created Wallet Address:', walletAddress);
            console.log("Transaction sent:", tx);
            alert("Multisig wallet creation transaction sent!");
            }

      // Save to MongoDB with wallet address
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owners,
          numConfirmationsRequired,
          createdBy: address,
          walletAddress: walletAddress,
          chain: "Base" // Save wallet address from transaction hash or other identifier
        }),
      });
      const res2 = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owners,
          numConfirmationsRequired,
          createdBy: address,
          walletAddress: walletAddress,
          chain: "Optimism" // Save wallet address from transaction hash or other identifier
        }),
      });
      if (res.ok) {
        fetchWallets(); // Refresh wallets list
      } else {
        console.error("Error saving wallet to database");
      }
    } catch (error) {
      console.error("Error creating multisig wallet:", error);
      alert("Error creating multisig wallet.");
    }
  };

  const handleOwnerChange = (index: number, value: string) => {
    const updatedOwners = [...owners];
    updatedOwners[index] = value;
    setOwners(updatedOwners);
  };

  const addOwnerField = () => setOwners([...owners, ""]);

  return (
    <div className="min-h-screen flex">
      {/* Left side for wallet creation */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-gradient-to-r from-green-500 to-blue-600 p-6">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-xl w-full text-gray-800">
          <h1 className="text-3xl font-bold text-center mb-6">Create Multisig Wallet</h1>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Owners</h2>
            {owners.map((owner, index) => (
              <input
                key={index}
                type="text"
                placeholder={`Enter owner address ${index + 1}`}
                value={owner}
                onChange={(e) => handleOwnerChange(index, e.target.value)}
                className="w-full p-2 rounded-md border border-gray-300 mb-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            ))}
            <button
              onClick={addOwnerField}
              className="bg-blue-500 text-white p-2 rounded-md mt-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Add Owner
            </button>
          </div>
          <div className="mb-4">
            <label htmlFor="numConfirmationsRequired" className="block text-lg font-semibold mb-1">
              Number of Confirmations Required
            </label>
            <input
              type="number"
              id="numConfirmationsRequired"
              value={numConfirmationsRequired}
              onChange={(e) => setNumConfirmationsRequired(parseInt(e.target.value))}
              min={1}
              className="w-full p-2 rounded-md border border-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={handleCreateWallet}
            className="w-full bg-green-500 text-white p-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Create Multisig Wallet
          </button>
        </div>
      </div>

      {/* Right side for displaying created wallets */}
      <div className="w-full md:w-1/2 p-6 bg-gray-100 overflow-y-auto text-black">
        <h2 className="text-2xl font-semibold mb-6">Your Created Wallets</h2>
        {wallets.length > 0 ? (
          wallets.map((wallet, index) => (
            <Link key={index} href={`/pay-now/${wallet.walletAddress}`}>
              <div className="p-4 mb-4 bg-white rounded-md shadow cursor-pointer hover:bg-gray-200 transition">
              <p><strong>Address:</strong> {wallet.walletAddress}</p>
                <p><strong>Owners:</strong> {wallet.owners.join(", ")}</p>
                <p><strong>Confirmations Required:</strong> {wallet.numConfirmationsRequired}</p>
                <p><strong>Created At:</strong> {new Date(wallet.createdAt).toLocaleString()}</p>
              </div>
            </Link>
          ))
        ) : (
          <p>No wallets created yet.</p>
        )}
      </div>
    </div>
  );
}

export default PaySenseCreateWallet;

"use client";
import React, { useEffect, useState } from "react";
import { ethers, parseEther, parseUnits, toUtf8Bytes } from "ethers";
import PaySenseApp from "../../Components/PaySense";
import { walletClient } from "../../utils/config";
import { useAccount, useWriteContract } from "wagmi";
import { Address, createWalletClient, custom, formatUnits, keccak256 } from "viem";
import PaySenseAppAbi from "../../Contract/PaysenseABI.json";
import { getTokenDetails } from "../../utils/tokenDetails";
import { useParams } from "next/navigation";
import { baseSepolia } from "viem/chains";

interface TokenDetails {
  name: string;
  symbol: string;
  decimals: string;
  balance: bigint;
}
interface SignedTransaction {
  transactionType: string;             // Type of transaction (e.g., sendETH, sendERC20)
  recipient: string;                   // Address of the recipient
  amount: string;                      // Transaction amount
  tokenAddress?: string;               // Address of the token (optional, for ERC20 transactions)
  walletAddress: string;               // Address of the wallet initiating the transaction
  nonce: string;                       // Unique nonce for this transaction
  deadline: bigint;                    // Transaction expiration timestamp
  data: string;                        // Encoded function data (e.g., calldata)
  signatures: { signer: string; signature: string }[]; // List of signatures with signer and signature
  isExecuted: boolean;   
  requestDetails :string;  
  requestType: string;            // Whether the transaction has been executed
}

const USDC ="0x036CbD53842c5426634e7929541eC2318f3dCF7e";

function Page() {
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const params = useParams();
  const [isERC20, setIsERC20] = useState<boolean>(false);
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const walletAddress = params ? params.address : "";
  const [pendingTransactions, setPendingTransactions] = useState<SignedTransaction[]>([]);
  const requiredSignatures = 2; // Adjust based on the multisig contract setup
  const [crossChain, setCrossChain] = useState(false);
  const [selectedChain, setSelectedChain] = useState("Optimism");
  const [contractTokenDetails, setContractTokenDetails] = useState<TokenDetails | null>(null);

  const loadTokenDetails = async () => {
    if (tokenAddress && address) {
      try {
        const details = await getTokenDetails(tokenAddress, address);
        setTokenDetails(details);
      } catch (error) {
        console.error("Error fetching token details:", error);
      }
    }
  };

  const getContractBalanceUSDC = async () =>{
    
      try {
        const details = await getTokenDetails(USDC, walletAddress as Address);
        console.log(details);
        setContractTokenDetails(details);
      } catch (error) {
        console.error("Error fetching token details:", error);
      }
    
  }

  useEffect(() => {
    if (isERC20 && tokenAddress && address) {
      loadTokenDetails();
    }
  }, [isERC20, tokenAddress, address]);

  

  const createAndSignTransaction = async (transactionType: string) => {
    console.log(crossChain,transactionType);
    try {
      const ethAbi = [
        "function transferEth(address payable _recipient, uint256 _amount)",
      ];
  
      const erc20Abi = [
        "function transferERC20(address _token, address _recipient, uint256 _amount)",
      ];

      const crossChainAbi = [
        "function transferTokensPayNative(uint64 _destinationChainSelector,address _receiver,address _token,uint256 _amount)"
      ];
  
      let abi, iface, calldata = "";
      const timestamp = new Date().getTime().toString();
      const combined = toUtf8Bytes(`${address}-${timestamp}`);
      const nonce = keccak256(combined);
      const deadline = BigInt(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  
      if (transactionType === "sendETH") {
        
        abi = ethAbi;
        iface = new ethers.Interface(abi);
        calldata = iface.encodeFunctionData("transferEth", [
          recipientAddress,
          parseEther(amount),
        ]);
      } else if (transactionType === "sendERC20" && tokenAddress) {
        

        abi = erc20Abi;
        iface = new ethers.Interface(abi);
        calldata = iface.encodeFunctionData("transferERC20", [
          tokenAddress,
          recipientAddress,
          parseUnits(amount, tokenDetails?.decimals),
        ]);
      }
      else if(transactionType == "sendUSDCCrossChain" )
      {
     
        abi = crossChainAbi;
        iface = new ethers.Interface(abi);
        calldata = iface.encodeFunctionData("transferTokensPayNative", [
          "5224473277236331295",
          recipientAddress,
          USDC,
          parseUnits(amount, 6),
        ]);
      }

      console.log(transactionType == "sendUSDCCrossChain" )
     
      if (typeof window !== undefined && window.ethereum) {
        const client = createWalletClient({
          chain: baseSepolia,
          transport: custom(window.ethereum),
        });
  
        const signature = await client.signTypedData({
          account: address as Address,
          domain: {
            name: "MultisigCCIP",
            version: "1",
            chainId: BigInt(84532),
            verifyingContract: walletAddress as Address,
          },
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
            Execute: [
              { name: "to", type: "address" },
              { name: "value", type: "uint256" },
              { name: "data", type: "bytes" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          primaryType: "Execute",
          message: {
            to: walletAddress as Address,
            value: getTransactionValue(transactionType),
            data: calldata as `0x${string}`,
            nonce: BigInt(nonce),
            deadline: deadline,
          },
        });
  
        // Prepare data to send to the backend
        const newTransaction = {
          walletAddress: walletAddress, // Address of the multisig wallet
          requestDetails: calldata, // Transaction data
          requester: address, // User's wallet address
          requestType: transactionType,
          deadline: Number(deadline),
          status: "pending",
          nonce: nonce,
          signature: signature,
          amount : amount ,
          recipient:recipientAddress
        };
  
        // Send the transaction data to your MongoDB API
        const response = await fetch("/api/request", {
          method: "POST", // Using POST to create a new request
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newTransaction),
        });
  
        const result = await response.json();
  
        if (response.ok) {
          alert("Transaction request created successfully!");
        } else {
          alert(result.message || "Error creating transaction request.");
        }
      }
    } catch (err) {
      console.error("Error signing transaction:", err);
    }
  };

  const handleTransactionType = () => {
  
    if (crossChain) {
      return "sendUSDCCrossChain";
    } else {
      return isERC20 ? "sendERC20" : "sendETH";
    }
  };

  const getTransactionValue = (transactionType:string) => {
    if (crossChain) {
      return BigInt(0); // If it's cross-chain, set value to zero
    }
    console.log( parseEther(amount));
    return transactionType === "sendETH" ? parseEther(amount) : BigInt(0);
  };
  

    // Function to fetch signatures
    const fetchSignatures = async () => {
      try {
        const response = await fetch(
          `/api/request?walletAddress=${walletAddress}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
  
        const result = await response.json();
  
        if (response.ok) {
          console.log("Signatures fetched successfully:", result.requests);
          setPendingTransactions(result.requests); // Store fetched signatures in state
        } else {
          console.error("Error fetching signatures:", result.message);
        }
      } catch (err) {
        console.error("Error:", err);
      }
    };
  
    // Fetch signatures when component mounts or dependencies change
    useEffect(() => {
      fetchSignatures();
      getContractBalanceUSDC();
    }, [walletAddress]);


    const signTransaction = async (index: number) => {
      if (typeof window !== undefined && window.ethereum) {
        const client = createWalletClient({
          chain: baseSepolia,
          transport: custom(window.ethereum),
        });
  
      try {
        const transaction = pendingTransactions[index];
        console.log(transaction);
    
        // Sign the transaction message
        const signature = await client.signTypedData({
          account: address as Address,
          domain: {
            name: "MultisigCCIP",
            version: "1",
            chainId: BigInt(84532),
            verifyingContract: transaction.walletAddress as Address,
          },
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
            Execute: [
              { name: "to", type: "address" },
              { name: "value", type: "uint256" },
              { name: "data", type: "bytes" },
              { name: "nonce", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          primaryType: "Execute",
          message: {
            to: walletAddress as Address,
            value: BigInt(0),
            data: transaction.requestDetails as `0x${string}`,
            nonce: BigInt(transaction.nonce),
            deadline: BigInt(transaction.deadline),
          },
        });
    
        // Send the signer and signature to the API
        const response = await fetch("/api/request", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: transaction.walletAddress,
            nonce: transaction.nonce,
            signer: address as string,
            signature,
          }),
        });
    
        const result = await response.json();
    
        if (response.ok) {
          // Update the local state with the new signature
          const updatedTransactions = [...pendingTransactions];
          updatedTransactions[index].signatures.push({ signer: address as string, signature });
          setPendingTransactions(updatedTransactions);
          alert("Signature added successfully!");
        } else {
          alert(result.message || "Error adding signature.");
        }
      } catch (err) {
        console.error("Error signing transaction:", err);
      }
    };
  }

  const executeTransaction = async (transaction: SignedTransaction) => {
    if (transaction.signatures.length >= requiredSignatures) {  

      let signatures =[];

      for(let i=0;i<transaction.signatures.length;i++)
      {
        signatures.push(transaction.signatures[i]["signature"]);
      }

      console.log(transaction.recipient, parseEther(transaction.amount), transaction.requestDetails, transaction.deadline, transaction.nonce, signatures)
    
      let response = await writeContractAsync({
        address: walletAddress as Address,
        abi: PaySenseAppAbi,
        functionName: 'executeTransaction',
        args: [transaction.walletAddress, BigInt(0), transaction.requestDetails, transaction.deadline, transaction.nonce, signatures],
       });

    if (response) {
      // Call the PATCH API to update the transaction status
      const updateResponse = await fetch("/api/request", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: walletAddress,
          nonce: transaction.nonce,
          status: "completed",  // Update the status to completed
        }),
      });
    } else {
      alert("Not enough signatures to execute this transaction.");
    }
  }};

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-6xl w-full text-gray-800 flex justify-between">
        <div className="w-full max-w-lg">
          <h1 className="text-center text-3xl font-bold text-gray-800 mb-6">Send Funds</h1>
          {contractTokenDetails && contractTokenDetails.balance ? (
    <p className="text-lg text-gray-800 mb-4">Wallet USDC Balance: {formatUnits(contractTokenDetails.balance, 6)} USDC</p>
  ) : (
    <p className="text-lg text-gray-800 mb-4">Wallet USDC Balance: 0</p>
  )}
          <input
            type="text"
            placeholder="Enter Ethereum Address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="w-full p-4 rounded-md border border-gray-300 mb-4 text-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="text"
            placeholder="Enter Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-4 rounded-md border border-gray-300 mb-4 text-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

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

          {isERC20 && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter ERC-20 Token Address"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="w-full p-4 rounded-md border border-gray-300 mb-4 text-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {tokenDetails && (
                <div className="mb-2">
                  <p>Token: {tokenDetails.name} ({tokenDetails.symbol})</p>
                  <p>Balance: {formatUnits(tokenDetails.balance, Number(tokenDetails.decimals))}</p>
                </div>
              )}
            </div>
          )}

          {/* Cross-Chain Option */}
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="crossChain"
              checked={crossChain}
              onChange={() => setCrossChain(!crossChain)}
              className="mr-2"
            />
            <label htmlFor="crossChain" className="text-lg text-gray-800">Cross-Chain Transaction (USDC)</label>
          </div>

          {crossChain && (
            <div className="mb-4">
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                className="w-full p-4 rounded-md border border-gray-300 text-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Optimism">Optimism</option>
                <option value="Sepolia">Sepolia</option>
              </select>
            </div>
          )}

          <button
            onClick={() => createAndSignTransaction(handleTransactionType())}
            className="w-full bg-blue-500 text-white py-4 rounded-md font-bold text-lg focus:outline-none hover:bg-blue-600 transition duration-200"
          >
            Create & Sign Transaction
          </button>

          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Pending Transactions</h2>

            {pendingTransactions && pendingTransactions.length > 0 ? (
              pendingTransactions.map((tx, index) => (
                <div key={index} className="border-b py-4">
                  <p><strong>Recipient:</strong> {tx.recipient}</p>
                  <p><strong>Amount:</strong> {tx.amount}</p>
                  <p><strong>Signatures:</strong> {tx.signatures.length} / {requiredSignatures}</p>

                  {/* Show Sign button if transaction is not executed and signatures are still needed */}
                  {!tx.isExecuted && tx.signatures.length < requiredSignatures && (
                    <button onClick={() => signTransaction(index)} className="bg-yellow-500 text-white py-2 px-4 rounded mt-2">
                      Sign
                    </button>
                  )}

                  {/* Show Execute button if transaction is not executed and required signatures are met */}
                  {!tx.isExecuted && tx.signatures.length >= requiredSignatures && (
                    <button onClick={() => executeTransaction(tx)} className="bg-green-500 text-white py-2 px-4 rounded mt-2">
                      Execute
                    </button>
                  )}

                  {/* Show Executed message if transaction has been executed */}
                  {tx.isExecuted && <p className="text-green-500 font-bold mt-2">Executed</p>}
                </div>
              ))
            ) : (
              <p>No pending transactions found.</p> // Fallback message when there are no pending transactions
            )}
          </div>
        </div>

        <div className="flex-1 ml-4 hidden md:block">
          <PaySenseApp recipientAddress={recipientAddress} walletAddress={walletAddress as Address} />
        </div>
      </div>
    </div>
  );
};


export default Page;

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
import { toast, ToastContainer } from "react-toastify";

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
            name: "PaysenseCCIP",
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
          toast.success("Transaction request created successfully!",{
            position: "top-center"
          });
        } else {
          toast.error(result.message || "Error creating transaction request.",{
            position: "top-center"
          });
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
            name: "PaysenseCCIP",
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
          toast.success("Signature added successfully!",{
            position: "top-center"
          });
        } else {
          toast.error(result.message || "Error adding signature.",{
            position: "top-center"
          });
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
        value :parseEther("0.01")
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
          txHash: response
        }),
      });

      toast.success("https://ccip.chain.link/tx/"+response, {
        position: "top-center"
      })
     
    } else {
      toast.error("Not enough signatures to execute this transaction.",{
        position: "top-center"
      });
    }
  }};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
        {/* Left Panel - Transaction Form */}
        <div className="w-full md:w-1/2 bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-white shadow-xl">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                PaySense Transfer
              </h1>
              {contractTokenDetails && (
                <div className="mt-4 text-xl font-medium">
                  <span className="text-blue-300">USDC Balance: </span>
                  <span className="text-white">
                    {formatUnits(contractTokenDetails.balance, 6)} USDC
                  </span>
                </div>
              )}
            </div>

            {/* Transaction Form */}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Recipient Address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
              />

              <input
                type="text"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
              />

              {/* Token Selection */}
              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isERC20}
                    onChange={() => setIsERC20(!isERC20)}
                    className="form-checkbox h-5 w-5 text-blue-400 rounded"
                  />
                  <span className="ml-2">ERC-20 Token</span>
                </label>

                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={crossChain}
                    onChange={() => setCrossChain(!crossChain)}
                    className="form-checkbox h-5 w-5 text-purple-400 rounded"
                  />
                  <span className="ml-2">Cross-Chain (USDC)</span>
                </label>
              </div>

              {isERC20 && (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Token Address"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
                  />
                  {tokenDetails && (
                    <div className="p-4 bg-white/5 rounded-xl">
                      <p className="text-blue-300">
                        {tokenDetails.name} ({tokenDetails.symbol})
                      </p>
                      <p className="text-sm">
                        Balance: {formatUnits(tokenDetails.balance, Number(tokenDetails.decimals))}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {crossChain && (
                <select
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
                >
                  <option value="Optimism">Optimism</option>
                  <option value="Sepolia">Sepolia</option>
                </select>
              )}

              <button
                onClick={() => createAndSignTransaction(handleTransactionType())}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-[1.02]"
              >
                Create & Sign Transaction
              </button>
            </div>

            {/* Pending Transactions */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Pending Transactions
              </h2>
              <div className="space-y-4">
                {pendingTransactions && pendingTransactions.length > 0 ? (
                  pendingTransactions.map((tx, index) => (
                    <div
                      key={index}
                      className="p-4 bg-white/5 border border-white/20 rounded-xl space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-blue-300">Recipient</p>
                          <p className="text-white truncate">{tx.recipient}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-blue-300">Amount</p>
                          <p className="text-white">{tx.amount}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-sm">
                          Signatures: {tx.signatures.length} / {requiredSignatures}
                        </span>
                        <div className="space-x-2">
                          {!tx.isExecuted && tx.signatures.length < requiredSignatures && (
                            <button
                              onClick={() => signTransaction(index)}
                              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors"
                            >
                              Sign
                            </button>
                          )}
                          {!tx.isExecuted && tx.signatures.length >= requiredSignatures && (
                            <button
                              onClick={() => executeTransaction(tx)}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                            >
                              Execute
                            </button>
                          )}
                          {tx.isExecuted && (
                            <span className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg">
                              Executed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No pending transactions
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - PaySense Component */}
        <div className="w-full md:w-1/2 text-black">
          <PaySenseApp recipientAddress={recipientAddress} walletAddress={walletAddress as Address} />
        </div>
      </div>
      <ToastContainer />
    </div>
  );

};


export default Page;

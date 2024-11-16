import React, { useState, useEffect } from "react";
import axios from "axios";
import style from "../Styles/PaySense.module.css";
import { useAccount } from 'wagmi'
import { Shield, Send, History, CheckCircle, Code, User, Clock } from 'lucide-react';

interface Transaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
}

interface TransactionAnalysisProps {
  recipientAddress: string;
  walletAddress: string;
}

const PaySenseOP: React.FC<TransactionAnalysisProps> = ({ recipientAddress, walletAddress }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [sentCount, setSentCount] = useState<number>(0);
  const [receivedCount, setReceivedCount] = useState<number>(0);
  const [timesSent, setTimesSent] = useState<number>(0);
  const [timesReceived, setTimesReceived] = useState<number>(0);
  const [contractsCreated, setContractsCreated] = useState<string[]>([]);
  const [totalGasSpentInEth, setTotalGasSpentInEth] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isContract, setIsContract] = useState<boolean | null>(null);
  const { address } = useAccount();

  useEffect(() => {
    if (recipientAddress) {
      fetchTransactionsOptimism();
      checkIfContract();
    }
  }, [recipientAddress]);

  const checkIfContract = async () => {
    try {
      const response = await axios.get("https://api-sepolia.basescan.org/api", {
        params: {
          module: "proxy",
          action: "eth_getCode",
          address: recipientAddress,
          apikey: "U4BMJADIV7UXRZGUIQFUMTHVCHUSQ93ZT5",
        },
      });

      // If the response is "0x" it means there's no code at the address (EOA)
      // Otherwise, it's a contract
      setIsContract(response.data.result !== "0x");
    } catch (error) {
      console.error("Error checking if address is contract:", error);
      setIsContract(null);
    }
  };

  const fetchTransactionsOptimism = async (page = 1, accumulatedTxList: Transaction[] = []) => {
    setLoading(true);
    setError(null);
  
    try {
      const response = await axios.get("https://api-sepolia-optimism.etherscan.io/api", {
        params: {
          module: "account",
          action: "txlist",
          address: recipientAddress,
          startblock: 0,
          endblock: 999999999,
          page,
          offset: 100,
          sort: "asc",
          apikey: "7QDAFN4NPJRYG1R26GGWFVS1M1HCHNIUUR",
        },
      });
  
      if (response.data.status === "1") {
        const currentTxList: Transaction[] = response.data.result;
       
        if (currentTxList.length < 100) {
          const allTransactions = accumulatedTxList.concat(currentTxList);  
          console.log(allTransactions);
          setTransactions(allTransactions);
  
          setLastTransaction(allTransactions[allTransactions.length - 1]);
  
          const sentTx = allTransactions.filter((tx) => tx.from.toLowerCase() === recipientAddress.toLowerCase());
          const receivedTx = allTransactions.filter((tx) => tx.to.toLowerCase() === recipientAddress.toLowerCase());
  
          setSentCount(sentTx.length);
          setReceivedCount(receivedTx.length);
  
          console.log(walletAddress);
          setTimesSent(sentTx.filter((tx) => tx.to.toLowerCase() === walletAddress?.toLowerCase()).length);
          setTimesReceived(receivedTx.filter((tx) => tx.from.toLowerCase() === walletAddress?.toLowerCase()).length);
  
          const contractTxs = allTransactions.filter(tx => tx.to === "");
          const contractAddresses = contractTxs.map(tx => tx.contractAddress).filter(addr => addr !== "");
          setContractsCreated(contractAddresses);
  
          const totalGasInEth = allTransactions.reduce((acc, tx) => {
            const gasUsed = parseInt(tx.gasUsed, 10);
            const gasPrice = parseInt(tx.gasPrice, 10) / 1e18;
            return acc + gasUsed * gasPrice;
          }, 0);
          setTotalGasSpentInEth(totalGasInEth);
        } else {
          await fetchTransactionsOptimism(page + 1, accumulatedTxList.concat(currentTxList));
        }
      } else {
        setError("No transactions found or an error occurred.");
      }
    } catch (error) {
      setError("Failed to fetch transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const getRelationshipScore = () => {
    const totalTransactions = timesSent + timesReceived;
  
    if (totalTransactions > 10) return 100;
    if (totalTransactions > 6) return 80;
    if (totalTransactions > 4) return 70;
    if (totalTransactions > 2) return 50;
  
    return 0;
  };

  const daysAgo = (timestamp: string) => {
    const now = new Date();
    const lastTxDate = new Date(parseInt(timestamp) * 1000);
    const diffInTime = now.getTime() - lastTxDate.getTime();
    return Math.floor(diffInTime / (1000 * 3600 * 24));
  };
  return (
    <div>

      {/* Top Section with Account Type and Activity Status */}
      <div className={style.topGrid}>
        {/* Account Type Card */}
        <div className={`${style.infoCard} ${isContract ? style.contractCard : style.eoaCard}`}>
          <div className={style.cardContent}>
            {isContract ? (
              <>
                <div className={style.iconWrapper}>
                  <Code size={32} className={style.contractIcon} />
                </div>
                <h3>Smart Contract</h3>
                <p className={style.accountTypeDesc}>This address contains executable code</p>
              </>
            ) : (
              <>
                <div className={style.iconWrapper}>
                  <User size={32} className={style.eoaIcon} />
                </div>
                <h3>EOA Wallet</h3>
                <p className={style.accountTypeDesc}>Standard user-controlled wallet</p>
              </>
            )}
          </div>
        </div>

        {/* Last Activity Card */}
        {lastTransaction && (
          <div className={style.infoCard}>
            <div className={style.cardContent}>
              <div className={style.iconWrapper}>
                <Clock size={32} className={style.lastSeenIcon} />
              </div>
              <h3>Last Active</h3>
              <div className={style.lastSeenTime}>
                {daysAgo(lastTransaction.timeStamp) === 0 ? (
                  <span className={style.activeToday}>Active Today</span>
                ) : (
                  <span className={style.daysAgo}>
                    {daysAgo(lastTransaction.timeStamp)} days ago
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Relationship Score Card */}
        {(sentCount || receivedCount) && (
          <div className={style.infoCard}>
            <div className={style.cardContent}>
              <div className={style.iconWrapper}>
                <Shield size={32} className={style.trustIcon} />
              </div>
              <h3>Trust Score</h3>
              <div className={style.circularScore}>
                <div 
                  className={style.scoreCircle}
                  style={{
                    background: `conic-gradient(${getScoreColor(getRelationshipScore())} ${getRelationshipScore() * 3.6}deg, #e0e0e0 0deg)`
                  }}
                >
                  <div className={style.scoreValue}>
                    {getRelationshipScore()}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Statistics Grid */}
      <div className={style.statsGrid}>
        <div className={style.statsCard}>
          <Send size={24} className={style.statsIcon} />
          <div className={style.statsContent}>
            <h4>Sent</h4>
            <div className={style.statsValue}>{sentCount}</div>
          </div>
        </div>

        <div className={style.statsCard}>
          <CheckCircle size={24} className={style.statsIcon} />
          <div className={style.statsContent}>
            <h4>Received</h4>
            <div className={style.statsValue}>{receivedCount}</div>
          </div>
        </div>

        <div className={style.statsCard}>
          <History size={24} className={style.statsIcon} />
          <div className={style.statsContent}>
            <h4>Your Interactions</h4>
            <div className={style.statsValue}>{timesSent + timesReceived}</div>
          </div>
        </div>
      </div>

      {/* Gas Usage Card */}
      <div className={style.gasCard}>
        <div className={style.gasContent}>
          <h3>Total Gas Spent</h3>
          <div className={style.gasValue}>
            {totalGasSpentInEth.toFixed(6)} <span>ETH</span>
          </div>
        </div>
      </div>

      {/* Contracts Created Section */}
      {contractsCreated.length > 0 && (
        <div className={style.contractsSection}>
          <h3>
            <Code size={20} className={style.contractsIcon} />
            Contracts Created ({contractsCreated.length})
          </h3>
          <div className={style.contractsList}>
            {contractsCreated.map((contractAddress, index) => (
              <a
                key={index}
                href={`https://basescan.org/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className={style.contractItem}
              >
                {contractAddress}
                <Send size={16} className={style.linkIcon} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const getScoreColor = (score: number) => {
  if (score >= 80) return '#4CAF50';
  if (score >= 50) return '#FBC02D';
  return '#F44336';
};

export default PaySenseOP;
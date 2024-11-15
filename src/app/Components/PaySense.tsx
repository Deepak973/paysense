"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import style from "../Styles/PaySense.module.css";

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
  address: string;
}

const PaySenseApp: React.FC<TransactionAnalysisProps> = ({ address }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [sentCount, setSentCount] = useState<number>(0);
  const [receivedCount, setReceivedCount] = useState<number>(0);
  const [timesSent, setTimesSent] = useState<number>(0);
  const [timesReceived, setTimesReceived] = useState<number>(0);
  const [contractsCreated, setContractsCreated] = useState<string[]>([]); // State to store contract addresses
  const [totalGasSpentInEth, setTotalGasSpentInEth] = useState<number>(0); // State to store total gas spent in ETH
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      fetchTransactions();
    }
  }, [address]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get("https://api.basescan.org/api", {
        params: {
          module: "account",
          action: "txlist",
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 10,
          sort: "asc",
          apikey: "U4BMJADIV7UXRZGUIQFUMTHVCHUSQ93ZT5",
        },
      });

      if (response.data.status === "1") {
        const txList: Transaction[] = response.data.result;
        setTransactions(txList);

        // Set last transaction
        setLastTransaction(txList[txList.length - 1]);

        // Calculate sent and received counts
        const sentTx = txList.filter((tx) => tx.from.toLowerCase() === address.toLowerCase());
        const receivedTx = txList.filter((tx) => tx.to.toLowerCase() === address.toLowerCase());

        setSentCount(sentTx.length);
        setReceivedCount(receivedTx.length);

        // Count how many times the address has sent/received from the current address
        setTimesSent(sentTx.filter((tx) => tx.to.toLowerCase() === address.toLowerCase()).length);
        setTimesReceived(receivedTx.filter((tx) => tx.from.toLowerCase() === address.toLowerCase()).length);

        // Extract contracts created
        const contractTxs = txList.filter(tx => tx.to === "");
        const contractAddresses = contractTxs.map(tx => tx.contractAddress).filter(addr => addr !== "");
        setContractsCreated(contractAddresses);

        // Calculate total gas spent in ETH (or native currency)
        const totalGasInEth = txList.reduce((acc, tx) => {
          const gasUsed = parseInt(tx.gasUsed, 10);
          const gasPrice = parseInt(tx.gasPrice, 10) / 1e18; // Convert gasPrice from wei to ETH
          return acc + gasUsed * gasPrice;
        }, 0);
        setTotalGasSpentInEth(totalGasInEth);
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
    const totalTransactions = sentCount + receivedCount;
    if (totalTransactions === 0) return 0;
    return (sentCount / totalTransactions) * 100; // Relationship score based on ratio of sent transactions
  };

  const daysAgo = (timestamp: string) => {
    const now = new Date();
    const lastTxDate = new Date(parseInt(timestamp) * 1000);
    const diffInTime = now.getTime() - lastTxDate.getTime();
    return Math.floor(diffInTime / (1000 * 3600 * 24)); // Calculate days ago
  };

  return (
    <div className={style.transactionContainer}>
      <h2>Know your Recipient : {address}</h2>
      <button onClick={fetchTransactions} disabled={loading} className={style.fetchButton}>
        {loading ? "Loading..." : "Fetch Transactions"}
      </button>

      {error && <p className={style.errorMessage}>{error}</p>}

      {lastTransaction && (
        <div className={style.block}>
          <h3 className={style.blockTitle}>Last Seen</h3>
          <p><strong>Last Activity:</strong> {daysAgo(lastTransaction.timeStamp)} days ago</p>
        </div>
      )}

      <div className={style.block}>
        <h3 className={style.blockTitle}>Transaction Summary</h3>
        <p><strong>Sent Transactions:</strong> {sentCount}</p>
        <p><strong>Received Transactions:</strong> {receivedCount}</p>
      </div>

      <div className={style.block}>
        <h3 className={style.blockTitle}>Times you have Interacted</h3>
        <p>{timesSent + timesReceived}</p>
      </div>

      {sentCount || receivedCount ? (
        <div className={style.block}>
          <h3 className={style.blockTitle}>Relationship Score (Trust score)</h3>
          <div className={style.scoreBar}>
            <div className={style.scoreFill} style={{ width: `${getRelationshipScore()}%` }}></div>
          </div>
          <p>{getRelationshipScore().toFixed(2)}% Relationship Score</p>
        </div>
      ) : null}

      <div className={style.block}>
        <h3 className={style.blockTitle}>Total Gas Spent</h3>
        <p><strong>Total Gas Cost:</strong> {totalGasSpentInEth.toFixed(6)} ETH</p>
      </div>

      {contractsCreated.length > 0 && (
        <div className={style.block}>
          <h3 className={style.blockTitle}>Contracts Created ({contractsCreated.length})</h3>
          <ul>
            {contractsCreated.map((contractAddress, index) => (
              <li key={index}>
                <a href={`https://basescan.org/address/${contractAddress}`} target="_blank" rel="noopener noreferrer">
                  {contractAddress}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PaySenseApp;

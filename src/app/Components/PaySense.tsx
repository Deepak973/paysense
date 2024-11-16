import React, { useState, useEffect } from "react";
import axios from "axios";
import style from "../Styles/PaySense.module.css";
import { useAccount } from 'wagmi'
import { Shield, Send, History, CheckCircle, Code, User, Clock } from 'lucide-react';
import PaySenseBase from "./PaySenseBase";
import PaySenseOP from "./PaySenseOptimism";

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

const PaySenseApp: React.FC<TransactionAnalysisProps> = ({ recipientAddress, walletAddress }) => {
  

  const [activeTab, setActiveTab] = useState('Base');

  return (
    <div className={style.transactionContainer}>
      <h2 className={style.title}>Know your Recipient</h2>
      <div className={style.addressCard}>
        <div className={style.addressText}>{recipientAddress ? recipientAddress : "No Address added"}</div>
      </div>
      <div className="flex border-b border-gray-300">
        <button
          onClick={() => setActiveTab('Base')}
          className={`flex-1 p-2 text-center ${
            activeTab === 'Base' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'
          }`}
        >
          Base
        </button>
        <button
          onClick={() => setActiveTab('Optimism')}
          className={`flex-1 p-2 text-center ${
            activeTab === 'Optimism' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'
          }`}
        >
          Optimism
        </button>
      </div>
      <div className="mt-4">
        {activeTab === 'Base' && <PaySenseBase recipientAddress={recipientAddress} walletAddress={walletAddress}/>}
        {activeTab === 'Optimism' && <PaySenseOP recipientAddress={recipientAddress} walletAddress={walletAddress}/>}
      </div>
    </div>
  );
};

const getScoreColor = (score: number) => {
  if (score >= 80) return '#4CAF50';
  if (score >= 50) return '#FBC02D';
  return '#F44336';
};

export default PaySenseApp;
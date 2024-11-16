"use client";
import React, { useEffect, useState } from "react";
import { ethers, parseEther, parseUnits } from "ethers";
import PaySenseCreateWallet from "../Components/PaySenseCreateWallet";
import { walletClient } from "../utils/config";
import { useAccount, useWriteContract } from "wagmi";
import { Address, formatUnits } from "viem";
import erc20Abi from "../Contract/ERC20ABI.json";
import { getTokenDetails } from "../utils/tokenDetails";



function Page() {
  

  return (
 
        <div >
          <PaySenseCreateWallet />
        </div>
     
  );
}

export default Page;

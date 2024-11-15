"use client";
import React from 'react';
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import {

  base,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import Navbar from "./Components/Navbar";


interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const config = getDefaultConfig({
    appName: "RainbowKit demo",
    projectId: "f8a6524307e28135845a9fe5811fcaa2",
    chains: [base],
    ssr: true,
  });
  
  const queryClient = new QueryClient();

  return (
    <html lang="en">
      <head>
        <title></title>
      </head>
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <Navbar />
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
'use client'
import React from 'react';
import { Shield, Send, History, CheckCircle } from 'lucide-react';
import Link from 'next/link';


export default function Home() {
  return (
    <div className="min-h-screen bg-dark-gray text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-6 pt-20 pb-16">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1 max-w-2xl">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-custom-green via-custom-orange to-custom-pink bg-clip-text text-transparent animate-gradient">
              PaySense
            </h1>
            <p className="text-2xl mb-8 text-custom-pink">Know Your Recipient</p>
            <p className="text-lg text-gray-300 mb-8">
              Secure your crypto transfers with intelligent recipient verification. 
              Never worry about sending to the wrong address again.
            </p>
            <div className="flex gap-4">
            <Link href="/pay-now">
              <button className="px-8 py-3 bg-custom-green text-dark-gray rounded-full font-semibold hover:opacity-90 transition-all">
                Get Started
              </button>
              </Link>
      
    
              <button className="px-8 py-3 border border-custom-green text-custom-green rounded-full font-semibold hover:bg-custom-green/10 transition-all">
                Learn More
              </button>
            </div>
          </div>
          
          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl hover:scale-105 transition-transform">
              <Shield className="w-12 h-12 text-custom-green mb-4" />
              <h3 className="text-xl font-semibold mb-2">Enhanced Security</h3>
              <p className="text-gray-400">Verify recipient details before sending funds to prevent mistakes and fraud.</p>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl hover:scale-105 transition-transform">
              <History className="w-12 h-12 text-custom-orange mb-4" />
              <h3 className="text-xl font-semibold mb-2">Transaction History</h3>
              <p className="text-gray-400">View complete transaction history and verify recipient authenticity.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-900/50 py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Why Choose PaySense?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-dark-gray p-8 rounded-xl border border-gray-800 hover:border-custom-green transition-colors">
              <CheckCircle className="w-10 h-10 text-custom-green mb-4" />
              <h3 className="text-xl font-semibold mb-3">Problem Solver</h3>
              <p className="text-gray-400">
                Token transfers are irreversible. PaySense ensures you're sending to the right person, giving you peace of mind.
              </p>
            </div>
            <div className="bg-dark-gray p-8 rounded-xl border border-gray-800 hover:border-custom-orange transition-colors">
              <Send className="w-10 h-10 text-custom-orange mb-4" />
              <h3 className="text-xl font-semibold mb-3">Multiple Tokens</h3>
              <p className="text-gray-400">
                Support for both native ETH and ERC-20 tokens, making all your transfers secure and verified.
              </p>
            </div>
            <div className="bg-dark-gray p-8 rounded-xl border border-gray-800 hover:border-custom-pink transition-colors">
              <Shield className="w-10 h-10 text-custom-pink mb-4" />
              <h3 className="text-xl font-semibold mb-3">Verification System</h3>
              <p className="text-gray-400">
                Advanced verification system that checks recipient details before confirming your transfer.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Token Transfer Section */}
      <div className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">Supported Transfers</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl hover:scale-105 transition-transform">
            <h3 className="text-2xl font-semibold mb-4 text-custom-green">Native Token</h3>
            <p className="text-gray-400">Transfer your ETH with confidence using our secure verification system.</p>
          <Link href="/pay-now">
          <button className="mt-6 px-6 py-2 bg-custom-green text-dark-gray rounded-full font-semibold hover:opacity-90 transition-all">
          Send ETH
          </button>
          </Link>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl hover:scale-105 transition-transform">
            <h3 className="text-2xl font-semibold mb-4 text-custom-orange">ERC-20 Tokens</h3>
            <p className="text-gray-400">Send any ERC-20 token safely with recipient verification.</p>
            <Link href="/pay-now">
            <button className="mt-6 px-6 py-2 bg-custom-green text-dark-gray rounded-full font-semibold hover:opacity-90 transition-all">
            Send Tokens
            </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
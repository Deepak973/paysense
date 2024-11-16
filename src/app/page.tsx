'use client'
import React from 'react';
import { Shield, Send, Users, Activity, Globe, CheckCircle } from 'lucide-react';
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
            <p className="text-2xl mb-8 text-custom-pink">Cross-Chain MultiSig Made Simple</p>
            <p className="text-lg text-gray-300 mb-8">
              First-ever multi-signature wallet with cross-chain capabilities powered by CCIP. 
              Verify recipient activity and build trust across blockchains.
            </p>
            <div className="flex gap-4">
              <Link href="/create-paysensewallet">
                <button className="px-8 py-3 bg-custom-green text-dark-gray rounded-full font-semibold hover:opacity-90 transition-all">
                  Create Wallet
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
              <Globe className="w-12 h-12 text-custom-green mb-4" />
              <h3 className="text-xl font-semibold mb-2">Cross-Chain Ready</h3>
              <p className="text-gray-400">Send assets across different blockchains securely with CCIP integration.</p>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl hover:scale-105 transition-transform">
              <Activity className="w-12 h-12 text-custom-orange mb-4" />
              <h3 className="text-xl font-semibold mb-2">Recipient Insights</h3>
              <p className="text-gray-400">View recipient's activity status and relationship score before sending.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-900/50 py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-12 text-center">Why Choose PaySenseg?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-dark-gray p-8 rounded-xl border border-gray-800 hover:border-custom-green transition-colors">
              <Users className="w-10 h-10 text-custom-green mb-4" />
              <h3 className="text-xl font-semibold mb-3">Multi-Signature Security</h3>
              <p className="text-gray-400">
                Require multiple approvals for transactions while maintaining cross-chain capabilities.
              </p>
            </div>
            <div className="bg-dark-gray p-8 rounded-xl border border-gray-800 hover:border-custom-orange transition-colors">
              <Activity className="w-10 h-10 text-custom-orange mb-4" />
              <h3 className="text-xl font-semibold mb-3">Trust Score</h3>
              <p className="text-gray-400">
                Check recipient's relationship score and last active status before sending assets.
              </p>
            </div>
            <div className="bg-dark-gray p-8 rounded-xl border border-gray-800 hover:border-custom-pink transition-colors">
              <Globe className="w-10 h-10 text-custom-pink mb-4" />
              <h3 className="text-xl font-semibold mb-3">Cross-Chain Bridge</h3>
              <p className="text-gray-400">
                Seamlessly transfer assets across different blockchains with CCIP technology.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Features Section */}
      <div className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">Smart Features</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl hover:scale-105 transition-transform">
            <h3 className="text-2xl font-semibold mb-4 text-custom-green">Recipient Verification</h3>
            <p className="text-gray-400">View detailed recipient insights including activity status and relationship scores.</p>
            <Link href="/verify-recipient">
              <button className="mt-6 px-6 py-2 bg-custom-green text-dark-gray rounded-full font-semibold hover:opacity-90 transition-all">
                Check Recipient
              </button>
            </Link>
          </div>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl hover:scale-105 transition-transform">
            <h3 className="text-2xl font-semibold mb-4 text-custom-orange">Cross-Chain Transfer</h3>
            <p className="text-gray-400">Send assets across different blockchains with multi-signature security.</p>
            <Link href="/create-paysensewallet">
              <button className="mt-6 px-6 py-2 bg-custom-green text-dark-gray rounded-full font-semibold hover:opacity-90 transition-all">
                Start Transfer
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
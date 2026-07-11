'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMarketStore } from '@/store/useMarketStore';
import dynamic from 'next/dynamic';

// Carrega o botão da wallet dinamicamente para evitar erro de hidratação
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function Home() {
  const { activeMarkets, fetchLiveMarkets, isLoading, error } = useMarketStore();
  const { connected } = useWallet();

  useEffect(() => {
    fetchLiveMarkets();
  }, [fetchLiveMarkets]);

  return (
    <main className="min-h-screen p-8 bg-black text-white">
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold">Octopus Oracle</h1>
          <p className="text-gray-400 text-sm">TxLINE On-Chain Settlement</p>
        </div>
        <WalletMultiButton />
      </header>

      {isLoading && <div>Sincronizando oráculo...</div>}
      {error && <div className="text-red-500">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeMarkets.map((game) => (
          <div key={game.fixtureId} className="border border-gray-700 p-4 rounded flex flex-col">
            <div className="flex justify-between mb-4">
              <span className="text-sm font-bold text-blue-400">{game.status}</span>
              <span className="font-mono">{game.score}</span>
            </div>
            
            <div className="text-lg mb-6">
              {game.homeTeam} vs {game.awayTeam}
            </div>

            {connected ? (
              <Link 
                href={`/market/${game.fixtureId}`}
                className="mt-auto bg-white text-black text-center py-2 font-bold rounded"
              >
                Acessar Mercados
              </Link>
            ) : (
              <button disabled className="mt-auto bg-gray-800 text-gray-500 py-2 rounded">
                Conecte a Wallet
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
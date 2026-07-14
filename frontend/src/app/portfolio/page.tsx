'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';

interface PortfolioStats {
  netPnl: number;
  winRate: string;
  totalVolume: number;
  longestStreak: number;
  degenHitRate: string;
  largestPayout: number;
  lockedEscrow: number;
  favoriteMarket: string;
  avgBetSize: number;
  riskIndex: string;
  totalPositions: number;
}

interface PositionRecord {
  id: string;
  game: string;
  market: string;
  amount: number;
  status: 'GREEN' | 'RED' | 'LIVE';
  returnAmount: string;
}

export default function Portfolio() {
  const [isMounted, setIsMounted] = useState(false);
  const { connected, publicKey } = useWallet();
  const router = useRouter();

  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [history, setHistory] = useState<PositionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!connected || !publicKey) return;

    const fetchPortfolio = async () => {
      setIsLoading(true);
      try {
        // Rota que vamos construir no Python
        const res = await fetch(`http://127.0.0.1:8000/api/portfolio/${publicKey.toBase58()}`);
        if (!res.ok) throw new Error('Falha ao buscar dados on-chain');
        
        const data = await res.json();
        setStats(data.stats);
        setHistory(data.history);
      } catch (error) {
        console.error("Erro ao carregar portfólio:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolio();
  }, [connected, publicKey]);

  if (!isMounted) return null;

  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-8">
        <h1 className="text-2xl font-bold mb-4 font-mono">Acesso Restrito</h1>
        <p className="text-gray-400 mb-6">Conecte sua carteira para acessar o portfólio.</p>
        <button onClick={() => router.push('/')} className="text-blue-400 hover:text-blue-300 font-mono">
          &larr; Voltar para a Home
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold font-mono text-white">Terminal de Risco</h1>
            <p className="text-gray-400 font-mono text-sm mt-1">
              Carteira: <span className="text-blue-400">{publicKey.toBase58().slice(0, 6)}...{publicKey.toBase58().slice(-6)}</span>
            </p>
          </div>
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white font-mono text-sm border border-gray-800 px-4 py-2 rounded">
            Menu Principal &rarr;
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <p className="text-blue-400 animate-pulse font-mono">Sincronizando transações na rede Solana...</p>
          </div>
        ) : !stats ? (
          <div className="text-center py-20 text-gray-500 font-mono">Nenhum dado on-chain encontrado para esta carteira.</div>
        ) : (
          <>
            {/* Dashboard 11 Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg lg:col-span-2">
                <div className="text-gray-400 text-sm font-mono mb-1">Net PnL (Lucro Total)</div>
                <div className={`text-4xl font-bold font-mono ${stats.netPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.netPnl > 0 ? '+' : ''}{stats.netPnl.toFixed(3)} SOL
                </div>
              </div>
              
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
                <div className="text-gray-400 text-sm font-mono mb-1">Taxa de Acerto</div>
                <div className="text-2xl font-bold text-white font-mono">{stats.winRate}</div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
                <div className="text-gray-400 text-sm font-mono mb-1">Capital em Jogo</div>
                <div className="text-2xl font-bold text-yellow-400 font-mono">{stats.lockedEscrow.toFixed(3)} SOL</div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-5 rounded-lg">
                <div className="text-gray-400 text-xs font-mono mb-1">Maior Bolada</div>
                <div className="text-xl font-bold text-green-400 font-mono">{stats.largestPayout.toFixed(3)} SOL</div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-5 rounded-lg">
                <div className="text-gray-400 text-xs font-mono mb-1">Maior Sequência</div>
                <div className="text-xl font-bold text-white font-mono">{stats.longestStreak} Vitórias</div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-5 rounded-lg">
                <div className="text-gray-400 text-xs font-mono mb-1">Total Apostado</div>
                <div className="text-xl font-bold text-white font-mono">{stats.totalVolume.toFixed(3)} SOL</div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-5 rounded-lg">
                <div className="text-gray-400 text-xs font-mono mb-1">Acertos DEGEN</div>
                <div className="text-xl font-bold text-purple-400 font-mono">{stats.degenHitRate}</div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-5 rounded-lg lg:col-span-2">
                <div className="text-gray-400 text-xs font-mono mb-1">Mercado Favorito</div>
                <div className="text-lg font-bold text-white">{stats.favoriteMarket}</div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-5 rounded-lg">
                <div className="text-gray-400 text-xs font-mono mb-1">Média por Aposta</div>
                <div className="text-lg font-bold text-white font-mono">{stats.avgBetSize.toFixed(3)} SOL</div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-5 rounded-lg">
                <div className="text-gray-400 text-xs font-mono mb-1">Perfil de Risco</div>
                <div className="text-lg font-bold text-red-400">{stats.riskIndex}</div>
              </div>
            </div>

            {/* Histórico de Posições */}
            <h2 className="text-xl font-bold font-mono border-b border-gray-800 pb-2 mb-4">Registro de Posições ({stats.totalPositions})</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-black text-gray-400 font-mono">
                  <tr>
                    <th className="p-4">Status</th>
                    <th className="p-4">Jogo</th>
                    <th className="p-4">Mercado</th>
                    <th className="p-4">Tamanho (SOL)</th>
                    <th className="p-4">Retorno</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((pos) => (
                    <tr key={pos.id} className="border-t border-gray-800 hover:bg-black/50 transition-colors">
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                          pos.status === 'GREEN' ? 'bg-green-900/50 text-green-400' :
                          pos.status === 'RED' ? 'bg-red-900/50 text-red-400' :
                          'bg-yellow-900/50 text-yellow-400'
                        }`}>
                          {pos.status}
                        </span>
                      </td>
                      <td className="p-4 font-semibold">{pos.game}</td>
                      <td className="p-4 text-gray-300">{pos.market}</td>
                      <td className="p-4 font-mono">{pos.amount.toFixed(3)}</td>
                      <td className={`p-4 font-mono font-bold ${
                        pos.status === 'GREEN' ? 'text-green-400' :
                        pos.status === 'RED' ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>{pos.returnAmount}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 font-mono">Nenhum histórico de transação.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMarketStore } from '@/store/useMarketStore';

type Tab = 'GOALS' | 'CORNERS' | 'CARDS';

export default function MarketDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { activeMarkets } = useMarketStore();
  
  const [activeTab, setActiveTab] = useState<Tab>('GOALS');
  const [betAmount, setBetAmount] = useState<string>('');
  const [selectedOdd, setSelectedOdd] = useState<{ id: string; label: string; multiplier: number } | null>(null);

  // Busca os dados básicos do jogo na store (se já tiver carregado)
  const game = activeMarkets.find((m) => m.fixtureId === Number(id)) || {
    homeTeam: 'Time Casa',
    awayTeam: 'Time Fora',
    status: 'LIVE',
    score: '0 - 0'
  }; // Fallback visual enquanto o backend está desligado

  // Estrutura mapeando as capacidades reais do Stat Period Encoding da TxLINE
  const marketTabs: Record<Tab, { id: string; label: string; multiplier: number }[]> = {
    GOALS: [
      { id: 'winner_home', label: `Vitória ${game.homeTeam}`, multiplier: 1.8 },
      { id: 'winner_away', label: `Vitória ${game.awayTeam}`, multiplier: 2.1 },
      { id: 'over_2_5', label: 'Over 2.5 Gols', multiplier: 1.5 },
      { id: 'next_goal', label: 'Próximo Gol', multiplier: 3.0 },
    ],
    CORNERS: [
      { id: 'over_8_5_corners', label: 'Mais de 8.5 Escanteios', multiplier: 1.9 },
      { id: 'race_to_5', label: 'Corrida para 5 Escanteios', multiplier: 2.5 },
    ],
    CARDS: [
      { id: 'most_cards_home', label: `Mais Cartões: ${game.homeTeam}`, multiplier: 2.0 },
      { id: 'most_cards_away', label: `Mais Cartões: ${game.awayTeam}`, multiplier: 1.7 },
    ]
  };

  const handlePlacePosition = async () => {
    if (!connected || !publicKey) return alert("Conecte a carteira da Phantom primeiro.");
    if (!selectedOdd || !betAmount || Number(betAmount) <= 0) return alert("Selecione um mercado e defina o valor.");

    console.log(`[ANCHOR CALL] Preparando instrução place_position para o PDA...`);
    console.log(`Mercado: ${selectedOdd.id} | Valor: ${betAmount} SOL`);
    
    // Aqui nós injetaremos a chamada via @coral-xyz/anchor no próximo passo
    alert(`Preparando transação on-chain: ${betAmount} SOL em ${selectedOdd.label}`);
  };

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white mb-6 font-mono text-sm">
        &larr; Voltar para Dashboard
      </button>

      {/* Header do Jogo */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 mb-8 flex justify-between items-center">
        <div className="text-3xl font-bold">{game.homeTeam}</div>
        <div className="flex flex-col items-center">
          <span className="text-green-400 font-bold tracking-widest text-sm mb-2">{game.status}</span>
          <span className="text-4xl font-mono">{game.score}</span>
        </div>
        <div className="text-3xl font-bold">{game.awayTeam}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Painel de Odds (Esquerda) */}
        <div className="lg:col-span-2">
          {/* Navegação de Abas */}
          <div className="flex space-x-4 border-b border-gray-800 mb-6 pb-2">
            {(['GOALS', 'CORNERS', 'CARDS'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-4 font-bold ${activeTab === tab ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {tab === 'GOALS' ? 'Gols & Resultado' : tab === 'CORNERS' ? 'Escanteios' : 'Cartões'}
              </button>
            ))}
          </div>

          {/* Grid de Seleção */}
          <div className="grid grid-cols-2 gap-4">
            {marketTabs[activeTab].map((odd) => (
              <button
                key={odd.id}
                onClick={() => setSelectedOdd(odd)}
                className={`p-4 rounded-lg border text-left flex justify-between items-center transition-colors ${
                  selectedOdd?.id === odd.id ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                }`}
              >
                <span className="font-semibold">{odd.label}</span>
                <span className="font-mono text-blue-400">{odd.multiplier.toFixed(2)}x</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bet Slip / Painel de Execução (Direita) */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 h-fit">
          <h3 className="text-xl font-bold mb-6 border-b border-gray-800 pb-4">Sua Posição</h3>
          
          {!selectedOdd ? (
            <div className="text-gray-500 text-center py-8">Selecione um mercado para operar.</div>
          ) : (
            <div className="flex flex-col space-y-6">
              <div>
                <div className="text-sm text-gray-400">Seleção</div>
                <div className="font-bold text-lg">{selectedOdd.label}</div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-2">Tamanho da Posição (SOL)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded p-3 text-white font-mono focus:border-blue-500 focus:outline-none"
                  placeholder="0.00 SOL"
                />
              </div>

              <div className="flex justify-between border-t border-gray-800 pt-4">
                <span className="text-gray-400">Retorno Potencial</span>
                <span className="font-mono font-bold text-green-400">
                  {betAmount ? (Number(betAmount) * selectedOdd.multiplier).toFixed(3) : '0.000'} SOL
                </span>
              </div>

              <button
                onClick={handlePlacePosition}
                className="w-full bg-white text-black font-bold py-4 rounded hover:bg-gray-200 transition-colors"
              >
                Confirmar Posição On-Chain
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
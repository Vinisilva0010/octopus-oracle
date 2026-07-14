'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import idl from '@/idl/contracts.json';
import { useMarketStore } from '@/store/useMarketStore';

type Tab = 'DEGEN' | 'MATCH_WINNER' | 'GOALS' | 'CORNERS' | 'CARDS';

export default function MarketDetail() {
  const [isMounted, setIsMounted] = useState(false);
  const { id } = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { activeMarkets, fetchFixtureOdds, currentOdds, isLoadingOdds } = useMarketStore();
  
  const [activeTab, setActiveTab] = useState<Tab>('DEGEN');
  const [betAmount, setBetAmount] = useState<string>('');
  const [selectedOdd, setSelectedOdd] = useState<{ id: string; key: number; label: string; multiplier: number } | null>(null);
const [txNotification, setTxNotification] = useState<{show: boolean, signature: string}>({show: false, signature: ''});
const [isProcessing, setIsProcessing] = useState(false);
  const game = activeMarkets.find((m) => m.fixtureId === Number(id));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (id && isMounted) {
      fetchFixtureOdds(id as string);
    }
  }, [id, fetchFixtureOdds, isMounted]);

  const handlePlacePosition = async () => {
    if (!connected || !publicKey) return alert("Conecte a carteira da Phantom primeiro.");
    if (!selectedOdd || !betAmount || Number(betAmount) <= 0) return alert("Selecione um mercado e defina o valor.");
    if (!game) return;

    try {
      setIsProcessing(true);
      const provider = new AnchorProvider(connection, (window as any).solana, AnchorProvider.defaultOptions());
      const program = new Program(idl as any, provider);

      const amountInLamports = new BN(Number(betAmount) * web3.LAMPORTS_PER_SOL);
      const fixtureIdBN = new BN(game.fixtureId);

      const marketKey = selectedOdd.key;
      const marketType = selectedOdd.key; 

      const [marketPda] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("market"), 
          fixtureIdBN.toArrayLike(Buffer, "le", 8),
          Buffer.from([marketType])
        ],
        program.programId
      );

      const marketAccountInfo = await connection.getAccountInfo(marketPda);
      const transaction = new web3.Transaction();

      if (marketAccountInfo === null) {
        console.log(`[ANCHOR] Empilhando initializeMarket para a chave ${marketType}...`);
        const initInstruction = await program.methods
          .initializeMarket(fixtureIdBN, marketType)
          .accounts({
            authority: publicKey,
            market: marketPda,
            systemProgram: web3.SystemProgram.programId,
          })
          .instruction();
          
        transaction.add(initInstruction);
      }

      console.log(`[ANCHOR] Empilhando placePosition...`);
      const placeInstruction = await program.methods
        .placePosition(marketKey, amountInLamports)
        .accounts({
          user: publicKey,
          market: marketPda,
          systemProgram: web3.SystemProgram.programId,
        })
        .instruction();
        
      transaction.add(placeInstruction);

      const txSignature = await provider.sendAndConfirm(transaction);
      setTxNotification({ show: true, signature: txSignature });

      // Dispara o recibo da aposta para o PostgreSQL em background
      try {
        await fetch('http://127.0.0.1:8000/api/portfolio/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tx_signature: txSignature,
            wallet: publicKey.toBase58(),
            fixture_id: game.fixtureId,
            game_title: `${game.homeTeam} vs ${game.awayTeam}`,
            market_key: selectedOdd.key,
            market_label: selectedOdd.label,
            amount_sol: Number(betAmount),
            multiplier: selectedOdd.multiplier
          })
        });
      } catch (dbError) {
        console.error("Aposta feita on-chain, mas falhou ao indexar no BD local:", dbError);
      }
      
    } catch (error: any) {
      console.error("Erro crítico na transação Anchor:", error);
      if (error.message?.includes("0x0") || error.message?.includes("already in use")) {
        alert("Você já possui uma aposta aberta nesta opção. O contrato atual permite apenas uma entrada por mercado.");
      } else {
        alert("Falha ao assinar a transação. Verifique se você tem SOL suficiente para as taxas ou se rejeitou na carteira.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isMounted) return null;

  if (!game) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex justify-center items-center">
        <p className="text-gray-400">Jogo não encontrado.</p>
      </div>
    );
  }

  const marketData = currentOdds?.data || { DEGEN: [], MATCH_WINNER: [], GOALS: [], CORNERS: [], CARDS: [] };

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white mb-6 font-mono text-sm">
        &larr; Voltar
      </button>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 mb-8 flex justify-between items-center">
        <div className="text-3xl font-bold mt-4">{game.homeTeam}</div>
        <div className="flex flex-col items-center mt-4">
          <span className="text-green-400 font-bold tracking-widest text-sm mb-2">{game.status}</span>
          <span className="text-4xl font-mono">{game.score}</span>
        </div>
        <div className="text-3xl font-bold mt-4">{game.awayTeam}</div>
      </div>

      {isLoadingOdds ? (
        <div className="text-center p-8"><p className="text-blue-400 animate-pulse font-mono">Calculando Liquidez AMM...</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            
            <div className="flex space-x-4 border-b border-gray-800 mb-6 pb-2 overflow-x-auto">
              {(['DEGEN', 'MATCH_WINNER', 'GOALS', 'CORNERS', 'CARDS'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedOdd(null); }}
                  className={`pb-2 px-4 font-bold whitespace-nowrap ${activeTab === tab ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {tab === 'DEGEN' ? '🔥 DEGEN (Narrativas)' : tab === 'MATCH_WINNER' ? 'Vencedor' : tab === 'GOALS' ? 'Gols' : tab === 'CORNERS' ? 'Escanteios' : 'Cartões'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketData[activeTab]?.map((odd: any) => (
                <button
                  key={odd.id}
                  onClick={() => setSelectedOdd(odd)}
                  className={`p-4 rounded-lg border text-left flex flex-col justify-center transition-colors ${
                    selectedOdd?.id === odd.id ? 'bg-purple-900/40 border-purple-500' : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                  }`}
                >
                  <span className={`font-semibold text-sm mb-2 ${activeTab === 'DEGEN' ? 'text-purple-400' : ''}`}>{odd.label}</span>
                  <span className="font-mono text-white font-bold">{odd.multiplier.toFixed(2)}x</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 h-fit">
            <h3 className="text-xl font-bold mb-6 border-b border-gray-800 pb-4">Bet Slip</h3>
            {!selectedOdd ? (
              <div className="text-gray-500 text-center py-8">Selecione uma opção ao lado para simular.</div>
            ) : (
              <div className="flex flex-col space-y-6">
                <div>
                  <div className="text-sm text-gray-400">Seleção</div>
                  <div className="font-bold text-lg">{selectedOdd.label}</div>
                  <div className="text-xs text-blue-400 font-mono mt-1">TxLINE Key: {selectedOdd.key}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Tamanho (SOL)</label>
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
                disabled={isProcessing}
                className={`w-full font-bold py-4 rounded transition-colors ${
                  isProcessing ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : activeTab === 'DEGEN' ? 'bg-purple-600 text-white hover:bg-purple-500' 
                  : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {isProcessing ? 'Processando na Blockchain...' : 'Assinar Transação'}
              </button>
              </div>
          )}
          </div>
        </div>
      )}

      {txNotification.show && (
        <div className="fixed bottom-4 right-4 bg-gray-900 border border-green-500 text-white p-4 rounded-lg shadow-lg flex flex-col gap-2 animate-fade-in z-50">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-green-400">Transação Confirmada</span>
            <button onClick={() => setTxNotification({show: false, signature: ''})} className="text-gray-500 hover:text-white text-xl leading-none">&times;</button>
          </div>
          <a href={`https://solscan.io/tx/${txNotification.signature}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-xs font-mono text-blue-400 hover:underline break-all">
            {txNotification.signature}
          </a>
        </div>
      )}

    </main>
  );
}
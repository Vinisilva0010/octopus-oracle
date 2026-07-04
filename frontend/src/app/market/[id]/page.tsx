"use client";

import { useState, use } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, web3, BN, Idl } from "@coral-xyz/anchor";
import idl from "../../../idl/contracts.json";
import { useRouter } from "next/navigation";

export default function MarketDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [amount, setAmount] = useState("0.5");
  const [choice, setChoice] = useState<number | null>(null);
  const [isTxPending, setIsTxPending] = useState(false);
  const [txSig, setTxSig] = useState("");

  // Desempacota a Promise do Next.js 16
  const { id } = use(params);

  const fixtureId = new BN(id);
  const marketType = 1;

  const placePosition = async () => {
    if (!wallet.publicKey || !wallet.signTransaction || choice === null) return;
    
    setIsTxPending(true);
    setTxSig("");

    try {
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: "confirmed" });
      const program = new Program(idl as Idl, provider);

      const [marketPda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("market"), fixtureId.toArrayLike(Buffer, "le", 8), Buffer.from([marketType])],
        program.programId
      );

      const [positionPda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("position"), marketPda.toBuffer(), wallet.publicKey.toBuffer()],
        program.programId
      );

      const amountInLamports = new BN(parseFloat(amount) * web3.LAMPORTS_PER_SOL);

      const tx = await program.methods
        .placePosition(choice, amountInLamports)
        .accounts({
          user: wallet.publicKey,
          market: marketPda,
          position: positionPda,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      setTxSig(tx);
    } catch (error) {
      console.error("Falha na transação:", error);
    } finally {
      setIsTxPending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white border-4 border-violet-950 shadow-[8px_8px_0px_0px_#2e1065] p-8">
        <div className="border-b-4 border-violet-950 pb-6 mb-6">
          <div className="text-sm font-black text-violet-500 mb-2 uppercase tracking-widest">
            Fixture #{id}
          </div>
          <h1 className="text-4xl font-black uppercase text-violet-950 leading-none">
            Qual time sairá vitorioso?
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => setChoice(1)}
            className={`border-4 border-violet-950 p-6 font-black text-2xl uppercase transition-all ${choice === 1 ? 'bg-violet-900 text-white shadow-none translate-y-1' : 'bg-slate-50 text-violet-950 shadow-[4px_4px_0px_0px_#2e1065] hover:-translate-y-1'}`}
          >
            Time Casa
          </button>
          <button 
            onClick={() => setChoice(2)}
            className={`border-4 border-violet-950 p-6 font-black text-2xl uppercase transition-all ${choice === 2 ? 'bg-violet-900 text-white shadow-none translate-y-1' : 'bg-slate-50 text-violet-950 shadow-[4px_4px_0px_0px_#2e1065] hover:-translate-y-1'}`}
          >
            Time Fora
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <label className="block font-black text-violet-950 uppercase">Valor do Escrow (SOL Devnet)</label>
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border-4 border-violet-950 bg-slate-50 p-4 font-bold text-xl outline-none focus:bg-yellow-100 transition-colors"
            step="0.1"
          />
        </div>

        {txSig && (
          <div className="bg-green-100 border-4 border-green-800 p-4 mb-8 text-green-900 font-bold break-all shadow-[4px_4px_0px_0px_#166534]">
            Sucesso! Hash: {txSig}
          </div>
        )}

        <button 
          onClick={placePosition}
          disabled={!wallet.connected || choice === null || isTxPending}
          className="w-full border-4 border-violet-950 bg-yellow-400 text-violet-950 font-black text-2xl uppercase py-6 shadow-[6px_6px_0px_0px_#2e1065] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#2e1065] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isTxPending ? "Processando..." : "Travar SOL no Escrow"}
        </button>
      </div>
    </div>
  );
}
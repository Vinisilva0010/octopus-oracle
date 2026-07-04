import Link from "next/link";

// Mock temporário reproduzindo a estrutura que virá da TxLINE / Worker
const MOCK_FIXTURES = [
  { id: "17952170", home: "Real Madrid", away: "Barcelona", time: "Hoje, 16:00", status: "OPEN", volume: "145.2 SOL" },
  { id: "17952171", home: "Arsenal", away: "Liverpool", time: "Amanhã, 12:30", status: "OPEN", volume: "89.5 SOL" },
  { id: "17952172", home: "Boca Juniors", away: "River Plate", time: "Hoje, 21:00", status: "LIVE", volume: "312.0 SOL" },
  { id: "17952173", home: "Flamengo", away: "Palmeiras", time: "Encerrado", status: "SETTLED", volume: "504.1 SOL" },
];

export default function Home() {
  return (
    <div className="space-y-10">
      
      {/* Banner de Aviso (Idêntico a referência) */}
      <div className="bg-green-100 border-2 border-green-800 text-green-900 font-bold px-4 py-3 flex justify-between items-center shadow-[4px_4px_0px_0px_#166534]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse border border-green-900"></span>
          Devnet Ready - Conecte sua carteira para travar SOL no escrow.
        </div>
      </div>

      <section>
        <div className="flex justify-between items-end mb-6">
          <h1 className="text-3xl font-black uppercase tracking-tight text-violet-950">
            Explorar Partidas
          </h1>
          <div className="flex gap-2">
            <button className="border-2 border-violet-950 bg-violet-900 text-white font-bold px-4 py-2 text-sm shadow-[2px_2px_0px_0px_#2e1065] hover:translate-y-[2px] hover:shadow-none transition-all">
              ⚡ Ao Vivo
            </button>
            <button className="border-2 border-violet-950 bg-white text-violet-950 font-bold px-4 py-2 text-sm shadow-[2px_2px_0px_0px_#2e1065] hover:translate-y-[2px] hover:shadow-none transition-all">
              Abertos
            </button>
          </div>
        </div>

        {/* Grid Neo-Brutalista */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_FIXTURES.map((match) => (
            <div 
              key={match.id} 
              className="bg-white border-4 border-violet-950 shadow-[6px_6px_0px_0px_#2e1065] flex flex-col transition-transform hover:-translate-y-1"
            >
              {/* Header do Card */}
              <div className="p-4 border-b-4 border-violet-950 flex justify-between items-start bg-slate-50">
                <div>
                  <div className="text-xs font-bold text-violet-500 mb-1">FIXTURE #{match.id}</div>
                  <div className="font-black text-xl leading-tight">{match.home}</div>
                  <div className="font-black text-xl leading-tight text-slate-400">vs</div>
                  <div className="font-black text-xl leading-tight">{match.away}</div>
                </div>
                {match.status === "LIVE" && (
                  <span className="bg-red-500 text-white text-xs font-black px-2 py-1 border-2 border-violet-950 animate-pulse">AO VIVO</span>
                )}
                {match.status === "SETTLED" && (
                  <span className="bg-slate-300 text-slate-600 text-xs font-black px-2 py-1 border-2 border-violet-950">FINALIZADO</span>
                )}
              </div>

              {/* Corpo do Card */}
              <div className="p-4 flex-grow flex flex-col justify-between space-y-4">
                <div className="flex justify-between text-sm font-bold border-b-2 border-dashed border-violet-200 pb-2">
                  <span className="text-slate-500">Horário</span>
                  <span>{match.time}</span>
                </div>
                
                <div className="flex justify-between text-sm font-bold border-b-2 border-dashed border-violet-200 pb-2">
                  <span className="text-slate-500">Volume Travado</span>
                  <span>{match.volume}</span>
                </div>

                <Link 
                  href={`/market/${match.id}`}
                  className="block w-full text-center border-2 border-violet-950 bg-yellow-400 text-violet-950 font-black uppercase tracking-wide py-3 shadow-[4px_4px_0px_0px_#2e1065] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#2e1065] transition-all"
                >
                  Ver Mercados
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
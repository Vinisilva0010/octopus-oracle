import { create } from 'zustand';

// Tipagem alinhada com a API da TxLINE e nosso contrato
export interface Market {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  status: string; // 'PRE_MATCH', 'LIVE', 'FINISHED'
  score: string;
}

interface MarketState {
  activeMarkets: Market[];
  isLoading: boolean;
  error: string | null;
  fetchLiveMarkets: () => Promise<void>;
}

export const useMarketStore = create<MarketState>((set) => ({
  activeMarkets: [],
  isLoading: false,
  error: null,

  fetchLiveMarkets: async () => {
    set({ isLoading: true });
    try {
      // Endpoint do nosso worker Python que serve os dados crus da TxLINE
      const res = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + '/api/markets/live');
      if (!res.ok) throw new Error('Falha na resposta da API');
      const data = await res.json();
      
      set({ activeMarkets: data, isLoading: false, error: null });
    } catch (err) {
      set({ error: 'Falha ao sincronizar com o oráculo da TxLINE', isLoading: false });
    }
  },
}));
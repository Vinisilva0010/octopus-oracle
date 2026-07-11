import { create } from 'zustand';

export interface Market {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  status: string;
  score: string;
}

interface MarketState {
  activeMarkets: Market[];
  currentOdds: any | null;
  isLoading: boolean;
  isLoadingOdds: boolean;
  error: string | null;
  fetchLiveMarkets: () => Promise<void>;
  fetchFixtureOdds: (fixtureId: string) => Promise<void>;
}

export const useMarketStore = create<MarketState>((set) => ({
  activeMarkets: [],
  currentOdds: null,
  isLoading: false,
  isLoadingOdds: false,
  error: null,

  fetchLiveMarkets: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/markets/live`);
      if (!res.ok) throw new Error('Falha na resposta da API');
      const data = await res.json();
      set({ activeMarkets: data, isLoading: false, error: null });
    } catch (err) {
      set({ error: 'Falha ao sincronizar com o oráculo', isLoading: false });
    }
  },

  fetchFixtureOdds: async (fixtureId: string) => {
    set({ isLoadingOdds: true, currentOdds: null });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/markets/${fixtureId}`);
      if (!res.ok) throw new Error('Falha na resposta da API de odds');
      const data = await res.json();
      set({ currentOdds: data, isLoadingOdds: false, error: null });
    } catch (err) {
      set({ error: 'Falha ao carregar as odds do evento', isLoadingOdds: false });
    }
  },
}));
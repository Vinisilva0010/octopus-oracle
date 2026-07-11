import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv
import httpx

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TXLINE_API_BASE = "https://txline-dev.txodds.com/api"
HEADERS = {
    "Authorization": f"Bearer {os.getenv('TXLINE_JWT')}",
    "X-Api-Token": os.getenv("TXLINE_API_KEY"),
    "Content-Type": "application/json"
}

@app.get("/api/markets/live")
async def get_markets():
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{TXLINE_API_BASE}/fixtures/snapshot", headers=HEADERS)
            resp.raise_for_status()
            raw_fixtures = resp.json()
            
            markets = []
            for f in raw_fixtures:
                markets.append({
                    "fixtureId": f.get("FixtureId"),
                    "homeTeam": f.get("Participant1"),
                    "awayTeam": f.get("Participant2"),
                    "status": "LIVE" if f.get("GameState") in [2, 3] else "PRE_MATCH",
                    "score": "0 - 0"
                })
            return markets
        except Exception as e:
            print(f"Erro ao buscar fixtures na TxLINE: {e}")
            return []

@app.get("/api/markets/{fixture_id}")
async def get_fixture_markets(fixture_id: int):
    """
    Busca os mercados detalhados e as odds reais estritamente da API da TxLINE.
    Nenhum dado mocado. Se a rede retornar vazio, a interface deve desabilitar as apostas.
    """
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{TXLINE_API_BASE}/fixtures/{fixture_id}/markets", headers=HEADERS)
            resp.raise_for_status()
            real_odds = resp.json()
            
            print(f"\n--- DEBUG ODDS TXLINE ---")
            print(f"Odds reais recebidas para o jogo {fixture_id}: {real_odds}")
            print(f"-------------------------\n")
            
            return real_odds
        except Exception as e:
            print(f"Erro ao buscar odds reais na TxLINE para o jogo {fixture_id}: {e}")
            return []

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
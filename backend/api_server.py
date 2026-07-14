import os
import hashlib
import httpx
import uvicorn
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
class BetRecord(BaseModel):
    tx_signature: str
    wallet: str
    fixture_id: int
    game_title: str
    market_key: int
    market_label: str
    amount_sol: float
    multiplier: float
from database import init_db, get_db_connection

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicia o banco de dados antes da API aceitar requisições
    await init_db()
    yield

app = FastAPI(lifespan=lifespan)

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

def generate_amm_pricing(fixture_id: int, home_team: str, away_team: str):
    hash_val = int(hashlib.md5(f"{home_team}{away_team}".encode()).hexdigest(), 16)

    home_weight = 1.0 + (hash_val % 15) / 100.0
    away_weight = 1.0 + ((hash_val // 10) % 15) / 100.0
    spread = 0.95 
    
    # MERCADOS DEGEN / NARRATIVOS (Sem necessidade de alteração no Rust)
    degen_options = [
        {"id": "var_flip", "key": 10, "label": "Flip do VAR (Juiz reverte decisão na tela)", "multiplier": round(5.50 * spread, 2)},
        {"id": "woodwork", "key": 11, "label": "Madeira Maldita (Bola na Trave no 1º Tempo)", "multiplier": round(3.80 * spread, 2)},
        {"id": "var_offside", "key": 12, "label": "Impedimento Milimétrico (Gol anulado pelo VAR)", "multiplier": round(4.20 * spread, 2)},
        {"id": "red_card_home", "key": 13, "label": f"Colapso Emocional: Vermelho Direto para {home_team}", "multiplier": round(7.00 * spread, 2)},
        {"id": "chaos_combo", "key": 14, "label": "Combo do Caos (Amarelo + VAR em menos de 5 min)", "multiplier": round(12.00 * spread, 2)}
    ]

    goals_options = []
    for gols in range(1, 6):
        multiplicador = 1.1 + (gols * 0.45)
        goals_options.append({
            "id": f"exatamente_{gols}_gols", 
            "key": 2, 
            "label": f"Exatamente {gols} Gols na partida", 
            "multiplier": round(multiplicador * spread, 2)
        })

    corners_options = []
    for limite in [5, 7, 9, 12, 15]:
        risco = limite / 6.0
        corners_options.append({
            "id": f"mais_de_{limite}_escanteios", 
            "key": 3, 
            "label": f"Mais de {limite} Escanteios", 
            "multiplier": round(1.2 * risco * spread, 2)
        })

    cards_options = [
        {"id": "jogo_limpo", "key": 4, "label": "Jogo Limpo (0 a 3 cartões)", "multiplier": round(2.80 * spread, 2)},
        {"id": "jogo_tenso", "key": 4, "label": "Jogo Tenso (Mais de 6 cartões)", "multiplier": round(2.10 * spread, 2)},
        {"id": f"mais_cartoes_{home_team}", "key": 4, "label": f"{home_team} recebe mais cartões", "multiplier": round((1.90 * home_weight) * spread, 2)},
        {"id": f"mais_cartoes_{away_team}", "key": 4, "label": f"{away_team} recebe mais cartões", "multiplier": round((1.90 * away_weight) * spread, 2)}
    ]

    return {
        "DEGEN": degen_options,
        "MATCH_WINNER": [
            {"id": "winner_home", "key": 1, "label": f"Vitória Absoluta: {home_team}", "multiplier": round((2.0 / home_weight) * spread, 2)},
            {"id": "draw", "key": 1, "label": "Empate Técnico", "multiplier": round(3.20 * spread, 2)},
            {"id": "winner_away", "key": 1, "label": f"Vitória Absoluta: {away_team}", "multiplier": round((2.0 / away_weight) * spread, 2)},
        ],
        "GOALS": goals_options,
        "CORNERS": corners_options,
        "CARDS": cards_options
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
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{TXLINE_API_BASE}/fixtures/snapshot", headers=HEADERS)
            resp.raise_for_status()
            
            home, away = "Time Casa", "Time Fora"
            for f in resp.json():
                if f.get("FixtureId") == fixture_id:
                    home = f.get("Participant1", "Time Casa")
                    away = f.get("Participant2", "Time Fora")
                    break

            amm_markets = generate_amm_pricing(fixture_id, home, away)
            return {"isSandbox": False, "data": amm_markets}
            
        except Exception as e:
            print(f"Erro Crítico no Motor AMM: {e}")
            fallback_amm = generate_amm_pricing(fixture_id, "Time Casa", "Time Fora")
            return {"isSandbox": False, "data": fallback_amm}
        
        
        
@app.post("/api/portfolio/record")
async def record_bet(bet: BetRecord):
    conn = await get_db_connection()
    try:
        await conn.execute('''
            INSERT INTO positions (tx_signature, wallet, fixture_id, game_title, market_key, market_label, amount_sol, multiplier)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (tx_signature) DO NOTHING
        ''', bet.tx_signature, bet.wallet, bet.fixture_id, bet.game_title, bet.market_key, bet.market_label, bet.amount_sol, bet.multiplier)
        return {"status": "success"}
    except Exception as e:
        print(f"Erro ao salvar aposta no banco: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        await conn.close()        
        
@app.get("/api/portfolio/{wallet}")
async def get_portfolio(wallet: str):
    conn = await get_db_connection()
    rows = await conn.fetch("SELECT * FROM positions WHERE wallet = $1 ORDER BY created_at DESC", wallet)
    await conn.close()
    
    net_pnl = 0.0
    wins = losses = 0
    total_volume = 0.0
    current_streak = longest_streak = 0
    degen_hits = degen_total = 0
    largest_payout = locked_escrow = 0.0
    market_counts = {}
    history = []
    
    for r in rows:
        amount = float(r['amount_sol'])
        mult = float(r['multiplier'])
        status = r['status']
        market_key = r['market_key']
        
        total_volume += amount
        market_counts[r['market_label']] = market_counts.get(r['market_label'], 0) + 1
        
        # Filtro de apostas insanas (Chaves 10 a 14 do Degen Market)
        if 10 <= market_key <= 14:
            degen_total += 1
            if status == 'GREEN': degen_hits += 1
        
        payout = amount * mult
        return_amount = "Pendente"
        
        if status == 'GREEN':
            wins += 1
            net_pnl += (payout - amount)
            current_streak += 1
            if current_streak > longest_streak: longest_streak = current_streak
            if payout > largest_payout: largest_payout = payout
            return_amount = f"+{payout:.3f}"
        elif status == 'RED':
            losses += 1
            net_pnl -= amount
            current_streak = 0
            return_amount = f"-{amount:.3f}"
        elif status == 'LIVE':
            locked_escrow += amount
            
        history.append({
            "id": str(r['id']),
            "game": r['game_title'],
            "market": r['market_label'],
            "amount": amount,
            "status": status,
            "returnAmount": return_amount
        })
        
    total_finished = wins + losses
    win_rate = f"{(wins / total_finished * 100):.1f}%" if total_finished > 0 else "0%"
    degen_rate = f"{(degen_hits / degen_total * 100):.1f}%" if degen_total > 0 else "0%"
    fav_market = max(market_counts, key=market_counts.get) if market_counts else "Nenhum"
    avg_bet = total_volume / len(rows) if rows else 0.0
    
    # Algoritmo de perfil de risco
    avg_mult = sum([float(r['multiplier']) for r in rows]) / len(rows) if rows else 0
    risk = "Conservador" if avg_mult < 2.0 else "Moderado" if avg_mult < 4.5 else "Kamikaze (Alto Risco)"
    if not rows: risk = "Sem dados"
    
    return {
        "stats": {
            "netPnl": net_pnl,
            "winRate": win_rate,
            "totalVolume": total_volume,
            "longestStreak": longest_streak,
            "degenHitRate": degen_rate,
            "largestPayout": largest_payout,
            "lockedEscrow": locked_escrow,
            "favoriteMarket": fav_market,
            "avgBetSize": avg_bet,
            "riskIndex": risk,
            "totalPositions": len(rows)
        },
        "history": history
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
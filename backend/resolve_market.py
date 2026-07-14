import os
import json
import httpx
import asyncio
import struct
from dotenv import load_dotenv
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.transaction import VersionedTransaction
from solders.message import MessageV0
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from solana.rpc.types import TxOpts

load_dotenv()

TXLINE_API_BASE = "https://txline-dev.txodds.com/api"
HEADERS = {
    "Authorization": f"Bearer {os.getenv('TXLINE_JWT')}",
    "X-Api-Token": os.getenv("TXLINE_API_KEY"),
    "Content-Type": "application/json"
}
RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
PROGRAM_ID = Pubkey.from_string(os.getenv("PROGRAM_ID"))
WALLET_PATH = os.path.expanduser(os.getenv("PAYER_KEYPAIR_PATH"))
TXLINE_PROGRAM_ID = Pubkey.from_string("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J")
ROOTS_PDA = Pubkey.from_string("HYo6qqMUXRaMit2YF6q6YEh5K1mWYBFC3pDZrV2HZN5f")

DISCRIMINATOR = bytes([155, 23, 80, 173, 46, 74, 23, 239])

def load_keypair(path):
    with open(path) as f: return Keypair.from_bytes(bytes(json.load(f)))

def get_fresh_fixture_from_stream():
    print("-> Escutando a API da TxLINE (aguarde o proximo evento ao vivo bater na rede)...")
    with httpx.stream("GET", f"{TXLINE_API_BASE}/scores/stream", headers=HEADERS, timeout=None) as r:
        for line in r.iter_lines():
            if line.startswith("data:"):
                try:
                    raw = line.replace("data:", "").strip()
                    if not raw: continue
                    payload = json.loads(raw)
                    if "fixtureId" in payload and "seq" in payload:
                        return payload["fixtureId"], payload["seq"]
                except:
                    continue

def fetch_validation(fixture_id, seq, stat_key=1002):
    res = httpx.get(f"{TXLINE_API_BASE}/scores/stat-validation", headers=HEADERS, 
                    params={"fixtureId": fixture_id, "seq": seq, "statKey": stat_key})
    res.raise_for_status()
    return res.json()

def ser_proof_nodes(nodes):
    out = struct.pack("<I", len(nodes))
    for n in nodes:
        out += bytes.fromhex(n["hash"].replace("0x", "").zfill(64))
        out += bytes([1 if n["isRightSibling"] else 0])
    return out

def ser_scores_batch_summary(f_id, stats, root):
    out = struct.pack("<q", f_id)
    out += struct.pack("<iqq", stats["updateCount"], stats["minTimestamp"], stats["maxTimestamp"])
    out += bytes.fromhex(root.replace("0x", "").zfill(64))
    return out

def ser_stat_term(stat, root, proof):
    out = struct.pack("<Iii", stat["key"], stat["value"], stat.get("period", 0))
    out += bytes.fromhex(root.replace("0x", "").zfill(64))
    out += ser_proof_nodes(proof)
    return out

def build_ix(payer, market_pda, d, winning_choice=1):
    stat, summary = d["statToProve"], d["summary"]
    payload = DISCRIMINATOR + struct.pack("<q", d["ts"])
    payload += ser_scores_batch_summary(summary["fixtureId"], summary["updateStats"], summary["eventStatsSubTreeRoot"])
    payload += ser_proof_nodes(d["subTreeProof"])
    payload += ser_proof_nodes(d["mainTreeProof"])
    payload += struct.pack("<iB", stat["value"], 0)
    payload += ser_stat_term(stat, summary["eventStatsSubTreeRoot"], d["statProof"])
    payload += struct.pack("<B", winning_choice)
    payload += bytes([0, 0])
    
    return Instruction(PROGRAM_ID, [
        AccountMeta(payer, True, True),
        AccountMeta(market_pda, False, True),
        AccountMeta(ROOTS_PDA, False, False),
        AccountMeta(TXLINE_PROGRAM_ID, False, False)
    ], bytes(payload))

VALID_MARKET_KEYS = [1, 2, 3, 4, 7]

async def main():
    client = None
    try:
        fix_id, seq = get_fresh_fixture_from_stream()
        print(f"-> Evento capturado: {fix_id} (Seq: {seq})")
        
        d = fetch_validation(fix_id, seq)
        keypair = load_keypair(WALLET_PATH)
        client = AsyncClient(RPC_URL)
        
        print("-> Iniciando varredura e liquidação de todos os mercados do AMM...")
        
        for market_type in VALID_MARKET_KEYS:
            market_pda, _ = Pubkey.find_program_address(
                [b"market", struct.pack("<Q", fix_id), bytes([market_type])], 
                PROGRAM_ID
            )
            
            # Checagem de segurança: Só tenta liquidar se o cofre foi aberto (alguém apostou)
            acc_info = await client.get_account_info(market_pda)
            if acc_info.value is None:
                continue

            print(f"-> Assinando transacao de settlement para o mercado {market_type} (PDA: {market_pda})...")
            ix = build_ix(keypair.pubkey(), market_pda, d)
            bh = (await client.get_latest_blockhash()).value.blockhash
            msg = MessageV0.try_compile(keypair.pubkey(), [ix], [], bh)
            tx = VersionedTransaction(msg, [keypair])

            try:
                resp = await client.send_transaction(tx, opts=TxOpts(skip_preflight=False))
                print(f"[ SUCESSO ABSOLUTO ] Mercado {market_type} liquidado! Hash: {resp.value}")
            except Exception as e:
                print(f"[ FALHA NO MERCADO {market_type} ] {e}")
                
    except Exception as e:
        print(f"\n[ ERRO FATAL ] {e}")
    finally:
        if client:
            await client.close()

if __name__ == "__main__":
    asyncio.run(main())
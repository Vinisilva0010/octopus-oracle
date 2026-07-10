import os
import json
import httpx
from dotenv import load_dotenv
from sseclient import SSEClient


load_dotenv()


TXLINE_API_BASE = "https://txline-dev.txodds.com/api"
TXLINE_JWT = os.getenv("TXLINE_JWT")
TXLINE_API_KEY = os.getenv("TXLINE_API_KEY")


def listen_to_txline_oracles():
    print("[WORKER] Inicializando engine do oráculo off-chain...")
    
    headers = {
        "Authorization": f"Bearer {TXLINE_JWT}",
        "X-Api-Token": TXLINE_API_KEY,
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache",
    }
    
    url = f"{TXLINE_API_BASE}/scores/stream"
    
    try:
        with httpx.stream("GET", url, headers=headers, timeout=None) as response:
            response.raise_for_status()
            print("[WORKER] Conexão SSE estabelecida. Monitorando eventos...")

            client = SSEClient(response.iter_bytes())

            for event in client.events():
                if event.data:
                    try:
                        payload = json.loads(event.data)
                        print("\n[EVENTO RECEBIDO]")
                        print(json.dumps(payload, indent=2))
                    except json.JSONDecodeError:
                        print(f"[RAW] {event.data}")
                        
    except httpx.HTTPStatusError as e:
        e.response.read()
        print(f"[WORKER] Rejeição HTTP: {e.response.status_code} - {e.response.text}")
    except Exception as e:
        print(f"[WORKER] Falha crítica: {e}")


if __name__ == "__main__":
    listen_to_txline_oracles()
import os
import json
import asyncio
import struct
from dotenv import load_dotenv
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.transaction import VersionedTransaction
from solders.message import MessageV0
from solders.system_program import ID as SYSTEM_PROGRAM_ID
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from solana.rpc.types import TxOpts

load_dotenv()

RPC_URL     = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
PROGRAM_ID  = Pubkey.from_string(os.getenv("PROGRAM_ID"))
WALLET_PATH = os.path.expanduser(os.getenv("PAYER_KEYPAIR_PATH"))

FIXTURE_ID  = 17952170
MARKET_TYPE = 1

DISCRIMINATOR = bytes([35, 35, 189, 193, 155, 48, 170, 203])

def load_keypair(path):
    with open(path) as f:
        return Keypair.from_bytes(bytes(json.load(f)))

async def main():
    keypair = load_keypair(WALLET_PATH)
    client  = AsyncClient(RPC_URL)

    # Seeds corretos: [b"market", fixture_id.to_le_bytes(), &[market_type]]
    market_pda, _ = Pubkey.find_program_address(
        [
            b"market",
            struct.pack("<Q", FIXTURE_ID),   # u64 little-endian
            bytes([MARKET_TYPE]),            # &[market_type]
        ],
        PROGRAM_ID
    )
    print(f"Authority : {keypair.pubkey()}")
    print(f"Market PDA: {market_pda}")

    payload  = DISCRIMINATOR
    payload += struct.pack("<Q", FIXTURE_ID)
    payload += struct.pack("<B", MARKET_TYPE)

    accounts = [
        AccountMeta(pubkey=keypair.pubkey(),  is_signer=True,  is_writable=True),
        AccountMeta(pubkey=market_pda,        is_signer=False, is_writable=True),
        AccountMeta(pubkey=SYSTEM_PROGRAM_ID, is_signer=False, is_writable=False),
    ]

    ix  = Instruction(program_id=PROGRAM_ID, accounts=accounts, data=bytes(payload))
    bh  = (await client.get_latest_blockhash()).value.blockhash
    msg = MessageV0.try_compile(
        payer=keypair.pubkey(),
        instructions=[ix],
        address_lookup_table_accounts=[],
        recent_blockhash=bh,
    )
    tx   = VersionedTransaction(msg, [keypair])
    resp = await client.send_transaction(
        tx, opts=TxOpts(skip_preflight=False, preflight_commitment=Confirmed)
    )
    print(f"\nSUCESSO! Market inicializado.")
    print(f"Hash: {resp.value}")
    print(f"\nATUALIZE o resolve_market.py com o novo Market PDA: {market_pda}")
    await client.close()

asyncio.run(main())

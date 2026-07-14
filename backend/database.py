import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

async def init_db():
    conn = await asyncpg.connect(DB_URL)
    await conn.execute('''
        CREATE TABLE IF NOT EXISTS positions (
            id SERIAL PRIMARY KEY,
            tx_signature VARCHAR(150) UNIQUE NOT NULL,
            wallet VARCHAR(100) NOT NULL,
            fixture_id INTEGER NOT NULL,
            game_title VARCHAR(150) NOT NULL,
            market_key INTEGER NOT NULL,
            market_label VARCHAR(150) NOT NULL,
            amount_sol NUMERIC(10, 3) NOT NULL,
            multiplier NUMERIC(10, 2) NOT NULL,
            status VARCHAR(10) NOT NULL DEFAULT 'LIVE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    await conn.close()

async def get_db_connection():
    return await asyncpg.connect(DB_URL)
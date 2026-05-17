"""
Idempotent migration: add emoji column to the budget table.
Run once from the backend/ directory:
    python migrate_budget_emoji.py
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set in .env")

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
    ALTER TABLE budget
    ADD COLUMN IF NOT EXISTS emoji VARCHAR NOT NULL DEFAULT '💼';
""")

cur.execute("""
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'budget' AND column_name = 'emoji';
""")
row = cur.fetchone()
if row:
    print("OK  Column 'emoji' exists in table 'budget'.")
else:
    print("FAIL  Column not found - check the database manually.")

cur.close()
conn.close()

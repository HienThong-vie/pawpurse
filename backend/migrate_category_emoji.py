"""
Idempotent migration:
  1. Add `emoji` column to the `category` table (if it doesn't exist).
  2. Copy non-default emoji values from `budget` rows onto their matching
     category (matched by user_id + name).
  3. Drop the `emoji` column from `budget` (if it exists).

Run once from the backend/ directory:
    python migrate_category_emoji.py
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

# Step 1: Add emoji column to category
cur.execute("""
    ALTER TABLE category
    ADD COLUMN IF NOT EXISTS emoji VARCHAR NOT NULL DEFAULT '💼';
""")
print("OK  Added 'emoji' column to category (if missing).")

# Step 2: Copy budget.emoji -> category.emoji where budget has a non-default
# emoji and a matching category exists for the same user. Only run if
# budget.emoji column still exists.
cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'budget' AND column_name = 'emoji';
""")
budget_has_emoji = cur.fetchone() is not None

if budget_has_emoji:
    cur.execute("""
        UPDATE category c
        SET emoji = b.emoji
        FROM budget b
        WHERE b.user_id = c.user_id
          AND LOWER(b.category) = LOWER(c.name)
          AND b.emoji IS NOT NULL
          AND b.emoji <> ''
          AND b.emoji <> '💼';
    """)
    moved = cur.rowcount
    print(f"OK  Copied emojis from budget to category ({moved} rows updated).")
else:
    print("--  budget.emoji column not present, skipping copy step.")

# Step 3: Drop emoji column from budget
cur.execute("""
    ALTER TABLE budget DROP COLUMN IF EXISTS emoji;
""")
print("OK  Dropped 'emoji' column from budget (if present).")

# Verify final state
cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'category' AND column_name = 'emoji';
""")
cat_ok = cur.fetchone() is not None

cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'budget' AND column_name = 'emoji';
""")
budget_still_has = cur.fetchone() is not None

print()
print(f"Verify: category.emoji exists? {'YES' if cat_ok else 'NO'}")
print(f"Verify: budget.emoji removed?  {'YES' if not budget_still_has else 'NO'}")

cur.close()
conn.close()

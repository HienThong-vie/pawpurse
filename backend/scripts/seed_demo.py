"""Create (or reset) a shared demo account with realistic sample data.

Run from backend/ with Supabase admin credentials in backend/.env (or the env):

    DEMO_PASSWORD=... python scripts/seed_demo.py --email demo@pawpurse.app --api-base https://<backend>

Two modes:
  --api-base URL   (recommended) sign in as the demo user and write everything through
                   the public API. Needs only SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
                   SUPABASE_ANON_KEY. Coins/beds can't be set this way (the API forbids it).
  (default)        write straight to DATABASE_URL, including mascot coins and beds.

Idempotent: re-running wipes and re-seeds ONLY the demo user's data, so it doubles as
a reset if visitors make a mess of the shared account. Set the printed user id as
DEMO_USER_ID on the backend to block deleting the account.
"""
import argparse
import os
import random
import sys
import time as clock
from datetime import date, datetime, time, timedelta, timezone

import httpx
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

CURRENCY = "USD"

# Metadata the frontend reads: skip the setup wizard and the rating popup.
DEMO_METADATA = {
    "username": "Demo",
    "has_completed_setup": True,
    "companion": "cat",
    "companion_name": "Miso",
    "base_currency": CURRENCY,
    "has_rated": True,
    "login_count": 2,
}

CATEGORIES = {
    "food": "🍜", "rent": "🏠", "transport": "🚌", "entertainment": "🎬",
    "shopping": "🛍️", "utilities": "💡", "salary": "💼", "freelance": "💻",
}

# (category, min, max, times per month, note options)
EXPENSE_PATTERNS = [
    ("food", 6, 28, 14, ["Lunch", "Groceries", "Coffee", "Dinner out", None]),
    ("transport", 2, 18, 8, ["Bus pass top-up", "Taxi", "Train ticket", None]),
    ("entertainment", 8, 40, 3, ["Cinema", "Concert", "Game", None]),
    ("shopping", 15, 80, 2, ["Clothes", "Books", "Home stuff", None]),
    ("utilities", 30, 70, 1, ["Electricity", "Internet"]),
]

BUDGETS = [  # (category, limit, period)
    ("food", 350, "month"),
    ("transport", 90, "month"),
    ("entertainment", 60, "month"),
    ("shopping", 40, "week"),
]

GOALS = [  # (name, target, saved, months until deadline or None)
    ("Emergency fund", 3000, 1850, None),
    ("Trip to Japan", 2500, 900, 8),
    ("New laptop", 1500, 1200, 3),
]


def build_dataset(today: date) -> dict:
    """Deterministic sample data, independent of how it is stored."""
    rng = random.Random(42)

    def at(day: date, hour: int) -> datetime:
        return datetime.combine(day, time(hour, rng.randint(0, 59)), tzinfo=timezone.utc)

    transactions = []
    # Three months of history, ending today.
    for i in range(3):
        y, m = divmod(today.year * 12 + today.month - 1 - i, 12)
        start = date(y, m + 1, 1)
        days_in_month = ((start.replace(day=28) + timedelta(days=4)).replace(day=1) - start).days
        is_current = (start.year, start.month) == (today.year, today.month)
        last_day = min(days_in_month, (today - start).days + 1) if is_current else days_in_month

        def tx(day_offset, amount, type_, category, note, hour=12):
            transactions.append({
                "amount": round(amount, 2), "type": type_, "category": category, "note": note,
                "date": at(start + timedelta(days=day_offset), hour),
            })

        tx(0, 3200, "income", "salary", "Monthly salary", hour=9)
        tx(0, 1100, "expense", "rent", "Rent", hour=10)
        if rng.random() < 0.7 and last_day > 15:
            tx(rng.randint(10, last_day - 1), rng.choice([250, 400, 600]), "income", "freelance", "Freelance project")
        for category, low, high, times, notes in EXPENSE_PATTERNS:
            for _ in range(max(1, round(times * last_day / days_in_month))):
                tx(rng.randint(0, last_day - 1), rng.uniform(low, high), "expense", category,
                   rng.choice(notes), hour=rng.randint(8, 21))

    # One recurring subscription so the recurring badge shows up.
    transactions.append({
        "amount": 11.99, "type": "expense", "category": "entertainment", "note": "Music streaming",
        "date": at(today - timedelta(days=12), 7), "is_recurring": True, "recurring_interval": "monthly",
    })
    transactions.sort(key=lambda t: t["date"])

    goals = [
        {"name": name, "target_amount": target, "current_amount": saved,
         "deadline": at(today + timedelta(days=30 * months), 12) if months else None}
        for name, target, saved, months in GOALS
    ]
    return {"transactions": transactions, "goals": goals}


def find_or_create_user(email: str, password: str) -> str:
    from core.admin import get_admin_client

    admin = get_admin_client().auth.admin
    existing = next((u for u in admin.list_users() if (u.email or "").lower() == email.lower()), None)
    if existing:
        admin.update_user_by_id(existing.id, {"password": password, "user_metadata": DEMO_METADATA})
        return existing.id
    created = admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": DEMO_METADATA,
    })
    return created.user.id


# ── Storage backend 1: straight to Postgres ───────────────────────────────

def seed_db(user_id: str, data: dict) -> None:
    from core.database import Base, SessionLocal, engine
    from models.budget import Budget
    from models.category import Category
    from models.chat_session import ChatSession
    from models.coin_reward import CoinReward
    from models.goal import Goal
    from models.mascot import Mascot
    from models.notification import Notification
    from models.transaction import Transaction
    from models.UserSettings import UserSettings

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for model in (Transaction, Budget, Category, Goal, UserSettings, Notification,
                      Mascot, ChatSession, CoinReward):
            db.query(model).filter(model.user_id == user_id).delete(synchronize_session=False)

        db.add(UserSettings(user_id=user_id, base_currency=CURRENCY))
        for name, emoji in CATEGORIES.items():
            db.add(Category(user_id=user_id, name=name, emoji=emoji))
        for t in data["transactions"]:
            db.add(Transaction(user_id=user_id, currency=CURRENCY, is_recurring=t.get("is_recurring", False),
                               recurring_interval=t.get("recurring_interval"),
                               last_triggered=t["date"] if t.get("is_recurring") else None,
                               **{k: t[k] for k in ("amount", "type", "category", "note", "date")}))
        for category, limit, period in BUDGETS:
            db.add(Budget(user_id=user_id, category=category, limit=limit, period=period, currency=CURRENCY))
        for g in data["goals"]:
            db.add(Goal(user_id=user_id, currency=CURRENCY, **g))
        db.add(Mascot(user_id=user_id, companion_type="cat", companion_name="Miso", total_coins=24,
                      spent_coins=10, owned_beds=["default", "blue_cushion"], active_bed="blue_cushion"))
        db.commit()
    finally:
        db.close()


# ── Storage backend 2: through the public API ─────────────────────────────

def seed_api(api_base: str, email: str, password: str, data: dict) -> None:
    supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
    anon_key = os.environ["SUPABASE_ANON_KEY"]
    login = httpx.post(
        f"{supabase_url}/auth/v1/token?grant_type=password",
        headers={"apikey": anon_key}, json={"email": email, "password": password}, timeout=30,
    )
    login.raise_for_status()
    api = httpx.Client(
        base_url=api_base.rstrip("/"), timeout=90,
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )

    def call(method: str, path: str, **kwargs) -> httpx.Response:
        for attempt in range(6):
            r = api.request(method, path, **kwargs)
            if r.status_code == 429:  # per-user rate limit: back off, then retry
                clock.sleep(15)
                continue
            r.raise_for_status()
            return r
        raise RuntimeError(f"{method} {path}: still rate limited")

    # Wipe the demo user's existing data.
    call("DELETE", "/transactions/all")
    call("DELETE", "/budgets/all")
    call("DELETE", "/notifications/clear-all")
    for goal in call("GET", "/goals/").json():
        call("DELETE", f"/goals/{goal['id']}")
    for category in call("GET", "/categories/").json():
        call("DELETE", f"/categories/{category['id']}")

    call("PUT", "/settings/", json={"base_currency": CURRENCY})
    call("GET", "/mascot/")  # lazily creates the companion from the user metadata
    for name, emoji in CATEGORIES.items():
        call("POST", "/categories/", json={"name": name, "emoji": emoji})
    for category, limit, period in BUDGETS:
        call("POST", "/budgets/", json={"category": category, "limit": limit, "period": period, "currency": CURRENCY})
    for g in data["goals"]:
        call("POST", "/goals/", json={
            **g, "currency": CURRENCY, "deadline": g["deadline"].isoformat() if g["deadline"] else None})

    total = len(data["transactions"])
    for i, t in enumerate(data["transactions"], 1):
        call("POST", "/transactions/", json={
            **t, "currency": CURRENCY, "date": t["date"].isoformat(),
            "recurring_interval": t.get("recurring_interval")})
        clock.sleep(2.1)  # stay under the 30/minute write limit
        if i % 20 == 0:
            print(f"  {i}/{total} transactions", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", default="demo@pawpurse.app")
    parser.add_argument("--api-base", help="seed through this backend URL instead of the database")
    args = parser.parse_args()
    password = os.getenv("DEMO_PASSWORD")
    if not password or len(password) < 8:
        sys.exit("Set DEMO_PASSWORD (8+ characters) in the environment.")

    user_id = find_or_create_user(args.email, password)
    data = build_dataset(date.today())
    if args.api_base:
        seed_api(args.api_base, args.email, password, data)
    else:
        seed_db(user_id, data)
    print(f"Seeded demo account {args.email} (user id {user_id}).")
    print(f"Set DEMO_USER_ID={user_id} on the backend to protect it from deletion.")


if __name__ == "__main__":
    main()

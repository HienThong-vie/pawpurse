"""Create (or reset) a shared demo account with realistic sample data.

Run from backend/ with the production env loaded:

    DEMO_PASSWORD=... python scripts/seed_demo.py --email demo@pawpurse.app

Idempotent: re-running wipes and re-seeds ONLY the demo user's rows, so it
doubles as a reset if visitors make a mess of the shared account. Set the
printed user id as DEMO_USER_ID on the backend to block deleting the account.
"""
import argparse
import os
import random
import sys
from datetime import date, datetime, time, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.admin import get_admin_client  # noqa: E402
from core.database import Base, SessionLocal, engine  # noqa: E402
from models.budget import Budget  # noqa: E402
from models.category import Category  # noqa: E402
from models.chat_session import ChatSession  # noqa: E402
from models.coin_reward import CoinReward  # noqa: E402
from models.goal import Goal  # noqa: E402
from models.mascot import Mascot  # noqa: E402
from models.notification import Notification  # noqa: E402
from models.transaction import Transaction  # noqa: E402
from models.UserSettings import UserSettings  # noqa: E402

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


def find_or_create_user(email: str, password: str) -> str:
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


def at(day: date, hour: int) -> datetime:
    return datetime.combine(day, time(hour, random.randint(0, 59)), tzinfo=timezone.utc)


def seed(user_id: str) -> None:
    Base.metadata.create_all(bind=engine)
    rng = random.Random(42)
    random.seed(42)
    today = date.today()
    db = SessionLocal()
    try:
        for model in (Transaction, Budget, Category, Goal, UserSettings, Notification,
                      Mascot, ChatSession, CoinReward):
            db.query(model).filter(model.user_id == user_id).delete(synchronize_session=False)

        db.add(UserSettings(user_id=user_id, base_currency=CURRENCY))
        for name, emoji in CATEGORIES.items():
            db.add(Category(user_id=user_id, name=name, emoji=emoji))

        # Three months of history, ending today.
        month_starts = []
        for i in range(3):
            y, m = divmod(today.year * 12 + today.month - 1 - i, 12)
            month_starts.append(date(y, m + 1, 1))
        for start in month_starts:
            days_in_month = ((start.replace(day=28) + timedelta(days=4)).replace(day=1) - start).days
            last_day = min(days_in_month, (today - start).days + 1) if start.month == today.month and start.year == today.year else days_in_month

            def tx(day_offset, amount, type_, category, note, hour=12):
                db.add(Transaction(user_id=user_id, amount=round(amount, 2), type=type_, category=category,
                                   note=note, currency=CURRENCY, date=at(start + timedelta(days=day_offset), hour)))

            tx(0, 3200, "income", "salary", "Monthly salary", hour=9)
            tx(0, 1100, "expense", "rent", "Rent", hour=10)
            if rng.random() < 0.7 and last_day > 15:
                tx(rng.randint(10, last_day - 1), rng.choice([250, 400, 600]), "income", "freelance", "Freelance project")
            for category, low, high, times, notes in EXPENSE_PATTERNS:
                for _ in range(max(1, round(times * last_day / days_in_month))):
                    tx(rng.randint(0, last_day - 1), rng.uniform(low, high), "expense", category,
                       rng.choice(notes), hour=rng.randint(8, 21))

        # One recurring subscription so the recurring badge shows up.
        db.add(Transaction(user_id=user_id, amount=11.99, type="expense", category="entertainment",
                           note="Music streaming", currency=CURRENCY, is_recurring=True,
                           recurring_interval="monthly", date=at(today - timedelta(days=12), 7),
                           last_triggered=at(today - timedelta(days=12), 7)))

        for category, limit, period in BUDGETS:
            db.add(Budget(user_id=user_id, category=category, limit=limit, period=period, currency=CURRENCY))

        for name, target, saved, months in [
            ("Emergency fund", 3000, 1850, None),
            ("Trip to Japan", 2500, 900, 8),
            ("New laptop", 1500, 1200, 3),
        ]:
            deadline = at(today + timedelta(days=30 * months), 12) if months else None
            db.add(Goal(user_id=user_id, name=name, target_amount=target, current_amount=saved,
                        deadline=deadline, currency=CURRENCY))

        db.add(Mascot(user_id=user_id, companion_type="cat", companion_name="Miso", total_coins=24,
                      spent_coins=10, owned_beds=["default", "blue_cushion"], active_bed="blue_cushion"))
        db.commit()
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", default="demo@pawpurse.app")
    args = parser.parse_args()
    password = os.getenv("DEMO_PASSWORD")
    if not password or len(password) < 8:
        sys.exit("Set DEMO_PASSWORD (8+ characters) in the environment.")
    user_id = find_or_create_user(args.email, password)
    seed(user_id)
    print(f"Seeded demo account {args.email} (user id {user_id}).")
    print(f"Set DEMO_USER_ID={user_id} on the backend to protect it from deletion.")


if __name__ == "__main__":
    main()

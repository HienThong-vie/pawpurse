from datetime import datetime, timedelta, timezone
from core.database import SessionLocal
from models.transaction import Transaction

INTERVALS = {
    "daily": timedelta(days=1),
    "weekly": timedelta(days=7),
    "monthly": timedelta(days=30),
}


def process_recurring_transactions():
    """Clone due recurring transactions. Runs as a background task with its own
    session so it never shares (or commits) the request's session state."""
    db = SessionLocal()
    try:
        recurring_transactions = db.query(Transaction).filter(Transaction.is_recurring == True).all()  # noqa: E712
        today = datetime.now(timezone.utc)
        for transaction in recurring_transactions:
            interval = INTERVALS.get(transaction.recurring_interval)
            if interval is None:
                continue
            last_triggered = transaction.last_triggered or transaction.date
            if last_triggered is None:
                continue
            # Normalize naive datetimes (legacy rows stored without tz) to UTC
            if last_triggered.tzinfo is None:
                last_triggered = last_triggered.replace(tzinfo=timezone.utc)

            if today >= last_triggered + interval:
                db.add(Transaction(
                    user_id=transaction.user_id,
                    amount=transaction.amount,
                    type=transaction.type,
                    category=transaction.category,
                    note=transaction.note,
                    date=today,
                    is_recurring=False,
                    recurring_interval=None,
                    last_triggered=None,
                    currency=transaction.currency,
                ))
                transaction.last_triggered = today
        db.commit()
    finally:
        db.close()

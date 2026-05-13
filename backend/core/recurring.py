from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from models.transaction import Transaction
from datetime import datetime, timedelta, timezone

def process_recurring_transactions(db: Session = Depends(get_db)):
    recurring_trannsactions =  db.query(Transaction).filter(Transaction.is_recurring == True).all()

    for transaction in recurring_trannsactions:
        last_triggered = transaction.last_triggered or transaction.date
        # Normalize naive datetimes (legacy rows stored without tz) to UTC
        if last_triggered is not None and last_triggered.tzinfo is None:
            last_triggered = last_triggered.replace(tzinfo=timezone.utc)

        if (transaction.recurring_interval == "daily"):
            next_trigger = last_triggered + timedelta(days=1)
        elif (transaction.recurring_interval == "weekly"):
            next_trigger = last_triggered + timedelta(days=7)
        elif (transaction.recurring_interval == "monthly"):
            next_trigger = last_triggered + timedelta(days=30)
        else:
            continue

        today = datetime.now(timezone.utc)
        if (today >= next_trigger):
            new_transaction = Transaction (
                user_id = transaction.user_id,
                amount=transaction.amount,
                type = transaction.type,
                category  = transaction.category,
                note = transaction.note,
                date = datetime.now(timezone.utc),
                is_recurring=False,
                recurring_interval =None,
                last_triggered=None,
                currency = transaction.currency
            )
            db.add(new_transaction)
            transaction.last_triggered = today
            db.commit()


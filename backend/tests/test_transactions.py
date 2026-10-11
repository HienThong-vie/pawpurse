from datetime import datetime, timedelta, timezone

from models.transaction import Transaction
from tests.conftest import auth


def test_listing_converts_for_display_without_changing_stored_amounts(client, db):
    """Regression: GET used to mutate ORM rows in place, and the recurring-job
    background task then committed the converted amounts to the database."""
    h = auth("alice")
    client.post("/transactions/", json={"amount": 100, "type": "expense", "category": "food", "currency": "EUR"}, headers=h)
    # A due recurring transaction makes the background job commit.
    old = (datetime.now(timezone.utc) - timedelta(days=40)).isoformat()
    client.post("/transactions/", json={"amount": 5, "type": "expense", "category": "music", "currency": "USD",
                                        "is_recurring": True, "recurring_interval": "monthly", "date": old}, headers=h)

    listed = client.get("/transactions/?base_currency=USD", headers=h).json()
    eur = next(t for t in listed if t["currency"] == "EUR")
    assert eur["amount"] == 200  # 100 EUR at 0.5 EUR/USD

    db.expire_all()
    stored = db.query(Transaction).filter(Transaction.currency == "EUR").one()
    assert stored.amount == 100


def test_due_recurring_transaction_is_cloned_once(client, db):
    h = auth("alice")
    old = (datetime.now(timezone.utc) - timedelta(days=8)).isoformat()
    client.post("/transactions/", json={"amount": 9, "type": "expense", "category": "gym",
                                        "is_recurring": True, "recurring_interval": "weekly", "date": old}, headers=h)
    client.get("/transactions/", headers=h)
    client.get("/transactions/", headers=h)
    db.expire_all()
    assert db.query(Transaction).filter(Transaction.category == "gym").count() == 2


def test_non_recurring_transaction_drops_interval(client):
    r = client.post("/transactions/", json={"amount": 1, "type": "income", "category": "x",
                                            "is_recurring": False, "recurring_interval": "weekly"}, headers=auth("alice"))
    assert r.json()["recurring_interval"] is None

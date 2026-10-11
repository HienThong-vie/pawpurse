from datetime import date, datetime, time, timedelta, timezone

from core.periods import period_bounds, previous_period_bounds
from models.budget import Budget
from models.coin_reward import CoinReward
from models.mascot import Mascot
from models.transaction import Transaction
from tests.conftest import auth


def _setup(db, limit=100.0, spent=0.0):
    db.add(Mascot(user_id="alice", companion_type="cat", companion_name="Miso"))
    budget = Budget(user_id="alice", category="food", limit=limit, period="month", currency="USD")
    db.add(budget)
    db.commit()
    prev_start, _ = previous_period_bounds("month", date.today())
    if spent:
        db.add(Transaction(user_id="alice", amount=spent, type="expense", category="food", currency="USD",
                           date=datetime.combine(prev_start, time(12), tzinfo=timezone.utc)))
    # Pretend the budget was already observed during the previous period.
    db.add(CoinReward(user_id="alice", budget_id=budget.id, period_start=prev_start, coins=0))
    db.commit()


def _coins(db):
    db.expire_all()
    return db.query(Mascot).filter(Mascot.user_id == "alice").one().total_coins


def test_reward_is_computed_server_side_and_only_once(client, db):
    _setup(db, limit=100, spent=40)  # saved 60% -> 6 coins
    r = client.post("/mascot/rewards/budgets", headers=auth("alice"))
    assert r.status_code == 200 and r.json()["coins_awarded"] == 6
    assert client.post("/mascot/rewards/budgets", headers=auth("alice")).json()["coins_awarded"] == 0
    assert _coins(db) == 6


def test_overspent_budget_earns_nothing(client, db):
    _setup(db, limit=100, spent=150)
    assert client.post("/mascot/rewards/budgets", headers=auth("alice")).json()["coins_awarded"] == 0


def test_first_sighting_records_baseline_without_reward(client, db):
    db.add(Mascot(user_id="alice", companion_type="cat", companion_name="Miso"))
    db.add(Budget(user_id="alice", category="food", limit=100, period="month", currency="USD"))
    db.commit()
    assert client.post("/mascot/rewards/budgets", headers=auth("alice")).json()["coins_awarded"] == 0
    assert db.query(CoinReward).count() == 1


def test_client_can_no_longer_set_coins(client, db):
    _setup(db)
    assert client.patch("/mascot/coins", json={"coins": 999999}, headers=auth("alice")).status_code in (404, 405)
    assert _coins(db) == 0


def test_period_bounds():
    assert period_bounds("month", date(2026, 12, 15)) == (date(2026, 12, 1), date(2027, 1, 1))
    assert period_bounds("weekly", date(2026, 10, 14)) == (date(2026, 10, 12), date(2026, 10, 19))
    assert previous_period_bounds("month", date(2026, 1, 10)) == (date(2025, 12, 1), date(2026, 1, 1))
    assert previous_period_bounds("day", date(2026, 3, 1)) == (date(2026, 2, 28), date(2026, 3, 1))
    assert period_bounds("daily", date(2026, 3, 1)) == (date(2026, 3, 1), date(2026, 3, 2))
    assert period_bounds("week", date(2026, 10, 12))[0] == date(2026, 10, 12) - timedelta(days=0)

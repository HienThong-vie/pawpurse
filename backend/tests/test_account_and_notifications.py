from unittest.mock import MagicMock

import routers.delete_account
from models.chat_session import ChatSession
from models.coin_reward import CoinReward
from models.mascot import Mascot
from models.notification import Notification
from models.transaction import Transaction
from tests.conftest import auth


def test_delete_account_removes_all_user_data(client, db, monkeypatch):
    admin = MagicMock()
    monkeypatch.setattr(routers.delete_account, "get_admin_client", lambda: admin)
    for user in ("alice", "bob"):
        db.add(Transaction(user_id=user, amount=1, type="expense", category="x"))
        db.add(Mascot(user_id=user, companion_type="cat", companion_name="Miso"))
        db.add(ChatSession(user_id=user, title="chat", messages=[]))
        db.add(CoinReward(user_id=user, budget_id=1, period_start=__import__("datetime").date(2026, 1, 1)))
    db.commit()

    assert client.delete("/account/", headers=auth("alice")).status_code == 200
    admin.auth.admin.delete_user.assert_called_once_with("alice")
    db.expire_all()
    for model in (Transaction, Mascot, ChatSession, CoinReward):
        assert db.query(model).filter(model.user_id == "alice").count() == 0, model.__name__
        assert db.query(model).filter(model.user_id == "bob").count() == 1, model.__name__


def test_clear_all_notifications_only_clears_own(client, db):
    for user in ("alice", "alice", "bob"):
        db.add(Notification(user_id=user, type="t", title="hi", body=""))
    db.commit()
    r = client.delete("/notifications/clear-all", headers=auth("alice"))
    assert r.status_code == 200 and r.json()["count"] == 2
    db.expire_all()
    assert db.query(Notification).filter(Notification.user_id == "bob").count() == 1


def test_demo_account_cannot_be_deleted(client, db, monkeypatch):
    admin = MagicMock()
    monkeypatch.setattr(routers.delete_account, "get_admin_client", lambda: admin)
    monkeypatch.setenv("DEMO_USER_ID", "demo")
    db.add(Transaction(user_id="demo", amount=1, type="expense", category="x"))
    db.commit()
    assert client.delete("/account/", headers=auth("demo")).status_code == 403
    admin.auth.admin.delete_user.assert_not_called()
    assert db.query(Transaction).filter(Transaction.user_id == "demo").count() == 1

"""Every resource is scoped to the user in the verified JWT — never the request body."""
from models.budget import Budget
from models.goal import Goal
from tests.conftest import auth

TX = {"amount": 10, "type": "expense", "category": "food", "currency": "USD"}


def test_create_ignores_user_id_in_body(client, db):
    for path, body in [
        ("/transactions/", TX),
        ("/budgets/", {"category": "food", "limit": 100, "period": "month"}),
        ("/goals/", {"name": "Trip", "target_amount": 500}),
        ("/categories/", {"name": "Food"}),
    ]:
        r = client.post(path, json={**body, "user_id": "victim"}, headers=auth("alice"))
        assert r.status_code == 200, (path, r.text)
        assert r.json()["user_id"] == "alice", path


def test_create_requires_auth(client):
    assert client.post("/transactions/", json=TX).status_code in (401, 403)
    assert client.post("/budgets/", json={"category": "x", "limit": 1, "period": "month"}).status_code in (401, 403)


def test_budget_upsert_cannot_overwrite_another_users_budget(client, db):
    client.post("/budgets/", json={"category": "rent", "limit": 1000, "period": "month"}, headers=auth("victim"))
    client.post("/budgets/", json={"category": "rent", "limit": 1, "period": "month", "user_id": "victim"}, headers=auth("mallory"))
    victim_budget = db.query(Budget).filter(Budget.user_id == "victim").one()
    assert victim_budget.limit == 1000


def test_users_cannot_see_or_modify_each_others_transactions(client):
    tx_id = client.post("/transactions/", json=TX, headers=auth("alice")).json()["id"]
    assert client.get("/transactions/", headers=auth("bob")).json() == []
    assert client.put(f"/transactions/{tx_id}", json={"amount": 1}, headers=auth("bob")).status_code == 404
    assert client.delete(f"/transactions/{tx_id}", headers=auth("bob")).status_code == 404
    assert len(client.get("/transactions/", headers=auth("alice")).json()) == 1


def test_goal_update_cannot_reassign_owner(client, db):
    goal_id = client.post("/goals/", json={"name": "Car", "target_amount": 100}, headers=auth("alice")).json()["id"]
    client.put(f"/goals/{goal_id}", json={"user_id": "bob", "name": "Car 2"}, headers=auth("alice"))
    goal = db.get(Goal, goal_id)
    assert goal.user_id == "alice" and goal.name == "Car 2"


def test_validation_rejects_bad_input(client):
    h = auth("alice")
    assert client.post("/transactions/", json={**TX, "amount": -5}, headers=h).status_code == 422
    assert client.post("/transactions/", json={**TX, "type": "gift"}, headers=h).status_code == 422
    assert client.post("/transactions/", json={**TX, "is_recurring": True, "recurring_interval": "Monthly"}, headers=h).status_code == 422
    assert client.post("/budgets/", json={"category": "x", "limit": 0, "period": "month"}, headers=h).status_code == 422
    assert client.post("/budgets/", json={"category": "x", "limit": 5, "period": "yearly"}, headers=h).status_code == 422
    assert client.post("/goals/", json={"name": "x", "target_amount": 10, "current_amount": -1}, headers=h).status_code == 422

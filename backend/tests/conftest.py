"""Test harness: in-memory SQLite, a locally generated ES256 key standing in for
Supabase's JWKS, and stubbed exchange rates — no network or Postgres needed."""
import os
import sys
import time

os.environ["DATABASE_URL"] = "sqlite://"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
from jose import jwk, jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import core.auth
import core.database
import core.recurring
from core.database import Base, get_db
from core.limiter import limiter
from main import app

KID = "test-key"
RATES = {"USD": 1.0, "EUR": 0.5, "VND": 25000.0}

_private_key = ec.generate_private_key(ec.SECP256R1())
PRIVATE_PEM = _private_key.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
).decode()
_public_pem = _private_key.public_key().public_bytes(
    serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
).decode()
PUBLIC_JWK = {**jwk.construct(_public_pem, "ES256").to_dict(), "kid": KID}


def make_token(sub, kid=KID, aud="authenticated", key=PRIVATE_PEM):
    claims = {"sub": sub, "aud": aud, "exp": int(time.time()) + 3600}
    return jwt.encode(claims, key, algorithm="ES256", headers={"kid": kid})


def auth(sub):
    return {"Authorization": f"Bearer {make_token(sub)}"}


@pytest.fixture
def session_factory(monkeypatch):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False)
    # The recurring-transactions job opens its own session.
    monkeypatch.setattr(core.recurring, "SessionLocal", factory)
    yield factory
    engine.dispose()


@pytest.fixture
def client(session_factory, monkeypatch):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    async def fake_rates(base="USD"):
        return RATES

    for module in ("routers.transactions", "routers.budgets", "routers.goals", "routers.mascot"):
        monkeypatch.setattr(f"{module}.get_exchange_rates", fake_rates)
    monkeypatch.setattr(core.auth, "jwks_cache", [PUBLIC_JWK])
    monkeypatch.setattr(core.auth, "_jwks_fetched_at", time.monotonic())
    app.dependency_overrides[get_db] = override_get_db
    limiter.reset()
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def db(session_factory):
    session = session_factory()
    yield session
    session.close()

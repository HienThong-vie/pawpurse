from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from tests.conftest import make_token


def test_missing_token_is_rejected(client):
    assert client.get("/transactions/").status_code in (401, 403)


def test_valid_token_is_accepted(client):
    r = client.get("/transactions/", headers={"Authorization": f"Bearer {make_token('alice')}"})
    assert r.status_code == 200


def test_wrong_audience_is_rejected(client):
    token = make_token("alice", aud="anon")
    assert client.get("/transactions/", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_token_signed_by_another_key_is_rejected(client):
    other = ec.generate_private_key(ec.SECP256R1()).private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    token = make_token("mallory", key=other)  # same kid, forged signature
    assert client.get("/transactions/", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_unknown_key_id_is_rejected(client):
    token = make_token("alice", kid="unknown")
    assert client.get("/transactions/", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_garbage_token_is_rejected(client):
    assert client.get("/transactions/", headers={"Authorization": "Bearer not-a-jwt"}).status_code == 401


def test_database_url_scheme_is_normalized():
    from core.database import normalize_database_url

    assert normalize_database_url("postgres://u:p@h/db") == "postgresql://u:p@h/db"
    assert normalize_database_url("postgresql://u:p@h/db") == "postgresql://u:p@h/db"
    assert normalize_database_url("sqlite://") == "sqlite://"

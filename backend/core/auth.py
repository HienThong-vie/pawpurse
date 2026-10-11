import os
import time
import httpx
from jose import JWTError, jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

jwks_cache = None
_jwks_fetched_at = 0.0
JWKS_REFRESH_COOLDOWN = 60  # seconds between refetches triggered by an unknown key id


async def fetch_jwks():
    global jwks_cache, _jwks_fetched_at

    jwks_url = os.getenv("SUPABASE_JWKS_URL")
    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        response.raise_for_status()

        jwks_cache = response.json()["keys"]
        _jwks_fetched_at = time.monotonic()


def _find_key(kid):
    return next((key for key in jwks_cache or [] if key["kid"] == kid), None)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    token = credentials.credentials

    if jwks_cache is None:
        raise HTTPException(status_code=503, detail="Auth service unavailable")

    try:
        kid = jwt.get_unverified_header(token).get("kid")
        matching_key = _find_key(kid)
        # Unknown kid: Supabase may have rotated its signing keys since startup.
        # Refetch (rate-limited so bogus tokens can't hammer the JWKS endpoint).
        if not matching_key and time.monotonic() - _jwks_fetched_at > JWKS_REFRESH_COOLDOWN:
            try:
                await fetch_jwks()
            except httpx.HTTPError:
                pass
            matching_key = _find_key(kid)
        if not matching_key:
            raise HTTPException(status_code=401, detail="Invalid token key")
        payload = jwt.decode(
            token,
            matching_key,
            algorithms=["ES256"],
            audience="authenticated"
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

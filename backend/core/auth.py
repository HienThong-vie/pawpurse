import os
import httpx 
from jose import JWTError, jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

jwks_cache = None

async def fetch_jwks():
    global jwks_cache

    jwks_url = os.getenv("SUPABASE_JWKS_URL")
    async with httpx.AsyncClient() as client:   
        response = await client.get(jwks_url)
        response.raise_for_status()

        jwks_cache = response.json()["keys"]

async def get_current_user(credentials:HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    token = credentials.credentials\

    if jwks_cache is None:
        raise HTTPException(status_code=503, detail="Auth service unavailable")
    
    try:
        header = jwt.get_unverified_header(token)
        kid = header["kid"]
        matching_key = next((key for key in jwks_cache if key["kid"] == kid), None)
        if not matching_key:
            raise HTTPException(
                status_code=401,
                detail="Invalid token key"
            )
        payload = jwt.decode(
            token,
            matching_key,
            algorithms=["ES256"],
            audience="authenticated"
        )
        return payload["sub"]
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

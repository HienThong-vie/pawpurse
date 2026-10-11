from jose import jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def rate_limit_key(request: Request) -> str:
    """Key authenticated requests by user id, everything else by client IP.

    Behind a reverse proxy every request can appear to come from the proxy's IP,
    which would put all users in one shared bucket. The token is only decoded
    (not verified) here: the endpoint itself still verifies it, so a forged
    `sub` gains nothing but a 401.
    """
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        try:
            sub = jwt.get_unverified_claims(auth[7:]).get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=rate_limit_key)

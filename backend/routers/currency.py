from fastapi import APIRouter, Request
from core.currency import get_exchange_rates
from core.limiter import limiter

router = APIRouter(
    prefix="/currency",
    tags=["currency"],
)
@router.get("/rates")
@limiter.limit("5/minute")
async def get_rates(request: Request,base: str = "USD"):
    rates = await get_exchange_rates(base)
    return {"base": base, "rates": rates}

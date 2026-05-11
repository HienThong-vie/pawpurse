from fastapi import APIRouter
from core.currency import get_exchange_rates

router = APIRouter(
    prefix="/currency",
    tags=["currency"],
)

@router.get("/rates")
async def get_rates(base: str = "USD"):
    rates = await get_exchange_rates(base)
    return {"base": base, "rates": rates}

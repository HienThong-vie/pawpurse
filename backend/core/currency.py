import httpx
import os
from datetime import datetime, timedelta, timezone

API_KEY = os.getenv("EXCHANGE_RATE_API_KEY")

# in_memory cache
_rates_cache = {
    "rates": {},
    "last_fetched": None
}

async def get_exchange_rates(base: str = "USD"):
    now = datetime.now(timezone.utc)

    if (
        _rates_cache["last_fetched"] and
        _rates_cache["rates"] and
        now - _rates_cache["last_fetched"] < timedelta(hours=1)
    ):
        return _rates_cache["rates"]
    
    async with httpx.AsyncClient() as client:
        response =  await client.get(
            f"https://v6.exchangerate-api.com/v6/{API_KEY}/latest/{base}"
        ) 
        data= response.json()
    
    #update cache
    _rates_cache["rates"] = data["conversion_rates"]
    _rates_cache["last_fetched"] = now

    return _rates_cache["rates"]    

def convert_amount(amount: float, from_currency: str, to_currency:str, rates: dict) -> float:
    if from_currency == to_currency:
        return amount
    return amount / rates[from_currency] * rates[to_currency]\
    
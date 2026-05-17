from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date

class BudgetCreate(BaseModel):
    user_id: str
    category: str
    limit: float
    period: str
    currency: str = "USD"

class BudgetUpdate(BaseModel):
    category: Optional[str] = None
    limit: Optional[float] = None
    period: Optional[str] = None
    currency: Optional[str] = None

class BudgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: str
    id: int
    category: str
    limit: float
    period: str
    currency: str = "USD"
    spent: Optional[float] = 0.0
    percentage: Optional[float] = 0.0
    status: str = "acceptable"
    period_start: Optional[date] = None
    period_end: Optional[date] = None

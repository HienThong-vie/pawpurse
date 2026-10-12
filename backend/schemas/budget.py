from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional
from datetime import date

# The UI sends day/week/month; the AI advisor and legacy rows use daily/weekly/monthly.
BudgetPeriod = Literal["day", "week", "month", "daily", "weekly", "monthly"]


# user_id is never accepted from the client — it comes from the verified JWT.
class BudgetCreate(BaseModel):
    category: str = Field(min_length=1, max_length=100)
    limit: float = Field(gt=0)
    period: BudgetPeriod
    currency: str = Field(default="USD", min_length=3, max_length=3)

class BudgetUpdate(BaseModel):
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    limit: Optional[float] = Field(default=None, gt=0)
    period: Optional[BudgetPeriod] = None
    currency: Optional[str] = Field(default=None, min_length=3, max_length=3)

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

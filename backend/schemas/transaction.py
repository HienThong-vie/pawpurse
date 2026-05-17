from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class TransactionCreate(BaseModel):
    user_id: str
    amount: float
    type: str
    category: str
    note: Optional[str] = None
    date: Optional[datetime] = None
    is_recurring: Optional[bool] = False
    recurring_interval : Optional[str] = None
    currency: Optional[str] = "USD"

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    type: Optional[str] = None
    category: Optional[str] = None
    note: Optional[str] = None
    date: Optional[datetime] = None
    is_recurring: Optional[bool] = False
    recurring_interval : Optional[str] = None
    currency: Optional[str] = "USD"

class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True) # this line help pydantic read SQLAlchemy objects

    id: int
    user_id: str
    amount: float
    type: str
    category: str
    note: Optional[str]
    date: datetime
    is_recurring: bool
    recurring_interval : Optional[str]
    currency: Optional[str] = "USD"
    created_at: Optional[datetime] = None
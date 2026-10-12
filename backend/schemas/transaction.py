from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional
from datetime import datetime

TransactionType = Literal["income", "expense"]
RecurringInterval = Literal["daily", "weekly", "monthly"]


# user_id is never accepted from the client — it comes from the verified JWT.
class TransactionCreate(BaseModel):
    amount: float = Field(gt=0)
    type: TransactionType
    category: str = Field(min_length=1, max_length=100)
    note: Optional[str] = Field(default=None, max_length=500)
    date: Optional[datetime] = None
    is_recurring: Optional[bool] = False
    recurring_interval: Optional[RecurringInterval] = None
    currency: Optional[str] = Field(default="USD", min_length=3, max_length=3)

class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    type: Optional[TransactionType] = None
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    note: Optional[str] = Field(default=None, max_length=500)
    date: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurring_interval: Optional[RecurringInterval] = None
    currency: Optional[str] = Field(default=None, min_length=3, max_length=3)

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

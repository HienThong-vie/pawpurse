from pydantic import BaseModel,ConfigDict
from typing import Optional
from datetime import datetime

class GoalCreate(BaseModel):
    user_id: str
    name: str
    target_amount: float
    current_amount: Optional[float] = 0.0
    deadline: Optional[datetime]
    currency: Optional[str] = "USD"

class GoalUpdate(BaseModel):
    user_id: Optional[str] = None
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[datetime] = None
    currency: Optional[str] = "USD"

class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    id: int
    name: str
    target_amount: float
    current_amount: Optional[float] = 0.0
    deadline: Optional[datetime]
    currency: Optional[str] = "USD"



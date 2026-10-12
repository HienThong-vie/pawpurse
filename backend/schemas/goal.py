from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


# user_id is never accepted from the client — it comes from the verified JWT.
class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    target_amount: float = Field(gt=0)
    current_amount: Optional[float] = Field(default=0.0, ge=0)
    deadline: Optional[datetime] = None
    currency: Optional[str] = Field(default="USD", min_length=3, max_length=3)

class GoalUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    target_amount: Optional[float] = Field(default=None, gt=0)
    current_amount: Optional[float] = Field(default=None, ge=0)
    deadline: Optional[datetime] = None
    currency: Optional[str] = Field(default=None, min_length=3, max_length=3)

class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    id: int
    name: str
    target_amount: float
    current_amount: Optional[float] = 0.0
    deadline: Optional[datetime]
    currency: Optional[str] = "USD"

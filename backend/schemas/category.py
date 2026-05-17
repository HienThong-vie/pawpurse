from pydantic import BaseModel,ConfigDict
from typing import Optional

class CategoryCreate(BaseModel):
    user_id: str
    name: str
    emoji: str = "💼"

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None

class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    name: str
    emoji: str = "💼"

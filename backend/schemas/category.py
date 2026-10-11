from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


# user_id is never accepted from the client — it comes from the verified JWT.
class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    emoji: str = Field(default="💼", max_length=16)

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    emoji: Optional[str] = Field(default=None, max_length=16)

class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    name: str
    emoji: str = "💼"

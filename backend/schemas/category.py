from pydantic import BaseModel,ConfigDict
from typing import Optional

class CategoryCreate(BaseModel):
    user_id: str
    name: str

class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    name: str

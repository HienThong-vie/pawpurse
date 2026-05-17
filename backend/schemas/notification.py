from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime


class NotificationCreate(BaseModel):
    type: str
    title: str
    body: Optional[str] = ""
    data: Optional[Dict[str, Any]] = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: str
    type: str
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None
    is_read: bool
    created_at: datetime

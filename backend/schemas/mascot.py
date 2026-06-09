from pydantic import BaseModel, ConfigDict, computed_field, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class MascotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    companion_type: str
    companion_name: str
    total_coins: int
    spent_coins: int
    owned_beds: List[str]
    active_bed: str
    ai_uses_this_week: int = 0
    ai_week_start: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @computed_field
    @property
    def available_coins(self) -> int:
        return self.total_coins - self.spent_coins


class MascotCoinsUpdate(BaseModel):
    coins: int = Field(..., gt=0, description="Number of coins to add (must be > 0)")


class MascotBuyRequest(BaseModel):
    bed_id: str


class MascotEquipRequest(BaseModel):
    bed_id: str


class ShopBedResponse(BaseModel):
    id: str
    name: str
    cost: int
    emoji: str
    color: str
    owned: bool


class AdvisorUsageResponse(BaseModel):
    uses_this_week: int
    limit: int
    resets_at: datetime


class AdvisorChatMessage(BaseModel):
    role: str
    content: str


class AdvisorChatRequest(BaseModel):
    messages: List[AdvisorChatMessage]


class AdvisorChatResponse(BaseModel):
    message: str
    uses_this_week: int
    limit: int
    tool_results: Optional[List[Dict[str, Any]]] = None


# ── Chat session schemas ──────────────────────────────────────────────────

class ChatMessageSchema(BaseModel):
    id: str
    role: str
    content: str
    timestamp: datetime


class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    messages: List[Any]
    pinned: bool
    created_at: datetime
    updated_at: datetime


class CreateChatRequest(BaseModel):
    title: str = "New Chat"


class UpdateChatRequest(BaseModel):
    title: Optional[str] = None
    pinned: Optional[bool] = None
    messages: Optional[List[ChatMessageSchema]] = None

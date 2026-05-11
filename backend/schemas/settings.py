from pydantic import BaseModel, ConfigDict

class SettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: str
    base_currency: str

class SettingsUpdate(BaseModel):
    base_currency: str

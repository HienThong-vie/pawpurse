from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.UserSettings import UserSettings
from schemas.settings import SettingsResponse, SettingsUpdate
from core.database import get_db
from core.auth import get_current_user

router = APIRouter(
    prefix="/settings",
    tags=["settings"]
)

@router.get("/",response_model=SettingsResponse)
def get_settings(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(user_id = user_id,base_currency="USD")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("/", response_model=SettingsResponse)
def update_settings(data: SettingsUpdate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db) ):
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()

    if not settings:
        settings = UserSettings(user_id=user_id, base_currency=data.base_currency)
        db.add(settings)
    else:
        settings.base_currency = data.base_currency

    db.commit()
    db.refresh(settings)
    return settings


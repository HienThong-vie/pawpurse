from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from models.mascot import Mascot
from schemas.mascot import (
    MascotResponse,
    MascotCoinsUpdate,
    MascotBuyRequest,
    MascotEquipRequest,
    ShopBedResponse,
)
from core.database import get_db
from core.auth import get_current_user
from core.admin import get_admin_client


SHOP_BEDS = [
    {"id": "default", "name": "Simple Mat", "cost": 0, "emoji": "🟫", "color": "#8B6F47"},
    {"id": "blue_cushion", "name": "Blue Cushion", "cost": 10, "emoji": "🔵", "color": "#3B82F6"},
    {"id": "pink_pillow", "name": "Pink Pillow", "cost": 15, "emoji": "🩷", "color": "#EC4899"},
    {"id": "royal_bed", "name": "Royal Bed", "cost": 25, "emoji": "👑", "color": "#8B5CF6"},
    {"id": "space_pod", "name": "Space Pod", "cost": 30, "emoji": "🚀", "color": "#1E1B4B"},
    {"id": "nature_nest", "name": "Nature Nest", "cost": 20, "emoji": "🌿", "color": "#10B981"},
]


def _find_bed(bed_id: str):
    return next((b for b in SHOP_BEDS if b["id"] == bed_id), None)


router = APIRouter(
    prefix="/mascot",
    tags=["mascot"],
)


@router.get("/", response_model=MascotResponse)
def get_mascot(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mascot = db.query(Mascot).filter(Mascot.user_id == user_id).first()
    if mascot:
        return mascot

    # Lazy create on first read — pull companion details from Supabase metadata
    # that the setup wizard wrote during onboarding.
    try:
        admin = get_admin_client()
        result = admin.auth.admin.get_user_by_id(user_id)
        # supabase-py returns an object with .user; fall back to dict access.
        user_obj = getattr(result, "user", None) or result.get("user")  # type: ignore
        metadata = getattr(user_obj, "user_metadata", None) or {}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to read user metadata for mascot creation: {e}",
        )

    companion_type = metadata.get("companion") or metadata.get("companion_type")
    companion_name = metadata.get("companion_name")
    if not companion_type or not companion_name:
        raise HTTPException(
            status_code=400,
            detail="Companion not configured — complete the setup wizard first",
        )

    mascot = Mascot(
        user_id=user_id,
        companion_type=companion_type,
        companion_name=companion_name,
    )
    db.add(mascot)
    db.commit()
    db.refresh(mascot)
    return mascot


@router.patch("/coins", response_model=MascotResponse)
def add_coins(
    data: MascotCoinsUpdate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mascot = db.query(Mascot).filter(Mascot.user_id == user_id).first()
    if not mascot:
        raise HTTPException(status_code=404, detail="Mascot not found")
    mascot.total_coins += data.coins
    db.commit()
    db.refresh(mascot)
    return mascot


@router.post("/buy", response_model=MascotResponse)
def buy_bed(
    data: MascotBuyRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bed = _find_bed(data.bed_id)
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")

    mascot = db.query(Mascot).filter(Mascot.user_id == user_id).first()
    if not mascot:
        raise HTTPException(status_code=404, detail="Mascot not found")

    owned = list(mascot.owned_beds or [])
    if data.bed_id in owned:
        raise HTTPException(status_code=400, detail="Bed already owned")

    available = mascot.total_coins - mascot.spent_coins
    if available < bed["cost"]:
        raise HTTPException(status_code=400, detail="Not enough coins")

    owned.append(data.bed_id)
    # Reassign — SQLAlchemy JSON columns don't detect in-place list mutations.
    mascot.owned_beds = owned
    mascot.spent_coins += bed["cost"]
    db.commit()
    db.refresh(mascot)
    return mascot


@router.patch("/equip", response_model=MascotResponse)
def equip_bed(
    data: MascotEquipRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bed = _find_bed(data.bed_id)
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")

    mascot = db.query(Mascot).filter(Mascot.user_id == user_id).first()
    if not mascot:
        raise HTTPException(status_code=404, detail="Mascot not found")

    owned = list(mascot.owned_beds or [])
    if data.bed_id not in owned:
        raise HTTPException(status_code=400, detail="You don't own this bed")

    mascot.active_bed = data.bed_id
    db.commit()
    db.refresh(mascot)
    return mascot


@router.get("/shop", response_model=List[ShopBedResponse])
def list_shop(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mascot = db.query(Mascot).filter(Mascot.user_id == user_id).first()
    owned_set = set(mascot.owned_beds or ["default"]) if mascot else {"default"}
    return [
        ShopBedResponse(
            id=b["id"],
            name=b["name"],
            cost=b["cost"],
            emoji=b["emoji"],
            color=b["color"],
            owned=b["id"] in owned_set,
        )
        for b in SHOP_BEDS
    ]

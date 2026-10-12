import math
from datetime import date, datetime, time, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List
from models.mascot import Mascot
from models.budget import Budget
from models.transaction import Transaction
from models.coin_reward import CoinReward
from core.periods import period_bounds, previous_period_bounds
from core.currency import get_exchange_rates, convert_amount
from schemas.mascot import (
    MascotResponse,
    BudgetReward,
    BudgetRewardsResponse,
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
    {"id": "space_pod", "name": "Space Pod", "cost": 20, "emoji": "🚀", "color": "#1E1B4B"},
    {"id": "nature_nest", "name": "Nature Nest", "cost": 30, "emoji": "🌿", "color": "#10B981"},
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
    except Exception:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Unable to read user metadata for mascot creation",
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


@router.post("/rewards/budgets", response_model=BudgetRewardsResponse)
async def claim_budget_rewards(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Award coins for money saved under each budget in its previous period.

    Coins are computed entirely server-side. Each budget is evaluated at most once
    per period; the first time a budget is seen only a baseline row is recorded,
    so a budget created mid-period can't be rewarded for a period it didn't cover.
    Full budget left unspent = 10 coins, scaling down linearly.
    """
    mascot = db.query(Mascot).filter(Mascot.user_id == user_id).first()
    if not mascot:
        return BudgetRewardsResponse(coins_awarded=0, rewards=[])

    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
    today = date.today()
    rates = None
    rewards: List[BudgetReward] = []

    for budget in budgets:
        current_start, _ = period_bounds(budget.period, today)
        evaluated = db.query(CoinReward).filter(
            CoinReward.user_id == user_id, CoinReward.budget_id == budget.id
        )
        if evaluated.filter(CoinReward.period_start == current_start).first():
            continue  # already evaluated this period

        coins = 0
        if evaluated.first():  # seen in an earlier period, so the previous period is real
            prev_start, prev_end = previous_period_bounds(budget.period, today)
            transactions = db.query(Transaction).filter(
                Transaction.user_id == user_id,
                Transaction.category == budget.category,
                Transaction.type == "expense",
                Transaction.date >= datetime.combine(prev_start, time.min, tzinfo=timezone.utc),
                Transaction.date < datetime.combine(prev_end, time.min, tzinfo=timezone.utc),
            ).all()
            spent = 0.0
            for t in transactions:
                from_currency = t.currency or "USD"
                if from_currency == budget.currency:
                    spent += t.amount
                else:
                    rates = rates or await get_exchange_rates()
                    spent += convert_amount(t.amount, from_currency, budget.currency, rates)
            saved = budget.limit - spent
            if budget.limit > 0 and saved > 0:
                coins = math.floor(saved / budget.limit * 10)

        db.add(CoinReward(
            user_id=user_id, budget_id=budget.id, period_start=current_start, coins=coins
        ))
        try:
            db.flush()
        except IntegrityError:
            # A concurrent request already evaluated this budget/period.
            db.rollback()
            continue
        if coins > 0:
            # Atomic increment — avoids lost updates between concurrent requests.
            db.query(Mascot).filter(Mascot.id == mascot.id).update(
                {Mascot.total_coins: Mascot.total_coins + coins}, synchronize_session=False
            )
            rewards.append(BudgetReward(budget_id=budget.id, category=budget.category, coins=coins))
        db.commit()

    return BudgetRewardsResponse(
        coins_awarded=sum(r.coins for r in rewards), rewards=rewards
    )


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

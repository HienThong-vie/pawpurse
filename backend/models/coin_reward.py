from sqlalchemy import Column, Integer, String, Date, DateTime, UniqueConstraint
from core.database import Base
from datetime import datetime, timezone


class CoinReward(Base):
    """One row per (budget, period) the server has evaluated for a savings reward.
    The unique constraint makes awarding idempotent even under concurrent requests."""
    __tablename__ = "coin_rewards"
    __table_args__ = (UniqueConstraint("user_id", "budget_id", "period_start"),)
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    budget_id = Column(Integer, nullable=False)
    # Start of the period during which the evaluation happened; the reward covers
    # the period immediately before it.
    period_start = Column(Date, nullable=False)
    coins = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

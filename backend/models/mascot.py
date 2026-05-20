from sqlalchemy import Column, Integer, String, DateTime, JSON
from core.database import Base
from datetime import datetime, timezone


class Mascot(Base):
    __tablename__ = "mascots"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True, unique=True)
    companion_type = Column(String, nullable=False)
    companion_name = Column(String, nullable=False)
    total_coins = Column(Integer, nullable=False, default=0)
    spent_coins = Column(Integer, nullable=False, default=0)
    owned_beds = Column(JSON, nullable=False, default=lambda: ["default"])
    active_bed = Column(String, nullable=False, default="default")
    # AI advisor weekly usage tracking lives on the mascot row to avoid a second
    # one-row-per-user table — usage is reset lazily when current date exceeds
    # ai_week_start + 7 days.
    ai_uses_this_week = Column(Integer, nullable=False, default=0)
    ai_week_start = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

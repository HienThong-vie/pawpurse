from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from core.database import Base
from datetime import datetime, timezone


class Notification(Base):
    __tablename__ = "notification"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    body = Column(String, nullable=False, default="")
    data = Column(JSON, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from core.database import Base
from datetime import datetime, timezone

class Transaction(Base):
    __tablename__ = "transaction"
    id = Column(Integer,primary_key=True,autoincrement=True)
    user_id  = Column(String, nullable = False, index =  True)  #get auth user id from supabase
    amount = Column(Float,nullable = False)
    type = Column(String, nullable = False)
    category = Column(String, nullable = False)
    note =  Column(String, nullable = True) #optional note
    date = Column(DateTime(timezone=True), nullable = True, default = lambda: datetime.now(timezone.utc))
    is_recurring = Column(Boolean, default=False)
    recurring_interval = Column(String, nullable=True)
    last_triggered = Column(DateTime, nullable = True)
    currency = Column(String, default="USD")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
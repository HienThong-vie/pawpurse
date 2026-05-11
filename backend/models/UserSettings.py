from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from core.database import Base
from datetime import datetime

class UserSettings(Base):
    __tablename__ = "UserSettings"
    id = Column(Integer,primary_key=True,autoincrement=True)
    user_id  = Column(String, nullable = False, index =  True)
    base_currency = Column(String,nullable = False, default = "USD")


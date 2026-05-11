from sqlalchemy import Column, Integer, String, Float, DateTime
from core.database import Base

class Goal(Base):
    __tablename__ = "goal"
    id = Column(Integer, primary_key = True,autoincrement = True)
    user_id = Column(String,nullable= False, index = True)
    name =  Column(String,nullable = False)
    target_amount = Column(Float, nullable = False)
    current_amount =  Column(Float, default=0.0)
    deadline = Column(DateTime,nullable=True)
    currency = Column(String, default="USD")
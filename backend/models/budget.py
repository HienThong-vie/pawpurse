from sqlalchemy import Column, Integer, String, Float
from core.database import Base

class Budget(Base):
    __tablename__ = "budget"
    id = Column(Integer, primary_key =True, autoincrement = True)
    user_id  =  Column(String,nullable = False, index = True)
    category = Column(String,nullable = False)
    limit =  Column(Float, nullable = False)
    period =  Column(String,nullable =  False)
    currency = Column(String, nullable=False, default="USD")

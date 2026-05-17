from sqlalchemy import Column, Integer, String
from core.database import Base

class Category(Base):
    __tablename__ = "category"
    id = Column(Integer, primary_key = True,autoincrement = True)
    user_id = Column(String,nullable= False, index = True)
    name =  Column(String,nullable = False)
    emoji = Column(String, nullable=False, server_default="💼")

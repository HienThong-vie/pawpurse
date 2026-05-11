from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import (
    sessionmaker,
    declarative_base
)
import os

load_dotenv()

database_url = os.getenv("DATABASE_URL")
engine = create_engine(database_url) #turn the url string into a working connection system
SessionLocal = sessionmaker(autocommit = False, autoflush=False, bind=engine)
Base = declarative_base() #this will be the default class for future database models inherit from

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

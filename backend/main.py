import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import (
    Base,
    engine,
)
from routers import transactions,budgets,categories,goals,settings,export,currency,notifications,delete_account,mascot,advisor
from core.auth import fetch_jwks
from core.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

frontend_url = os.getenv(" FRONTEND_URL")
app = FastAPI()
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    frontend_url
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, #allow frontend url
    allow_credentials=True, #allow cookies/auth
    allow_methods=["*"], #allow all HTTP methods (GET,POST,ect)
    allow_headers=["*"], #allow all headers
)
@app.on_event("startup")
async def startup_event():
    await fetch_jwks()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(categories.router)
app.include_router(goals.router)
app.include_router(settings.router)
app.include_router(export.router)
app.include_router(currency.router)
app.include_router(notifications.router)
app.include_router(delete_account.router)
app.include_router(mascot.router)
app.include_router(advisor.router)
Base.metadata.create_all(bind=engine) #create all database tables on startup
@app.get("/") #when frontend send GET request to backend then the function below will be executed automatically
def get_message():
    return {"message": "Paw Purse API is running"}
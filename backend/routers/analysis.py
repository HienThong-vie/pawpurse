from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import timezone
from core.algorithms import analyze_budgets,get_spending_by_category
from models.transaction import Transaction
from models.budget import Budget
from schemas.analysis import AnalysisResponse
from core.database import get_db
from core.currency import get_exchange_rates, convert_amount
from core.auth import get_current_user

router = APIRouter (
    prefix="/analysis",
    tags=["analysis"]
)

def to_dict(obj):
    return {k: v for k,v in obj.__dict__.items() if k !='_sa_instance_state'}

@router.get("/",response_model=AnalysisResponse)
async def algorithms(response: Response, user_id: str = Depends(get_current_user), base_currency: str = "USD", db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "max-age=60"
    filtered_transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    filtered_budgets  = db.query(Budget).filter(Budget.user_id == user_id).all()
    # Normalize legacy naive datetimes to UTC
    for t in filtered_transactions:
        if t.date and t.date.tzinfo is None:
            t.date = t.date.replace(tzinfo=timezone.utc)
    #covert from sql object to plaint dict
    transactions =  [to_dict(t) for t in filtered_transactions]
    budgets = [to_dict(b) for b in filtered_budgets]

    rates  = await get_exchange_rates(base_currency)
    for transaction in transactions:
        transaction["amount"] = convert_amount(
            transaction["amount"],
            transaction.get("currency") or "USD",
            base_currency,
            rates
        )
    # Convert budget limits to base_currency so analyze_budgets compares like-for-like
    for b in budgets:
        b["limit"] = convert_amount(
            b["limit"],
            b.get("currency") or "USD",
            base_currency,
            rates,
        )
    spending_by_category = get_spending_by_category(transactions,budgets)
    budget_analysis = analyze_budgets(transactions,budgets)

    return AnalysisResponse(
        spending_by_category = spending_by_category,
        budget_analysis = budget_analysis,
    )
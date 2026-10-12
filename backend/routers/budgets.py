from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.budget import Budget
from models.transaction import Transaction
from schemas.budget import BudgetCreate,BudgetResponse,BudgetUpdate
from core.database import get_db
from typing import List
from datetime import date,time,datetime,timezone
from core.periods import period_bounds
from core.currency import get_exchange_rates,convert_amount
from core.auth import get_current_user
router = APIRouter (
    prefix="/budgets",
    tags=["budgets"]
)


@router.post("/",response_model=BudgetResponse)
def create_budget(data: BudgetCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    filtered_budget = db.query(Budget).filter(Budget.user_id == user_id, Budget.category == data.category).first()
    if filtered_budget:
        for field,value in data.model_dump(exclude_unset=True).items():
            setattr(filtered_budget,field,value)
        db.commit()
        db.refresh(filtered_budget)
        return filtered_budget
    else:
        new_budget = Budget(**data.model_dump(), user_id=user_id)
        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)
        return new_budget
    
@router.get("/",response_model=List[BudgetResponse])
async def get_budget(user_id: str = Depends(get_current_user), base_currency: str = "USD", db: Session = Depends(get_db)):
    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
    rates  = await get_exchange_rates(base_currency)
    result = []  
    for budget in budgets:
        period_start, period_end = period_bounds(budget.period, date.today())
        period_start_dt = datetime.combine(period_start, time.min, tzinfo=timezone.utc)
        period_end_dt = datetime.combine(period_end, time.min, tzinfo=timezone.utc)
        transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.category == budget.category,
            Transaction.type == "expense",
            Transaction.date >= period_start_dt,
            Transaction.date < period_end_dt,
        ).all()
        # Normalize legacy naive datetimes to UTC
        for t in transactions:
            if t.date and t.date.tzinfo is None:
                t.date = t.date.replace(tzinfo=timezone.utc)
        def _convert(amount, from_cur):
            from_cur = from_cur or "USD"
            if from_cur == base_currency:
                return amount
            return convert_amount(amount, from_cur, base_currency, rates)

        spent = sum(_convert(t.amount, t.currency) for t in transactions)
        limit = _convert(budget.limit, budget.currency)
        percentage = (spent / limit) * 100 if limit > 0 else 0.0
        if percentage < 60:
            status = "acceptable"
        elif percentage < 80:
            status = "caution"
        elif percentage < 100:
            status = "warning"
        else:
            status = "exceeded"
        result.append(BudgetResponse(
        id = budget.id,
        user_id = budget.user_id,
        category = budget.category,
        limit = limit,
        period = budget.period,
        currency= base_currency,
        status = status,
        spent = spent,
        percentage = percentage,
        period_start = period_start,
        period_end = period_end,
        ))
    return result

@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(budget_id: int, data: BudgetUpdate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db) ):
    filtered_budgets = db.query(Budget).filter(Budget.user_id == user_id, Budget.id == budget_id).first()
    if not filtered_budgets:
        raise HTTPException(status_code=404, detail="Budget not found")
    for field,value in data.model_dump(exclude_unset=True).items(): # transform pydantic onbject into readable python dictionary 
        setattr(filtered_budgets,field,value) # set attribute for field and value inside transaction object 
    db.commit()
    db.refresh(filtered_budgets)
    return filtered_budgets

@router.delete("/all")
def delete_all_budgets(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    deleted = db.query(Budget).filter(Budget.user_id == user_id).delete(synchronize_session=False)
    db.commit()
    return {"Message": "All budgets deleted", "count": deleted}


@router.delete("/{budget_id}")
def delete_budget(budget_id: int, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    filtered_budget = db.query(Budget).filter(Budget.user_id == user_id,Budget.id == budget_id).first()
    if not filtered_budget:
        raise HTTPException(status_code = 404, detail="Budget not found")
    db.delete(filtered_budget)
    db.commit()
    return {"Message":"Budgets deleted"}



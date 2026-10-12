from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks,Request
from sqlalchemy.orm import Session
from models.transaction import Transaction
from schemas.transaction import TransactionCreate,TransactionResponse,TransactionUpdate
from core.database import get_db
from typing import List
from datetime import timezone
from core.recurring import process_recurring_transactions
from core.currency import get_exchange_rates,convert_amount
from core.auth import get_current_user
from core.limiter import limiter

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"]
)

@router.post("/",response_model=TransactionResponse)
@limiter.limit("30/minute")
# : means the type of variable should be, in this case data should be TransactionCreate type
def create_transaction(request:Request,data: TransactionCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    new_transaction = Transaction(**data.model_dump(), user_id=user_id) #models dump means convert pydantic schema into a plain dictionary, ** unpacks it as keyword arguments
    if not new_transaction.is_recurring:
        new_transaction.recurring_interval = None
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction

@router.get("/",response_model=List[TransactionResponse])
async def get_transactions(background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user), base_currency: str = "USD", sort: str = "newest", db: Session = Depends(get_db)):
    order = Transaction.created_at.asc() if sort == "oldest" else Transaction.created_at.desc()
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(order).all()
    rates  = await get_exchange_rates(base_currency)
    result = []
    # Build response objects instead of mutating the ORM rows, so display-only
    # currency conversion can never be flushed back to the database.
    for transaction in transactions:
        response = TransactionResponse.model_validate(transaction)
        # Normalize legacy naive datetimes to UTC so the frontend interprets them correctly
        if response.date.tzinfo is None:
            response.date = response.date.replace(tzinfo=timezone.utc)
        from_currency = transaction.currency or "USD"
        if from_currency != base_currency:
            response.amount = convert_amount(transaction.amount, from_currency, base_currency, rates)
        result.append(response)
    background_tasks.add_task(process_recurring_transactions)
    return result

@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(transaction_id: int, data: TransactionUpdate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db) ):
    filtered_transactions = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.id == transaction_id).first()
    if not filtered_transactions:
        raise HTTPException(status_code=404, detail="Transaction not found")
    #get only provided field
    for field,value in data.model_dump(exclude_unset=True).items(): # transform pydantic onbject into readable python dictionary 
        setattr(filtered_transactions,field,value) # set attribute for field and value inside transaction object 
    db.commit()
    db.refresh(filtered_transactions)
    return filtered_transactions


@router.delete("/all")
def delete_all_transactions(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    deleted = db.query(Transaction).filter(Transaction.user_id == user_id).delete(synchronize_session=False)
    db.commit()
    return {"Message": "All transactions deleted", "count": deleted}


@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    filtered_transaction = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.id == transaction_id).first()
    if not filtered_transaction:
        raise HTTPException(status_code = 404, detail="Transaction not found")
    db.delete(filtered_transaction)
    db.commit()
    return {"Message":"Transaction deleted"}
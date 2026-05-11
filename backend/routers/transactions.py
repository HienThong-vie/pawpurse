from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from models.transaction import Transaction
from schemas.transaction import TransactionCreate,TransactionResponse,TransactionUpdate
from core.database import get_db
from typing import List
from datetime import timezone
from core.recurring import process_recurring_transactions
from core.currency import get_exchange_rates,convert_amount
from core.auth import get_current_user


router = APIRouter(
    prefix="/transactions",
    tags=["transactions"]
)
@router.post("/",response_model=TransactionResponse) # reponse model means the return value
# : means the type of variable should be, in this case data should be TransactionCreate type
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    new_transaction = Transaction(**data.model_dump()) #models dump means convert pydantic schema into a plain dictionary, ** unpacks it as keyword arguments
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction

@router.get("/",response_model=List[TransactionResponse])
async def get_transactions(background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user), base_currency: str = "USD", sort: str = "newest", db: Session = Depends(get_db)):
    order = Transaction.created_at.asc() if sort == "oldest" else Transaction.created_at.desc()
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(order).all()
    # Normalize legacy naive datetimes to UTC so the frontend interprets them correctly
    for t in transactions:
        if t.date and t.date.tzinfo is None:
            t.date = t.date.replace(tzinfo=timezone.utc)
    rates  = await get_exchange_rates(base_currency)
    for transaction in transactions:
        from_currency = transaction.currency or "USD"
        if from_currency != base_currency:
            transaction.amount = convert_amount(
                transaction.amount,
                from_currency,
                base_currency,
                rates
            )
    background_tasks.add_task(process_recurring_transactions,db)
    return transactions
    
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


@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    filtered_transaction = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.id == transaction_id).first()
    if not filtered_transaction:
        raise HTTPException(status_code = 404, detail="Transaction not found")
    db.delete(filtered_transaction)
    db.commit()
    return {"Message":"Transaction deleted"}
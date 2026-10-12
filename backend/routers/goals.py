from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.goal import Goal
from schemas.goal import GoalCreate,GoalResponse,GoalUpdate
from core.database import get_db
from core.currency import get_exchange_rates, convert_amount
from core.auth import get_current_user
from typing import List

router = APIRouter(
    prefix="/goals",
    tags=["goals"]
)
@router.post("/",response_model=GoalResponse)
def create_goal(data:GoalCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    new_goal = Goal(**data.model_dump(), user_id=user_id)
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal

@router.get("/",response_model=List[GoalResponse])
async def get_goals(user_id: str = Depends(get_current_user), base_currency: str = "USD", db: Session = Depends(get_db)):
    goals = db.query(Goal).filter(Goal.user_id == user_id).all()
    rates = await get_exchange_rates(base_currency)
    result = []
    for goal in goals:
        from_currency = goal.currency or "USD"
        # Convert for display only — do NOT mutate the ORM object
        if from_currency == base_currency:
            converted_target = goal.target_amount
            converted_current = goal.current_amount or 0.0
        else:
            converted_target = convert_amount(
                goal.target_amount, from_currency, base_currency, rates
            )
            converted_current = convert_amount(
                goal.current_amount or 0.0, from_currency, base_currency, rates
            )
        result.append(GoalResponse(
            id=goal.id,
            user_id=goal.user_id,
            name=goal.name,
            target_amount=converted_target,
            current_amount=converted_current,
            deadline=goal.deadline,
            currency=goal.currency,
        ))
    return result
    
@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(goal_id: int, data: GoalUpdate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db) ):
    filtered_goals = db.query(Goal).filter(Goal.user_id == user_id, Goal.id == goal_id).first()
    if not filtered_goals:
        raise HTTPException(status_code=404, detail="Goals not found")
    for field,value in data.model_dump(exclude_unset=True).items(): 
        setattr(filtered_goals,field,value) 
    db.commit()
    db.refresh(filtered_goals)
    return filtered_goals


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    filtered_goal = db.query(Goal).filter(Goal.user_id == user_id, Goal.id == goal_id).first()
    if not filtered_goal:
        raise HTTPException(status_code = 404, detail="Goal not found")
    db.delete(filtered_goal)
    db.commit()
    return {"Message":"Goal deleted"}
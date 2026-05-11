from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.category import Category
from schemas.category import CategoryCreate,CategoryResponse
from core.database import get_db
from typing import List
from core.auth import get_current_user

router = APIRouter (
    prefix="/categories",
    tags=["categories"]
)

@router.post("/",response_model=CategoryResponse)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    name = data.name.lower()
    existed_category = db.query(Category).filter(Category.name == name, Category.user_id == data.user_id).first()
    if existed_category:
        return existed_category
    else:
        new_category = Category(**data.model_dump())
        db.add(new_category)
        db.commit()
        db.refresh(new_category)
        return new_category
@router.get("/",response_model=List[CategoryResponse])
def get_category(user_id: str = Depends(get_current_user),db:Session=Depends(get_db)):
    categories = db.query(Category).filter(Category.user_id == user_id).all()
    return categories

@router.delete("/{category_id}")
def delete_transaction(id: int, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    filtered_category = db.query(Category).filter(Category.user_id == user_id,Category.id == id).first()
    if not filtered_category:
        raise HTTPException(status_code = 404, detail="Category not found")
    db.delete(filtered_category)
    db.commit()
    return {"Message":"Category deleted"}
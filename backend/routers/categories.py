from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.category import Category
from schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from core.database import get_db
from typing import List
from core.auth import get_current_user

router = APIRouter (
    prefix="/categories",
    tags=["categories"]
)

@router.post("/",response_model=CategoryResponse)
def create_category(data: CategoryCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    name = data.name.lower()
    existed_category = db.query(Category).filter(Category.name == name, Category.user_id == user_id).first()
    if existed_category:
        # If client supplied a non-default emoji, update it on the existing row.
        if data.emoji and data.emoji != "💼" and existed_category.emoji != data.emoji:
            existed_category.emoji = data.emoji
            db.commit()
            db.refresh(existed_category)
        return existed_category
    else:
        new_category = Category(
            user_id=user_id,
            name=name,
            emoji=data.emoji or "💼",
        )
        db.add(new_category)
        db.commit()
        db.refresh(new_category)
        return new_category

@router.get("/",response_model=List[CategoryResponse])
def get_category(user_id: str = Depends(get_current_user),db:Session=Depends(get_db)):
    categories = db.query(Category).filter(Category.user_id == user_id).all()
    return categories

@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, data: CategoryUpdate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    filtered_category = db.query(Category).filter(Category.user_id == user_id, Category.id == category_id).first()
    if not filtered_category:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(filtered_category, field, value)
    db.commit()
    db.refresh(filtered_category)
    return filtered_category

@router.delete("/{category_id}")
def delete_category(category_id: int, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    filtered_category = db.query(Category).filter(Category.user_id == user_id, Category.id == category_id).first()
    if not filtered_category:
        raise HTTPException(status_code = 404, detail="Category not found")
    db.delete(filtered_category)
    db.commit()
    return {"Message":"Category deleted"}

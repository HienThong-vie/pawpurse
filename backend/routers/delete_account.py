from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.auth import get_current_user
from core.admin import get_admin_client
from models.transaction import Transaction
from models.budget import Budget
from models.category import Category
from models.goal import Goal
from models.UserSettings import UserSettings
from models.notification import Notification
from models.mascot import Mascot
from models.chat_session import ChatSession
from models.coin_reward import CoinReward

router = APIRouter(
    prefix="/account",
    tags=["account"],
)

@router.delete("/")
def delete_account(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Wipe all user-owned rows. Bulk-delete with synchronize_session=False
        # because we don't need the in-memory session to track the deletes.
        for model in (
            Transaction,
            Budget,
            Category,
            Goal,
            UserSettings,
            Notification,
            Mascot,
            ChatSession,
            CoinReward,
        ):
            db.query(model).filter(model.user_id == user_id).delete(
                synchronize_session=False
            )
        db.commit()
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to delete account data")

    try:
        admin_client = get_admin_client()
        admin_client.auth.admin.delete_user(user_id)
    except Exception:
        # Data is already gone; surface the auth-delete failure so the caller
        # knows the supabase account still exists.
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Data deleted but failed to remove auth account",
        )
    
    return {"message": "Account deleted successfully"}

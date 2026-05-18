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

router = APIRouter(
    prefix="/account",
    tags=["account"],
)

@router.delete("/")
def delete_account(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    print(f"Deleting account for user: {user_id}")
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
        ):
            db.query(model).filter(model.user_id == user_id).delete(
                synchronize_session=False
            )
        db.commit()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Delete account error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    try:
        admin_client = get_admin_client()
        admin_client.auth.admin.delete_user(user_id)
    except Exception as e:
        # Data is already gone; surface the auth-delete failure so the caller
        # knows the supabase account still exists.
        raise HTTPException(
            status_code=500,
            detail=f"Data deleted but failed to remove auth account: {e}",
        )
    
    return {"message": "Account deleted successfully"}

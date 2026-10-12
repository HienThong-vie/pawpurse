from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from models.notification import Notification
from schemas.notification import NotificationCreate, NotificationResponse
from core.database import get_db
from core.auth import get_current_user

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
)


@router.get("/", response_model=List[NotificationResponse])
def list_notifications(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.post("/", response_model=NotificationResponse)
def create_notification(
    data: NotificationCreate,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = Notification(
        user_id=user_id,
        type=data.type,
        title=data.title,
        body=data.body or "",
        data=data.data,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


@router.patch("/read-all")
def mark_all_read(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


# Declared before /{notification_id} so "clear-all" isn't parsed as an id.
@router.delete("/clear-all")
def clear_all(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"message": "All notifications deleted", "count": deleted}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted"}

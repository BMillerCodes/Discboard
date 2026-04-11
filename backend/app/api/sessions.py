from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from app.database import get_session
from app.models import Session, SessionCreate, SessionUpdate
from app.api.events import event_bus, EVENT_SESSION_CREATED, EVENT_SESSION_UPDATED, EVENT_SESSION_DELETED

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.get("", response_model=list[Session])
def list_sessions(
    status: str = None,
    limit: int = 50,
    session: Session = Depends(get_session)
):
    query = select(Session)
    if status:
        query = query.where(Session.status == status)
    query = query.order_by(Session.last_activity.desc()).limit(limit)
    return session.exec(query).all()

@router.post("", response_model=Session)
async def create_session(
    data: SessionCreate,
    session: Session = Depends(get_session)
):
    session_obj = Session(
        discord_channel_id=data.discord_channel_id,
        discord_thread_id=data.discord_thread_id,
        title=data.title or "New Session",
        model=data.model or "MiniMax-M2.7",
    )
    session.add(session_obj)
    session.commit()
    session.refresh(session_obj)

    # Broadcast session created event
    await event_bus.broadcast(
        EVENT_SESSION_CREATED,
        {"session": session_obj.model_dump(mode="json")}
    )

    return session_obj

@router.get("/{session_id}", response_model=Session)
def get_session_by_id(
    session_id: str,
    session: Session = Depends(get_session)
):
    s = session.get(Session, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s

@router.patch("/{session_id}", response_model=Session)
async def update_session(
    session_id: str,
    data: SessionUpdate,
    session: Session = Depends(get_session)
):
    s = session.get(Session, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(s, key, value)
    s.last_activity = datetime.utcnow()
    session.add(s)
    session.commit()
    session.refresh(s)

    # Broadcast session updated event
    await event_bus.broadcast(
        EVENT_SESSION_UPDATED,
        {"session": s.model_dump(mode="json")}
    )

    return s

@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    session: Session = Depends(get_session)
):
    s = session.get(Session, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")

    # Store session data for broadcast before deletion
    session_data = s.model_dump(mode="json")

    session.delete(s)
    session.commit()

    # Broadcast session deleted event
    await event_bus.broadcast(
        EVENT_SESSION_DELETED,
        {"session": session_data}
    )

    return {"ok": True}

@router.post("/{session_id}/activity")
def record_activity(
    session_id: str,
    session: Session = Depends(get_session)
):
    s = session.get(Session, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    s.last_activity = datetime.utcnow()
    s.message_count += 1
    session.add(s)
    session.commit()
    return {"ok": True, "message_count": s.message_count}
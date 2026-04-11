from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional
from app.database import get_session
from app.models import Bookmark, BookmarkCreate, BookmarkUpdate
from app.api.events import event_bus, EVENT_BOOKMARK_CREATED, EVENT_BOOKMARK_UPDATED, EVENT_BOOKMARK_DELETED

router = APIRouter(prefix="/api/bookmarks", tags=["bookmarks"])

@router.get("", response_model=list[Bookmark])
def list_bookmarks(
    tag: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    session: Session = Depends(get_session)
):
    query = select(Bookmark)
    if tag:
        query = query.where(Bookmark.tags.contains(tag))
    if search:
        query = query.where(
            (Bookmark.label.contains(search)) | 
            (Bookmark.url.contains(search)) |
            (Bookmark.description.contains(search))
        )
    query = query.order_by(Bookmark.created_at.desc()).limit(limit)
    return session.exec(query).all()

@router.post("", response_model=Bookmark)
async def create_bookmark(
    data: BookmarkCreate,
    session: Session = Depends(get_session)
):
    bookmark = Bookmark(
        url=data.url,
        label=data.label,
        description=data.description,
        tags=data.tags or [],
    )
    session.add(bookmark)
    session.commit()
    session.refresh(bookmark)

    # Broadcast bookmark created event
    await event_bus.broadcast(
        EVENT_BOOKMARK_CREATED,
        {"bookmark": bookmark.model_dump(mode="json")}
    )

    return bookmark

@router.get("/{bookmark_id}", response_model=Bookmark)
def get_bookmark(
    bookmark_id: str,
    session: Session = Depends(get_session)
):
    b = session.get(Bookmark, bookmark_id)
    if not b:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return b

@router.patch("/{bookmark_id}", response_model=Bookmark)
async def update_bookmark(
    bookmark_id: str,
    data: BookmarkUpdate,
    session: Session = Depends(get_session)
):
    b = session.get(Bookmark, bookmark_id)
    if not b:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(b, key, value)
    session.add(b)
    session.commit()
    session.refresh(b)

    # Broadcast bookmark updated event
    await event_bus.broadcast(
        EVENT_BOOKMARK_UPDATED,
        {"bookmark": b.model_dump(mode="json")}
    )

    return b

@router.delete("/{bookmark_id}")
async def delete_bookmark(
    bookmark_id: str,
    session: Session = Depends(get_session)
):
    b = session.get(Bookmark, bookmark_id)
    if not b:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    # Store bookmark data for broadcast before deletion
    bookmark_data = b.model_dump(mode="json")

    session.delete(b)
    session.commit()

    # Broadcast bookmark deleted event
    await event_bus.broadcast(
        EVENT_BOOKMARK_DELETED,
        {"bookmark": bookmark_data}
    )

    return {"ok": True}
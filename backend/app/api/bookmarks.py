from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Optional
from app.database import get_session
from app.models import Bookmark, BookmarkCreate, BookmarkUpdate

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
def create_bookmark(
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
def update_bookmark(
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
    return b

@router.delete("/{bookmark_id}")
def delete_bookmark(
    bookmark_id: str,
    session: Session = Depends(get_session)
):
    b = session.get(Bookmark, bookmark_id)
    if not b:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    session.delete(b)
    session.commit()
    return {"ok": True}
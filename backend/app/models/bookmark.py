import uuid
from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import JSON

class Bookmark(SQLModel, table=True):
    __tablename__ = "bookmarks"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    url: str = Field(index=True)
    label: str
    description: Optional[str] = None
    tags: list[str] = Field(default_factory=list, sa_type=JSON)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    extra_data: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)
    
    class Config:
        arbitrary_types_allowed = True

class BookmarkCreate(SQLModel):
    url: str
    label: str
    description: Optional[str] = None
    tags: Optional[list[str]] = []

class BookmarkUpdate(SQLModel):
    url: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    extra_data: Optional[dict] = None

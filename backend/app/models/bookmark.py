import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class Bookmark(SQLModel, table=True):
    __tablename__ = "bookmarks"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    url: str = Field(index=True)
    label: str
    description: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict = Field(default_factory=dict)
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {datetime: lambda v: v.isoformat()}

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
    metadata: Optional[dict] = None
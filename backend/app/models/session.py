import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum

class SessionStatus(str, Enum):
    ACTIVE = "active"
    IDLE = "idle"
    ARCHIVED = "archived"

class Session(SQLModel, table=True):
    __tablename__ = "sessions"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    discord_channel_id: str = Field(index=True)
    discord_thread_id: Optional[str] = Field(default=None, index=True)
    title: str = Field(default="New Session")
    status: SessionStatus = Field(default=SessionStatus.ACTIVE)
    model: str = Field(default="MiniMax-M2.7")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    message_count: int = Field(default=0)
    metadata: dict = Field(default_factory=dict)
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {datetime: lambda v: v.isoformat()}

class SessionCreate(SQLModel):
    discord_channel_id: str
    discord_thread_id: Optional[str] = None
    title: Optional[str] = "New Session"
    model: Optional[str] = "MiniMax-M2.7"

class SessionUpdate(SQLModel):
    title: Optional[str] = None
    status: Optional[SessionStatus] = None
    model: Optional[str] = None
    last_activity: Optional[datetime] = None
    message_count: Optional[int] = None
    metadata: Optional[dict] = None
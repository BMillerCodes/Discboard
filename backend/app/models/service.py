import uuid
from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from enum import Enum
from sqlalchemy import JSON

class ServiceStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"
    UNKNOWN = "unknown"

class ServiceType(str, Enum):
    HOMELAB = "homelab"
    WEB = "web"
    DATABASE = "database"
    API = "api"
    BOT = "bot"
    OTHER = "other"

class Service(SQLModel, table=True):
    __tablename__ = "services"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str = Field(index=True)
    type: ServiceType = Field(default=ServiceType.OTHER)
    url: str
    status: ServiceStatus = Field(default=ServiceStatus.UNKNOWN)
    uptime_pct: float = Field(default=0.0)
    response_time_ms: Optional[int] = None
    last_check: datetime = Field(default_factory=datetime.utcnow)
    icon: str = Field(default="🔧")
    description: Optional[str] = None
    extra_data: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)
    
    class Config:
        arbitrary_types_allowed = True

class ServiceCreate(SQLModel):
    name: str
    type: Optional[ServiceType] = ServiceType.OTHER
    url: str
    icon: Optional[str] = "🔧"
    description: Optional[str] = None

class ServiceUpdate(SQLModel):
    name: Optional[str] = None
    type: Optional[ServiceType] = None
    url: Optional[str] = None
    status: Optional[ServiceStatus] = None
    uptime_pct: Optional[float] = None
    response_time_ms: Optional[int] = None
    last_check: Optional[datetime] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    extra_data: Optional[dict] = None

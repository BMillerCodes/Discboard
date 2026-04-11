import uuid
from datetime import datetime
from typing import Optional, Any
from sqlmodel import SQLModel, Field
from sqlalchemy import JSON

class TokenUsage(SQLModel, table=True):
    __tablename__ = "token_usage"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    session_id: Optional[str] = Field(default=None, index=True)
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_cost: float = 0.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    extra_data: dict[str, Any] = Field(default_factory=dict, sa_type=JSON)
    
    class Config:
        arbitrary_types_allowed = True

class TokenUsageCreate(SQLModel):
    session_id: Optional[str] = None
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_cost: float = 0.0

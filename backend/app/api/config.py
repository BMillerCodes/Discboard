from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigUpdate(BaseModel):
    model: Optional[str] = None
    token_budget: Optional[float] = None
    uptime_kuma_url: Optional[str] = None
    uptime_kuma_api_key: Optional[str] = None


class ConfigResponse(BaseModel):
    model: str
    token_budget: float
    uptime_kuma_url: str
    uptime_kuma_api_key: str


# In-memory config store (in production this would be persisted to DB or file)
_config = {
    "model": "gpt-4o",
    "token_budget": 10.0,
    "uptime_kuma_url": "http://172.20.0.5:3001",
    "uptime_kuma_api_key": "",
}


@router.get("", response_model=ConfigResponse)
async def get_config():
    """Get current configuration."""
    return ConfigResponse(**_config)


@router.patch("", response_model=ConfigResponse)
async def update_config(update: ConfigUpdate):
    """Update configuration."""
    if update.model is not None:
        _config["model"] = update.model
    if update.token_budget is not None:
        _config["token_budget"] = update.token_budget
    if update.uptime_kuma_url is not None:
        _config["uptime_kuma_url"] = update.uptime_kuma_url
    if update.uptime_kuma_api_key is not None:
        _config["uptime_kuma_api_key"] = update.uptime_kuma_api_key
    
    return ConfigResponse(**_config)

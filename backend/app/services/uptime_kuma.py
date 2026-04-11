import httpx
from typing import Optional
from app.config import settings

class UptimeKumaClient:
    def __init__(self, base_url: str = None, api_key: str = None):
        self.base_url = base_url or settings.UPTIME_KUMA_URL
        self.api_key = api_key or settings.UPTIME_KUMA_API_KEY
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def get_monitors(self) -> list[dict]:
        """Get all monitors from Uptime Kuma."""
        if not self.api_key:
            return []
        
        try:
            resp = await self.client.get(
                f"{self.base_url}/api/monitors",
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception as e:
            print(f"UptimeKuma error: {e}")
        return []
    
    async def get_status(self, monitor_id: int) -> dict:
        """Get status for a specific monitor."""
        if not self.api_key:
            return {}
        
        try:
            resp = await self.client.get(
                f"{self.base_url}/api/monitors/{monitor_id}",
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            if resp.status_code == 200:
                return resp.json()
        except Exception:
            pass
        return {}
    
    async def heartbeat(self, monitor_id: int) -> list[dict]:
        """Get heartbeat history for a monitor."""
        if not self.api_key:
            return []
        
        try:
            resp = await self.client.get(
                f"{self.base_url}/api/monitors/{monitor_id}/heartbeats",
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            if resp.status_code == 200:
                return resp.json().get("heartbeats", [])
        except Exception:
            pass
        return []
    
    async def close(self):
        await self.client.aclose()
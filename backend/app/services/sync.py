import asyncio
from datetime import datetime
from app.services.uptime_kuma import UptimeKumaClient
from app.database import Session
from app.models import Service, ServiceType, ServiceStatus


class SyncService:
    """Periodic sync service for Uptime Kuma monitors."""
    
    def __init__(self, interval_minutes: int = 5):
        self.interval = interval_minutes * 60  # Convert to seconds
        self.running = False
        self.task = None
    
    async def sync_monitors(self):
        """Fetch monitors from Uptime Kuma and update/create Service records."""
        client = UptimeKumaClient()
        monitors = await client.get_monitors()
        await client.close()
        
        if not monitors:
            return
        
        with Session() as session:
            for monitor in monitors:
                monitor_id = monitor.get("id")
                name = monitor.get("name", f"Monitor-{monitor_id}")
                url = monitor.get("url", "")
                status = self._map_status(monitor.get("active", False))
                
                # Check if service already exists by name
                existing = session.query(Service).filter(
                    Service.name == name
                ).first()
                
                if existing:
                    # Update existing service
                    existing.status = status
                    existing.url = url
                    existing.metadata = {
                        "monitor_id": monitor_id,
                        "uptime_kuma_url": monitor.get("url"),
                        "paused": monitor.get("paused", False),
                    }
                    existing.last_check = datetime.utcnow()
                else:
                    # Create new service
                    service = Service(
                        name=name,
                        type=ServiceType.WEB,
                        url=url,
                        status=status,
                        icon="📊",
                        description=f"Synced from Uptime Kuma monitor",
                        metadata={
                            "monitor_id": monitor_id,
                            "uptime_kuma_url": monitor.get("url"),
                            "paused": monitor.get("paused", False),
                        },
                    )
                    session.add(service)
            
            session.commit()
            print(f"[SyncService] Synced {len(monitors)} monitors")
    
    def _map_status(self, active: bool) -> ServiceStatus:
        """Map Uptime Kuma active status to ServiceStatus."""
        return ServiceStatus.HEALTHY if active else ServiceStatus.DOWN
    
    async def _run_loop(self):
        """Main sync loop."""
        while self.running:
            try:
                await self.sync_monitors()
            except Exception as e:
                print(f"[SyncService] Error syncing: {e}")
            
            await asyncio.sleep(self.interval)
    
    def start(self):
        """Start the sync service in the background."""
        if self.running:
            return
        
        self.running = True
        self.task = asyncio.create_task(self._run_loop())
        print(f"[SyncService] Started with {self.interval}s interval")
    
    async def stop(self):
        """Stop the sync service."""
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        print("[SyncService] Stopped")
    
    async def trigger_sync(self):
        """Manually trigger a sync."""
        await self.sync_monitors()
        return {"ok": True, "message": "Sync completed"}


# Global sync service instance
sync_service = SyncService()


async def start_sync_service():
    """Start the global sync service."""
    sync_service.start()


async def stop_sync_service():
    """Stop the global sync service."""
    await sync_service.stop()
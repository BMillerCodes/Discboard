from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from typing import Optional
from app.database import get_session
from app.models import Service, ServiceCreate, ServiceUpdate, ServiceStatus, ServiceType
from app.api.events import event_bus, EVENT_SERVICE_CREATED, EVENT_SERVICE_UPDATED, EVENT_SERVICE_DELETED

router = APIRouter(prefix="/api/services", tags=["services"])

@router.get("", response_model=list[Service])
def list_services(
    type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    session: Session = Depends(get_session)
):
    query = select(Service)
    if type:
        query = query.where(Service.type == type)
    if status:
        query = query.where(Service.status == status)
    query = query.order_by(Service.name).limit(limit)
    return session.exec(query).all()

@router.post("", response_model=Service)
async def create_service(
    data: ServiceCreate,
    session: Session = Depends(get_session)
):
    service = Service(
        name=data.name,
        type=data.type or ServiceType.OTHER,
        url=data.url,
        icon=data.icon or "🔧",
        description=data.description,
    )
    session.add(service)
    session.commit()
    session.refresh(service)

    # Broadcast service created event
    await event_bus.broadcast(
        EVENT_SERVICE_CREATED,
        {"service": service.model_dump(mode="json")}
    )

    return service

@router.get("/{service_id}", response_model=Service)
def get_service(
    service_id: str,
    session: Session = Depends(get_session)
):
    s = session.get(Service, service_id)
    if not s:
        raise HTTPException(status_code=404, detail="Service not found")
    return s

@router.patch("/{service_id}", response_model=Service)
async def update_service(
    service_id: str,
    data: ServiceUpdate,
    session: Session = Depends(get_session)
):
    s = session.get(Service, service_id)
    if not s:
        raise HTTPException(status_code=404, detail="Service not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(s, key, value)
    session.add(s)
    session.commit()
    session.refresh(s)

    # Broadcast service updated event
    await event_bus.broadcast(
        EVENT_SERVICE_UPDATED,
        {"service": s.model_dump(mode="json")}
    )

    return s

@router.delete("/{service_id}")
async def delete_service(
    service_id: str,
    session: Session = Depends(get_session)
):
    s = session.get(Service, service_id)
    if not s:
        raise HTTPException(status_code=404, detail="Service not found")

    # Store service data for broadcast before deletion
    service_data = s.model_dump(mode="json")

    session.delete(s)
    session.commit()

    # Broadcast service deleted event
    await event_bus.broadcast(
        EVENT_SERVICE_DELETED,
        {"service": service_data}
    )

    return {"ok": True}

@router.post("/{service_id}/check")
def check_service(
    service_id: str,
    session: Session = Depends(get_session)
):
    import httpx
    s = session.get(Service, service_id)
    if not s:
        raise HTTPException(status_code=404, detail="Service not found")
    
    try:
        import time
        start = time.time()
        response = httpx.get(s.url, timeout=5)
        elapsed = int((time.time() - start) * 1000)
        
        s.status = ServiceStatus.HEALTHY if response.status_code < 500 else ServiceStatus.DEGRADED
        s.response_time_ms = elapsed
    except Exception:
        s.status = ServiceStatus.DOWN
        s.response_time_ms = None
    
    s.last_check = datetime.utcnow()
    session.add(s)
    session.commit()
    return {
        "ok": True,
        "status": s.status.value,
        "response_time_ms": s.response_time_ms
    }

@router.post("/sync")
async def trigger_sync():
    """Manually trigger Uptime Kuma sync."""
    from app.services.sync import sync_service
    return await sync_service.trigger_sync()
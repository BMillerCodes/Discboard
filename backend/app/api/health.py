from fastapi import APIRouter

router = APIRouter(prefix="/api/health", tags=["health"])

@router.get("")
def health_check():
    return {
        "status": "healthy",
        "service": "Discboard",
        "version": "0.1.0",
        "timestamp": "2026-04-10T04:00:00Z"
    }

@router.get("/ready")
def readiness_check():
    return {"ready": True}
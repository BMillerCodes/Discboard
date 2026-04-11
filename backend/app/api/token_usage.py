from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from datetime import datetime, timedelta
from app.database import get_session
from app.models import TokenUsage, TokenUsageCreate

router = APIRouter(prefix="/api/token-usage", tags=["token_usage"])

@router.get("", response_model=list[TokenUsage])
def list_usage(
    session_id: str = None,
    model: str = None,
    days: int = 7,
    limit: int = 100,
    db: Session = Depends(get_session)
):
    query = select(TokenUsage)
    if session_id:
        query = query.where(TokenUsage.session_id == session_id)
    if model:
        query = query.where(TokenUsage.model == model)
    cutoff = datetime.utcnow() - timedelta(days=days)
    query = query.where(TokenUsage.timestamp >= cutoff)
    query = query.order_by(TokenUsage.timestamp.desc()).limit(limit)
    return db.exec(query).all()

@router.post("", response_model=TokenUsage)
def record_usage(
    data: TokenUsageCreate,
    db: Session = Depends(get_session)
):
    usage = TokenUsage(**data.model_dump())
    db.add(usage)
    db.commit()
    db.refresh(usage)
    return usage

@router.get("/summary")
def usage_summary(
    days: int = 7,
    db: Session = Depends(get_session)
):
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    total_input = db.exec(
        select(func.sum(TokenUsage.input_tokens))
        .where(TokenUsage.timestamp >= cutoff)
    ).one_or_none() or 0
    
    total_output = db.exec(
        select(func.sum(TokenUsage.output_tokens))
        .where(TokenUsage.timestamp >= cutoff)
    ).one_or_none() or 0
    
    total_cost = db.exec(
        select(func.sum(TokenUsage.total_cost))
        .where(TokenUsage.timestamp >= cutoff)
    ).one_or_none() or 0.0
    
    by_model = db.exec(
        select(
            TokenUsage.model,
            func.sum(TokenUsage.input_tokens).label("input"),
            func.sum(TokenUsage.output_tokens).label("output"),
            func.sum(TokenUsage.total_cost).label("cost")
        )
        .where(TokenUsage.timestamp >= cutoff)
        .group_by(TokenUsage.model)
    ).all()
    
    return {
        "period_days": days,
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_cost": round(total_cost, 4),
        "by_model": [
            {"model": r.model, "input_tokens": r.input, "output_tokens": r.output, "cost": round(r.cost, 4)}
            for r in by_model
        ]
    }
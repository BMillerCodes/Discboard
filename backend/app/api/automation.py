"""
Automation Rules API endpoints.
CRUD operations for automation rules plus testing.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.automation.rules import (
    AutomationRule, 
    AutomationRuleCreate, 
    AutomationRuleUpdate,
    automation_engine
)

router = APIRouter(prefix="/api/automation/rules", tags=["automation"])


@router.get("", response_model=list[AutomationRule])
def list_rules(
    enabled: bool = None,
    trigger_type: str = None,
    session: Session = Depends(get_session)
):
    """List all automation rules with optional filtering."""
    query = select(AutomationRule)
    
    if enabled is not None:
        query = query.where(AutomationRule.enabled == enabled)
    if trigger_type is not None:
        query = query.where(AutomationRule.trigger_type == trigger_type)
    
    query = query.order_by(AutomationRule.created_at.desc())
    return session.exec(query).all()


@router.post("", response_model=AutomationRule)
def create_rule(
    data: AutomationRuleCreate,
    session: Session = Depends(get_session)
):
    """Create a new automation rule."""
    rule = AutomationRule(
        name=data.name,
        trigger_type=data.trigger_type,
        trigger_config=data.trigger_config or {},
        action_type=data.action_type,
        action_config=data.action_config or {},
        enabled=data.enabled,
    )
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.get("/{rule_id}", response_model=AutomationRule)
def get_rule(
    rule_id: str,
    session: Session = Depends(get_session)
):
    """Get a specific automation rule."""
    rule = session.get(AutomationRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@router.patch("/{rule_id}", response_model=AutomationRule)
def update_rule(
    rule_id: str,
    data: AutomationRuleUpdate,
    session: Session = Depends(get_session)
):
    """Update an automation rule."""
    rule = session.get(AutomationRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rule, key, value)
    
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.delete("/{rule_id}")
def delete_rule(
    rule_id: str,
    session: Session = Depends(get_session)
):
    """Delete an automation rule."""
    rule = session.get(AutomationRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    session.delete(rule)
    session.commit()
    return {"ok": True}


@router.post("/{rule_id}/toggle", response_model=AutomationRule)
def toggle_rule(
    rule_id: str,
    session: Session = Depends(get_session)
):
    """Toggle an automation rule's enabled status."""
    rule = session.get(AutomationRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    rule.enabled = not rule.enabled
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.post("/{rule_id}/test")
async def test_rule(
    rule_id: str,
    session: Session = Depends(get_session)
):
    """Test an automation rule with sample event data."""
    rule = session.get(AutomationRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    result = await automation_engine.test_rule(rule, session)
    return result


@router.post("/trigger")
async def trigger_rules(
    event_type: str,
    event_data: dict,
    session: Session = Depends(get_session)
):
    """
    Manually trigger automation rules for an event type.
    This is called from webhook receivers and service monitors.
    """
    # Add event_type to event_data if not present
    event_data["event_type"] = event_type
    
    results = await automation_engine.check_and_trigger(event_type, event_data, session)
    return {
        "event_type": event_type,
        "rules_triggered": len(results),
        "results": results
    }

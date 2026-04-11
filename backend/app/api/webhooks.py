"""
Webhook receivers for Discord and GitHub.
Handle incoming webhooks and trigger automation rules.
"""

import hmac
import hashlib
import json
from fastapi import APIRouter, Request, HTTPException, Header
from app.automation.rules import automation_engine
from app.api.automation import get_session
from app.database import get_session as get_db_session
from sqlmodel import Session

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

# GitHub webhook secret (should match configured secret)
GITHUB_WEBHOOK_SECRET = "discboard-github-webhook-secret"


def verify_github_signature(payload: bytes, signature: str, secret: str = GITHUB_WEBHOOK_SECRET) -> bool:
    """Verify GitHub webhook signature."""
    if not signature:
        return False
    
    expected_signature = "sha256=" + hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)


def parse_github_event(event_type: str, payload: dict) -> tuple[str, dict]:
    """
    Parse GitHub webhook payload into standardized event format.
    Returns (event_type, event_data).
    """
    action = payload.get("action", "")
    
    # Pull Request events
    if event_type == "pull_request":
        pr = payload.get("pull_request", {})
        return "github_pr", {
            "action": action,
            "number": pr.get("number"),
            "title": pr.get("title"),
            "author": pr.get("user", {}).get("login", "unknown"),
            "repo": payload.get("repository", {}).get("name", ""),
            "labels": [l.get("name") for l in pr.get("labels", [])],
            "url": pr.get("html_url"),
            "draft": pr.get("draft", False),
            "merged": pr.get("merged", False),
            "sender": payload.get("sender", {}).get("login", "unknown"),
        }
    
    # Issue events
    elif event_type == "issues":
        issue = payload.get("issue", {})
        return "github_issue", {
            "action": action,
            "number": issue.get("number"),
            "title": issue.get("title"),
            "author": issue.get("user", {}).get("login", "unknown"),
            "repo": payload.get("repository", {}).get("name", ""),
            "labels": [l.get("name") for l in issue.get("labels", [])],
            "url": issue.get("html_url"),
            "comments": issue.get("comments", 0),
            "sender": payload.get("sender", {}).get("login", "unknown"),
        }
    
    # Workflow run events
    elif event_type == "workflow_run":
        workflow_run = payload.get("workflow_run", {})
        workflow = payload.get("workflow", {})
        return "github_workflow", {
            "action": action,
            "workflow_name": workflow.get("name", "Unknown"),
            "run_id": workflow_run.get("id"),
            "status": workflow_run.get("status"),
            "conclusion": workflow_run.get("conclusion"),
            "repo": payload.get("repository", {}).get("name", ""),
            "url": workflow_run.get("html_url"),
            "actor": workflow_run.get("actor", {}).get("login", "unknown"),
            "branch": workflow_run.get("head_branch"),
        }
    
    # Star events
    elif event_type == "star":
        return "github_star", {
            "action": action,
            "repo": payload.get("repository", {}).get("name", ""),
            "sender": payload.get("sender", {}).get("login", "unknown"),
        }
    
    # Release events
    elif event_type == "release":
        release = payload.get("release", {})
        return "github_release", {
            "action": action,
            "tag": release.get("tag_name"),
            "name": release.get("name"),
            "repo": payload.get("repository", {}).get("name", ""),
            "url": release.get("html_url"),
            "sender": payload.get("sender", {}).get("login", "unknown"),
        }
    
    # Generic fallback
    return event_type, {
        "action": action,
        "repo": payload.get("repository", {}).get("name", ""),
        "sender": payload.get("sender", {}).get("login", "unknown"),
        "raw_payload": payload,
    }


@router.post("/github")
async def github_webhook(
    request: Request,
    x_github_event: str = Header(None, alias="X-GitHub-Event"),
    x_github_signature: str = Header(None, alias="X-Hub-Signature-256"),
    x_github_delivery: str = Header(None, alias="X-GitHub-Delivery"),
):
    """
    Receive GitHub webhooks and trigger automation rules.
    
    Validates signature, parses event, and dispatches to automation engine.
    """
    # Get raw body for signature verification
    body = await request.body()
    
    # Verify signature (skip in development if no secret configured)
    if GITHUB_WEBHOOK_SECRET and GITHUB_WEBHOOK_SECRET != "discboard-github-webhook-secret":
        if not verify_github_signature(body, x_github_signature):
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Parse JSON payload
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    # Handle GitHub ping event
    if x_github_event == "ping":
        return {
            "ok": True,
            "message": "Pong! Webhook configured correctly",
            "delivery_id": x_github_delivery,
        }
    
    # Handle delete event (no payload)
    if x_github_event == "delete":
        return {
            "ok": True,
            "message": "Delete event received",
            "delivery_id": x_github_delivery,
        }
    
    # Parse event into standardized format
    event_type, event_data = parse_github_event(x_github_event, payload)
    
    # Get database session
    with get_db_session() as session:
        # Trigger automation rules
        results = await automation_engine.check_and_trigger(event_type, event_data, session)
    
    return {
        "ok": True,
        "event": x_github_event,
        "parsed_event_type": event_type,
        "delivery_id": x_github_delivery,
        "rules_triggered": len(results),
        "results": results,
    }


@router.post("/discord")
async def discord_webhook(request: Request):
    """
    Receive Discord interaction webhooks.
    
    Discord sends interaction webhooks as POST requests with JSON payload.
    This handles things like message components, slash commands, etc.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    # Interaction types:
    # 1 = Ping
    # 2 = Application Command
    # 3 = Message Component
    # 4 = Application Command Autocomplete
    # 5 = Modal Submit
    
    interaction_type = payload.get("type", 0)
    
    # Respond to ping interactions
    if interaction_type == 1:
        return {"type": 1}  # Pong
    
    # Parse interaction data
    interaction_data = payload.get("data", {})
    custom_id = interaction_data.get("custom_id", "")
    
    # Build event data for automation
    event_data = {
        "interaction_type": interaction_type,
        "custom_id": custom_id,
        "guild_id": payload.get("guild_id", ""),
        "channel_id": payload.get("channel_id", ""),
        "user_id": payload.get("user", {}).get("id", "") or payload.get("member", {}).get("user", {}).get("id", ""),
        "token": payload.get("token", ""),
    }
    
    # Get database session
    with get_db_session() as session:
        # Trigger automation rules for Discord interactions
        results = await automation_engine.check_and_trigger("discord_interaction", event_data, session)
    
    # For now, acknowledge the interaction (component interactions need followup)
    if interaction_type in [2, 3]:  # Application Command or Message Component
        return {
            "type": 5 if interaction_type == 5 else 4,  # Deferred update or ack
            "data": {"content": "Processing..."}
        }
    
    return {
        "ok": True,
        "interaction_type": interaction_type,
        "rules_triggered": len(results),
        "results": results,
    }


@router.get("/github/config")
def get_github_webhook_config():
    """Get GitHub webhook configuration info."""
    return {
        "webhook_url": "/api/webhooks/github",
        "events": [
            "pull_request",
            "issues", 
            "workflow_run",
            "star",
            "release",
            "ping"
        ],
        "secret_configured": bool(GITHUB_WEBHOOK_SECRET and GITHUB_WEBHOOK_SECRET != "discboard-github-webhook-secret"),
    }


@router.get("/discord/config")
def get_discord_webhook_config():
    """Get Discord webhook configuration info."""
    return {
        "webhook_url": "/api/webhooks/discord",
        "interaction_types": {
            "1": "Ping",
            "2": "Application Command",
            "3": "Message Component",
            "4": "Application Command Autocomplete",
            "5": "Modal Submit"
        }
    }

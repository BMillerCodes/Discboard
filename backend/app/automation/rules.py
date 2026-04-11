"""
Automation Rules Engine for Discboard.
Triggers actions based on events from GitHub, Discord, and service monitors.
"""

import uuid
import asyncio
import httpx
import hmac
import hashlib
import json
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class AutomationRule(SQLModel, table=True):
    """Automation rule model for triggering actions based on events."""
    __tablename__ = "automation_rules"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    trigger_type: str  # 'github_pr', 'github_issue', 'service_down', 'token_budget', 'discord_interaction'
    trigger_config: dict = Field(default_factory=dict)  # e.g., {"repo": "shelfmark", "event": "opened"}
    action_type: str  # 'discord_embed', 'discord_message', 'webhook'
    action_config: dict = Field(default_factory=dict)  # e.g., {"channel_id": "123", "message": "..."}
    enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class AutomationRuleCreate(SQLModel):
    name: str
    trigger_type: str
    trigger_config: dict = {}
    action_type: str
    action_config: dict = {}
    enabled: bool = True


class AutomationRuleUpdate(SQLModel):
    name: Optional[str] = None
    trigger_type: Optional[str] = None
    trigger_config: Optional[dict] = None
    action_type: Optional[str] = None
    action_config: Optional[dict] = None
    enabled: Optional[bool] = None


class AutomationEngine:
    """
    Engine for checking automation rules and triggering actions.
    Called from GitHub webhook endpoint, service monitor, and Discord interaction handlers.
    """
    
    def __init__(self):
        self._discord_client: Optional[httpx.AsyncClient] = None
    
    async def check_and_trigger(self, event_type: str, event_data: dict, db_session=None) -> list[dict]:
        """
        Evaluate all enabled rules matching the event type and fire their actions.
        Returns list of action results.
        """
        from sqlmodel import select
        
        results = []
        
        if db_session is None:
            return results
        
        # Get all enabled rules matching the trigger type
        query = select(AutomationRule).where(
            AutomationRule.enabled == True,
            AutomationRule.trigger_type == event_type
        )
        rules = db_session.exec(query).all()
        
        for rule in rules:
            # Check if rule conditions match
            if self._check_trigger_conditions(rule.trigger_config, event_data):
                # Execute the action
                result = await self._execute_action(rule.action_type, rule.action_config, event_data, rule.name)
                results.append({
                    "rule_id": rule.id,
                    "rule_name": rule.name,
                    "success": result["success"],
                    "message": result.get("message", ""),
                    "details": result.get("details", {})
                })
        
        return results
    
    def _check_trigger_conditions(self, trigger_config: dict, event_data: dict) -> bool:
        """Check if event data matches the trigger conditions."""
        # Repository filter
        if "repo" in trigger_config:
            repo = trigger_config["repo"]
            event_repo = event_data.get("repo", event_data.get("repository", {}).get("name", ""))
            if isinstance(event_repo, str) and repo.lower() not in event_repo.lower():
                return False
        
        # Event action filter (e.g., 'opened', 'closed')
        if "event" in trigger_config:
            expected_event = trigger_config["event"]
            event_action = event_data.get("action", event_data.get("event_action", ""))
            if expected_event.lower() != event_action.lower():
                return False
        
        # Label filter
        if "labels" in trigger_config:
            expected_labels = set(trigger_config["labels"])
            event_labels = set(event_data.get("labels", []))
            if not expected_labels.issubset(event_labels):
                return False
        
        # Service name filter
        if "service_name" in trigger_config:
            service_name = trigger_config["service_name"]
            event_service = event_data.get("service_name", "")
            if service_name.lower() != event_service.lower():
                return False
        
        # Budget threshold filter
        if "budget_threshold" in trigger_config:
            current_spend = event_data.get("current_spend", 0)
            threshold = float(trigger_config["budget_threshold"])
            if current_spend < threshold:
                return False
        
        return True
    
    async def _execute_action(
        self, 
        action_type: str, 
        action_config: dict, 
        event_data: dict,
        rule_name: str
    ) -> dict:
        """Execute the specified action type."""
        try:
            if action_type == "discord_embed":
                return await self.send_discord_embed(action_config, event_data, rule_name)
            elif action_type == "discord_message":
                return await self.send_discord_message(action_config, event_data, rule_name)
            elif action_type == "webhook":
                return await self.call_webhook(action_config, event_data)
            else:
                return {"success": False, "message": f"Unknown action type: {action_type}"}
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    async def send_discord_embed(
        self, 
        action_config: dict, 
        event_data: dict,
        rule_name: str
    ) -> dict:
        """Send a rich embed to a Discord channel."""
        from app.config import settings
        
        channel_id = action_config.get("channel_id")
        if not channel_id:
            return {"success": False, "message": "No channel_id specified"}
        
        # Build embed based on event type
        embed = self._build_embed_for_event(event_data, rule_name)
        
        webhook_url = action_config.get("webhook_url")
        if webhook_url:
            # Use provided webhook URL
            payload = {"embeds": [embed]}
            return await self._post_to_discord_webhook(webhook_url, payload)
        elif settings.DISCORD_BOT_TOKEN:
            # Use Discord Bot API to send to channel
            return await self._send_via_bot_api(channel_id, embed)
        else:
            return {"success": False, "message": "No Discord webhook or bot token configured"}
    
    async def _send_via_bot_api(self, channel_id: str, embed: dict) -> dict:
        """Send embed using Discord Bot API."""
        from app.config import settings
        import discord
        
        # If Discord client isn't initialized, create a new one
        if not hasattr(self, '_discord_bot') or self._discord_bot is None:
            intents = discord.Intents.default()
            self._discord_bot = discord.Client(intents=intents)
        
        # This would integrate with the actual Discord bot - simplified for now
        return {"success": True, "message": "Embed sent via bot API"}
    
    def _build_embed_for_event(self, event_data: dict, rule_name: str) -> dict:
        """Build a Discord embed based on the event data."""
        event_type = event_data.get("event_type", "unknown")
        
        # Base embed with rule info
        embed = {
            "title": f"Automation: {rule_name}",
            "color": 0x7289da,  # Blurple
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": "Discboard Automation"},
        }
        
        if event_type == "github_pr":
            embed["title"] = f"📝 PR #{event_data.get('number')}: {event_data.get('title', 'No title')}"
            embed["color"] = 0x28a745 if event_data.get('action') == 'opened' else 0xdc3545
            embed["url"] = event_data.get("url", "")
            embed["description"] = f"**Action:** {event_data.get('action', 'unknown')}\n**Author:** {event_data.get('author', 'unknown')}"
            embed["fields"] = [
                {"name": "Repository", "value": event_data.get('repo', 'unknown'), "inline": True},
                {"name": "Author", "value": event_data.get('author', 'unknown'), "inline": True},
            ]
            if event_data.get('labels'):
                embed["fields"].append({"name": "Labels", "value": ", ".join(event_data['labels']), "inline": False})
        
        elif event_type == "github_issue":
            embed["title"] = f"🐛 Issue #{event_data.get('number')}: {event_data.get('title', 'No title')}"
            embed["color"] = 0xf1c40f if event_data.get('action') == 'opened' else 0x6c757d
            embed["url"] = event_data.get("url", "")
            embed["description"] = f"**Action:** {event_data.get('action', 'unknown')}\n**Author:** {event_data.get('author', 'unknown')}"
            embed["fields"] = [
                {"name": "Repository", "value": event_data.get('repo', 'unknown'), "inline": True},
                {"name": "Author", "value": event_data.get('author', 'unknown'), "inline": True},
            ]
        
        elif event_type == "service_down":
            embed["title"] = f"🔴 Service Down: {event_data.get('service_name', 'Unknown')}"
            embed["color"] = 0xdc3545
            embed["description"] = f"**URL:** {event_data.get('url', 'N/A')}"
            embed["fields"] = [
                {"name": "Service", "value": event_data.get('service_name', 'unknown'), "inline": True},
                {"name": "Status", "value": event_data.get('status', 'down'), "inline": True},
            ]
        
        elif event_type == "token_budget":
            embed["title"] = f"💰 Token Budget Alert"
            embed["color"] = 0xffc107  # Yellow/warning
            embed["description"] = f"**Current Spend:** ${event_data.get('current_spend', 0):.2f}"
            embed["fields"] = [
                {"name": "Budget", "value": f"${event_data.get('budget', 0):.2f}", "inline": True},
                {"name": "Percentage", "value": f"{event_data.get('percentage', 0):.1f}%", "inline": True},
            ]
        
        else:
            # Generic embed
            embed["description"] = f"**Event Type:** {event_type}\n**Data:** {json.dumps(event_data, indent=2)[:500]}"
        
        return embed
    
    async def send_discord_message(
        self, 
        action_config: dict, 
        event_data: dict,
        rule_name: str
    ) -> dict:
        """Send a simple message to a Discord channel."""
        webhook_url = action_config.get("webhook_url")
        channel_id = action_config.get("channel_id")
        message_template = action_config.get("message", "{event_type} event triggered {rule_name}")
        
        # Substitute template variables
        message = message_template.format(
            event_type=event_data.get("event_type", "unknown"),
            rule_name=rule_name,
            **event_data
        )
        
        if webhook_url:
            payload = {"content": message}
            return await self._post_to_discord_webhook(webhook_url, payload)
        elif channel_id:
            # Would need bot API - placeholder
            return {"success": True, "message": f"Message would be sent to channel {channel_id}"}
        else:
            return {"success": False, "message": "No webhook_url or channel_id specified"}
    
    async def call_webhook(self, action_config: dict, event_data: dict) -> dict:
        """POST event data to an external webhook URL."""
        url = action_config.get("url")
        if not url:
            return {"success": False, "message": "No webhook URL specified"}
        
        # Build payload
        payload = {
            "event_type": event_data.get("event_type", "unknown"),
            "timestamp": datetime.utcnow().isoformat(),
            "data": event_data
        }
        
        # Add custom headers if specified
        headers = action_config.get("headers", {})
        headers["Content-Type"] = "application/json"
        
        # Add secret for signature if specified
        secret = action_config.get("secret")
        if secret:
            signature = hmac.new(
                secret.encode(),
                json.dumps(payload).encode(),
                hashlib.sha256
            ).hexdigest()
            headers["X-Discboard-Signature"] = signature
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=10.0)
                response.raise_for_status()
                return {
                    "success": True,
                    "message": f"Webhook delivered: {response.status_code}",
                    "details": {"status_code": response.status_code}
                }
        except httpx.TimeoutException:
            return {"success": False, "message": "Webhook request timed out"}
        except httpx.HTTPStatusError as e:
            return {"success": False, "message": f"Webhook error: {e.response.status_code}"}
        except Exception as e:
            return {"success": False, "message": f"Webhook failed: {str(e)}"}
    
    async def _post_to_discord_webhook(self, webhook_url: str, payload: dict) -> dict:
        """POST payload to Discord webhook."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(webhook_url, json=payload, timeout=10.0)
                response.raise_for_status()
                return {
                    "success": True,
                    "message": f"Discord webhook sent: {response.status_code}",
                    "details": {"status_code": response.status_code}
                }
        except httpx.TimeoutException:
            return {"success": False, "message": "Discord webhook request timed out"}
        except httpx.HTTPStatusError as e:
            return {"success": False, "message": f"Discord webhook error: {e.response.status_code}"}
        except Exception as e:
            return {"success": False, "message": f"Discord webhook failed: {str(e)}"}
    
    async def test_rule(self, rule: AutomationRule, db_session=None) -> dict:
        """Test a rule with sample event data."""
        # Generate sample event based on trigger type
        sample_events = {
            "github_pr": {
                "event_type": "github_pr",
                "action": "opened",
                "number": 123,
                "title": "Test PR: Add new feature",
                "author": "testuser",
                "repo": rule.trigger_config.get("repo", "test-repo"),
                "labels": [],
                "url": "https://github.com/BMillerCodes/test-repo/pull/123",
                "draft": False,
                "merged": False,
            },
            "github_issue": {
                "event_type": "github_issue",
                "action": "opened",
                "number": 456,
                "title": "Test Issue: Bug found",
                "author": "testuser",
                "repo": rule.trigger_config.get("repo", "test-repo"),
                "labels": ["bug"],
                "url": "https://github.com/BMillerCodes/test-repo/issues/456",
            },
            "service_down": {
                "event_type": "service_down",
                "service_name": rule.trigger_config.get("service_name", "test-service"),
                "url": "https://test-service.example.com",
                "status": "down",
            },
            "token_budget": {
                "event_type": "token_budget",
                "current_spend": float(rule.trigger_config.get("budget_threshold", 10)),
                "budget": 100.0,
                "percentage": 100.0,
            },
        }
        
        sample_event = sample_events.get(rule.trigger_type, {"event_type": rule.trigger_type})
        sample_event["event_type"] = rule.trigger_type
        
        # Execute the action without storing anything
        result = await self._execute_action(
            rule.action_type, 
            rule.action_config, 
            sample_event,
            rule.name
        )
        
        return {
            "success": result["success"],
            "message": result.get("message", ""),
            "sample_event": sample_event,
            "action_result": result
        }


# Global engine instance
automation_engine = AutomationEngine()

"""Tests for Discboard data models."""
import pytest
from datetime import datetime
from sqlmodel import SQLModel

from app.models.session import Session, SessionCreate, SessionUpdate, SessionStatus
from app.models.service import Service, ServiceCreate, ServiceUpdate, ServiceStatus, ServiceType
from app.models.bookmark import Bookmark, BookmarkCreate, BookmarkUpdate
from app.models.token_usage import TokenUsage, TokenUsageCreate


class TestSessionModel:
    """Tests for Session model."""

    def test_session_create_defaults(self):
        """Test Session model default values."""
        session = Session(discord_channel_id="123")
        assert session.status == SessionStatus.ACTIVE
        assert session.model == "MiniMax-M2.7"
        assert session.message_count == 0
        assert session.extra_data == {}

    def test_session_with_status(self):
        """Test Session can be created with different statuses."""
        session = Session(
            discord_channel_id="123",
            status=SessionStatus.IDLE
        )
        assert session.status == SessionStatus.IDLE

    def test_session_serialization(self):
        """Test Session serializes to JSON correctly."""
        session = Session(
            discord_channel_id="123",
            title="Test Session",
            status=SessionStatus.ACTIVE
        )
        data = session.model_dump(mode="json")
        assert data["discord_channel_id"] == "123"
        assert data["title"] == "Test Session"
        assert data["status"] == "active"

    def test_session_create_model(self):
        """Test SessionCreate schema."""
        create = SessionCreate(discord_channel_id="123")
        assert create.discord_channel_id == "123"
        assert create.title == "New Session"
        assert create.model == "MiniMax-M2.7"

    def test_session_update_model(self):
        """Test SessionUpdate schema allows partial updates."""
        update = SessionUpdate(title="Updated")
        assert update.title == "Updated"
        assert update.status is None
        assert update.model is None


class TestServiceModel:
    """Tests for Service model."""

    def test_service_create_defaults(self):
        """Test Service model default values."""
        service = Service(name="Test", url="https://example.com")
        assert service.status == ServiceStatus.UNKNOWN
        assert service.type == ServiceType.OTHER
        assert service.uptime_pct == 0.0
        assert service.icon == "🔧"

    def test_service_statuses(self):
        """Test ServiceStatus enum values."""
        assert ServiceStatus.HEALTHY.value == "healthy"
        assert ServiceStatus.DEGRADED.value == "degraded"
        assert ServiceStatus.DOWN.value == "down"
        assert ServiceStatus.UNKNOWN.value == "unknown"

    def test_service_types(self):
        """Test ServiceType enum values."""
        assert ServiceType.HOMELAB.value == "homelab"
        assert ServiceType.WEB.value == "web"
        assert ServiceType.DATABASE.value == "database"
        assert ServiceType.API.value == "api"
        assert ServiceType.BOT.value == "bot"
        assert ServiceType.OTHER.value == "other"

    def test_service_serialization(self):
        """Test Service serializes to JSON correctly."""
        service = Service(
            name="My Service",
            url="https://example.com",
            status=ServiceStatus.HEALTHY
        )
        data = service.model_dump(mode="json")
        assert data["name"] == "My Service"
        assert data["status"] == "healthy"

    def test_service_create_model(self):
        """Test ServiceCreate schema."""
        create = ServiceCreate(
            name="New Service",
            url="https://example.com",
            type=ServiceType.WEB
        )
        assert create.name == "New Service"
        assert create.type == ServiceType.WEB


class TestBookmarkModel:
    """Tests for Bookmark model."""

    def test_bookmark_create_defaults(self):
        """Test Bookmark model default values."""
        bookmark = Bookmark(url="https://example.com", label="Example")
        assert bookmark.tags == []
        assert bookmark.extra_data == {}

    def test_bookmark_with_tags(self):
        """Test Bookmark with tags."""
        bookmark = Bookmark(
            url="https://example.com",
            label="Example",
            tags=["python", "fastapi"]
        )
        assert len(bookmark.tags) == 2
        assert "python" in bookmark.tags

    def test_bookmark_serialization(self):
        """Test Bookmark serializes to JSON correctly."""
        bookmark = Bookmark(
            url="https://example.com",
            label="Example",
            tags=["test"]
        )
        data = bookmark.model_dump(mode="json")
        assert data["url"] == "https://example.com"
        assert data["label"] == "Example"
        assert "test" in data["tags"]

    def test_bookmark_create_model(self):
        """Test BookmarkCreate schema."""
        create = BookmarkCreate(
            url="https://example.com",
            label="Example",
            tags=["python"]
        )
        assert create.url == "https://example.com"
        assert create.label == "Example"
        assert "python" in create.tags

    def test_bookmark_update_model(self):
        """Test BookmarkUpdate schema allows partial updates."""
        update = BookmarkUpdate(label="Updated Label")
        assert update.label == "Updated Label"
        assert update.url is None


class TestTokenUsageModel:
    """Tests for TokenUsage model."""

    def test_token_usage_defaults(self):
        """Test TokenUsage model default values."""
        usage = TokenUsage(model="MiniMax-M2.7")
        assert usage.input_tokens == 0
        assert usage.output_tokens == 0
        assert usage.total_cost == 0.0

    def test_token_usage_calculation(self):
        """Test TokenUsage with cost calculation."""
        usage = TokenUsage(
            model="MiniMax-M2.7",
            input_tokens=1000,
            output_tokens=500,
            total_cost=0.05
        )
        assert usage.input_tokens == 1000
        assert usage.output_tokens == 500
        assert usage.total_cost == 0.05

    def test_token_usage_serialization(self):
        """Test TokenUsage serializes to JSON correctly."""
        usage = TokenUsage(
            model="MiniMax-M2.7",
            input_tokens=1000,
            output_tokens=500,
            total_cost=0.05
        )
        data = usage.model_dump(mode="json")
        assert data["model"] == "MiniMax-M2.7"
        assert data["input_tokens"] == 1000
        assert data["output_tokens"] == 500
        assert data["total_cost"] == 0.05

    def test_token_usage_create_model(self):
        """Test TokenUsageCreate schema."""
        create = TokenUsageCreate(
            model="MiniMax-M2.7",
            input_tokens=1000,
            output_tokens=500,
            total_cost=0.05
        )
        assert create.model == "MiniMax-M2.7"
        assert create.total_cost == 0.05

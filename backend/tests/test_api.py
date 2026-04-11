"""Tests for Discboard API endpoints."""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session


# Create in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


def get_session_override():
    with Session(engine) as session:
        yield session


app.dependency_overrides[get_session] = get_session_override


@pytest.fixture(autouse=True)
def setup_database():
    """Create tables before each test and drop after."""
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def client():
    """Test client with database overridden."""
    return TestClient(app)


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_health_check(self, client):
        """Test GET /api/health returns healthy status."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
        assert "version" in data

    def test_readiness_check(self, client):
        """Test GET /api/health/ready returns ready status."""
        response = client.get("/api/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["ready"] is True


class TestSessionEndpoints:
    """Tests for session CRUD endpoints."""

    def test_create_session(self, client):
        """Test POST /api/sessions creates a new session."""
        payload = {
            "discord_channel_id": "123456789",
            "discord_thread_id": None,
            "title": "Test Session",
            "model": "MiniMax-M2.7"
        }
        response = client.post("/api/sessions", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Session"
        assert data["model"] == "MiniMax-M2.7"
        assert "id" in data

    def test_list_sessions(self, client):
        """Test GET /api/sessions returns list of sessions."""
        # Create a session first
        client.post("/api/sessions", json={
            "discord_channel_id": "123456789",
            "title": "Test Session"
        })
        
        response = client.get("/api/sessions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_session_by_id(self, client):
        """Test GET /api/sessions/{id} returns specific session."""
        # Create a session
        create_response = client.post("/api/sessions", json={
            "discord_channel_id": "123456789",
            "title": "Test Session"
        })
        session_id = create_response.json()["id"]
        
        response = client.get(f"/api/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id

    def test_update_session(self, client):
        """Test PATCH /api/sessions/{id} updates session."""
        # Create a session
        create_response = client.post("/api/sessions", json={
            "discord_channel_id": "123456789",
            "title": "Original Title"
        })
        session_id = create_response.json()["id"]
        
        # Update it
        response = client.patch(f"/api/sessions/{session_id}", json={
            "title": "Updated Title",
            "status": "idle"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["status"] == "idle"

    def test_delete_session(self, client):
        """Test DELETE /api/sessions/{id} deletes session."""
        # Create a session
        create_response = client.post("/api/sessions", json={
            "discord_channel_id": "123456789",
            "title": "To Be Deleted"
        })
        session_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(f"/api/sessions/{session_id}")
        assert response.status_code == 200
        assert response.json()["ok"] is True
        
        # Verify deleted
        get_response = client.get(f"/api/sessions/{session_id}")
        assert get_response.status_code == 404

    def test_record_activity(self, client):
        """Test POST /api/sessions/{id}/activity increments count."""
        # Create a session
        create_response = client.post("/api/sessions", json={
            "discord_channel_id": "123456789",
            "title": "Activity Test"
        })
        session_id = create_response.json()["id"]
        initial_count = create_response.json()["message_count"]
        
        # Record activity
        response = client.post(f"/api/sessions/{session_id}/activity")
        assert response.status_code == 200
        data = response.json()
        assert data["message_count"] == initial_count + 1


class TestServiceEndpoints:
    """Tests for service CRUD endpoints."""

    def test_create_service(self, client):
        """Test POST /api/services creates a new service."""
        payload = {
            "name": "Test Service",
            "type": "web",
            "url": "https://example.com",
            "icon": "🔧"
        }
        response = client.post("/api/services", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Service"
        assert data["url"] == "https://example.com"
        assert "id" in data

    def test_list_services(self, client):
        """Test GET /api/services returns list of services."""
        # Create a service first
        client.post("/api/services", json={
            "name": "Test Service",
            "url": "https://example.com"
        })
        
        response = client.get("/api/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_service_by_id(self, client):
        """Test GET /api/services/{id} returns specific service."""
        # Create a service
        create_response = client.post("/api/services", json={
            "name": "Test Service",
            "url": "https://example.com"
        })
        service_id = create_response.json()["id"]
        
        response = client.get(f"/api/services/{service_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == service_id

    def test_update_service(self, client):
        """Test PATCH /api/services/{id} updates service."""
        # Create a service
        create_response = client.post("/api/services", json={
            "name": "Original Service",
            "url": "https://example.com"
        })
        service_id = create_response.json()["id"]
        
        # Update it
        response = client.patch(f"/api/services/{service_id}", json={
            "name": "Updated Service",
            "status": "degraded"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Service"

    def test_delete_service(self, client):
        """Test DELETE /api/services/{id} deletes service."""
        # Create a service
        create_response = client.post("/api/services", json={
            "name": "To Be Deleted",
            "url": "https://example.com"
        })
        service_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(f"/api/services/{service_id}")
        assert response.status_code == 200
        assert response.json()["ok"] is True


class TestBookmarkEndpoints:
    """Tests for bookmark CRUD endpoints."""

    def test_create_bookmark(self, client):
        """Test POST /api/bookmarks creates a new bookmark."""
        payload = {
            "url": "https://example.com",
            "label": "Example Site",
            "description": "An example website",
            "tags": ["example", "test"]
        }
        response = client.post("/api/bookmarks", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["url"] == "https://example.com"
        assert data["label"] == "Example Site"
        assert "id" in data

    def test_list_bookmarks(self, client):
        """Test GET /api/bookmarks returns list of bookmarks."""
        # Create a bookmark first
        client.post("/api/bookmarks", json={
            "url": "https://example.com",
            "label": "Example"
        })
        
        response = client.get("/api/bookmarks")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_bookmark_by_id(self, client):
        """Test GET /api/bookmarks/{id} returns specific bookmark."""
        # Create a bookmark
        create_response = client.post("/api/bookmarks", json={
            "url": "https://example.com",
            "label": "Example"
        })
        bookmark_id = create_response.json()["id"]
        
        response = client.get(f"/api/bookmarks/{bookmark_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == bookmark_id

    def test_update_bookmark(self, client):
        """Test PATCH /api/bookmarks/{id} updates bookmark."""
        # Create a bookmark
        create_response = client.post("/api/bookmarks", json={
            "url": "https://example.com",
            "label": "Original Label"
        })
        bookmark_id = create_response.json()["id"]
        
        # Update it
        response = client.patch(f"/api/bookmarks/{bookmark_id}", json={
            "label": "Updated Label",
            "tags": ["updated"]
        })
        assert response.status_code == 200
        data = response.json()
        assert data["label"] == "Updated Label"

    def test_delete_bookmark(self, client):
        """Test DELETE /api/bookmarks/{id} deletes bookmark."""
        # Create a bookmark
        create_response = client.post("/api/bookmarks", json={
            "url": "https://example.com",
            "label": "To Be Deleted"
        })
        bookmark_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(f"/api/bookmarks/{bookmark_id}")
        assert response.status_code == 200
        assert response.json()["ok"] is True

    def test_filter_bookmarks_by_tag(self, client):
        """Test GET /api/bookmarks?tag=X filters bookmarks by tag."""
        # Create bookmarks with different tags
        client.post("/api/bookmarks", json={
            "url": "https://example1.com",
            "label": "Example 1",
            "tags": ["python"]
        })
        client.post("/api/bookmarks", json={
            "url": "https://example2.com",
            "label": "Example 2",
            "tags": ["javascript"]
        })
        
        response = client.get("/api/bookmarks?tag=python")
        assert response.status_code == 200
        data = response.json()
        assert all("python" in b.get("tags", []) for b in data)


class TestRootEndpoint:
    """Tests for root endpoint."""

    def test_root(self, client):
        """Test GET / returns API info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Discboard"
        assert "version" in data
        assert "docs" in data

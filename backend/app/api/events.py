import asyncio
import json
import time
from typing import Set
from collections.abc import AsyncGenerator
from starlette.requests import Request
from sse_starlette.sse import EventSourceResponse
from fastapi import APIRouter

router = APIRouter(prefix="/api/events", tags=["events"])

# Event types
EVENT_SESSION_CREATED = "session_created"
EVENT_SESSION_UPDATED = "session_updated"
EVENT_SESSION_DELETED = "session_deleted"
EVENT_SERVICE_CREATED = "service_created"
EVENT_SERVICE_UPDATED = "service_updated"
EVENT_SERVICE_DELETED = "service_deleted"
EVENT_BOOKMARK_CREATED = "bookmark_created"
EVENT_BOOKMARK_UPDATED = "bookmark_updated"
EVENT_BOOKMARK_DELETED = "bookmark_deleted"
EVENT_TOKEN_USAGE_RECORDED = "token_usage_recorded"
EVENT_HEARTBEAT = "heartbeat"


class EventBus:
    """
    Singleton EventBus for SSE real-time updates.
    Stores active SSE connections and broadcasts events to all connected clients.
    """
    _instance: "EventBus | None" = None
    _lock: asyncio.Lock = asyncio.Lock()

    def __new__(cls) -> "EventBus":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._clients: Set[asyncio.Queue] = set()
        self._initialized = True

    async def connect(self) -> asyncio.Queue:
        """Add a new client connection and return its event queue."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._clients.add(queue)
        return queue

    async def disconnect(self, queue: asyncio.Queue) -> None:
        """Remove a client connection gracefully."""
        async with self._lock:
            self._clients.discard(queue)

    async def broadcast(self, event_type: str, data: dict) -> None:
        """Broadcast an event to all connected clients."""
        message = {
            "event": event_type,
            "data": data,
            "timestamp": time.time()
        }
        payload = json.dumps(message)

        # Create list of clients to notify outside the lock
        async with self._lock:
            clients = list(self._clients)

        # Send to all clients, removing any that have full queues
        disconnected = []
        for client in clients:
            try:
                # Non-blocking put, skip if queue is full
                client.put_nowait(payload)
            except asyncio.QueueFull:
                disconnected.append(client)

        # Clean up disconnected clients
        if disconnected:
            async with self._lock:
                for client in disconnected:
                    self._clients.discard(client)

    def broadcast_sync(self, event_type: str, data: dict) -> None:
        """Synchronous wrapper for broadcast (for use in non-async contexts)."""
        try:
            loop = asyncio.get_running_loop()
            asyncio.create_task(self.broadcast(event_type, data))
        except RuntimeError:
            # No running event loop, skip broadcast
            pass


# Global singleton instance
event_bus = EventBus()


@router.get("/stream")
async def sse_events_stream(request: Request) -> EventSourceResponse:
    """
    SSE endpoint that pushes real-time updates for sessions, services, and bookmarks.
    Clients connect here to receive live updates.
    """
    queue = await event_bus.connect()

    async def event_generator() -> AsyncGenerator[dict, None]:
        try:
            # Send initial connection event
            yield {
                "event": "connected",
                "data": json.dumps({"status": "connected", "timestamp": time.time()})
            }

            while True:
                # Wait for events with timeout for heartbeat
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=30)
                    yield {"event": "message", "data": payload}
                except asyncio.TimeoutError:
                    # Send heartbeat to keep connection alive
                    yield {
                        "event": EVENT_HEARTBEAT,
                        "data": json.dumps({"timestamp": time.time()})
                    }
        except asyncio.CancelledError:
            # Client disconnected
            pass
        finally:
            await event_bus.disconnect(queue)

    return EventSourceResponse(event_generator())

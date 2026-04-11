import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_db_and_tables
from app.api import (
    sessions_router,
    services_router,
    bookmarks_router,
    token_usage_router,
    health_router,
    github_router,
    config_router,
    events_router,
    automation_router,
    webhooks_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    print("Database initialized")
    
    # Optionally start Discord bot in background
    if settings.DISCORD_BOT_TOKEN:
        try:
            from app.discord.bot import DiscordBot
            bot = DiscordBot()
            asyncio.create_task(bot.start())
        except Exception as e:
            print(f"Discord bot not started: {e}")
    
    # Start Uptime Kuma sync service
    if settings.UPTIME_KUMA_API_KEY:
        try:
            from app.services.sync import start_sync_service
            await start_sync_service()
        except Exception as e:
            print(f"Sync service not started: {e}")
    
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(
    title="Discboard",
    description="Mission Control for Discord",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(sessions_router)
app.include_router(services_router)
app.include_router(bookmarks_router)
app.include_router(token_usage_router)
app.include_router(github_router)
app.include_router(config_router)
app.include_router(events_router)
app.include_router(automation_router)
app.include_router(webhooks_router)


@app.get("/")
def root():
    return {
        "name": "Discboard",
        "version": "0.1.0",
        "description": "Mission Control for Discord",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
    )
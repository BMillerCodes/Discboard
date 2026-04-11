# Discboard — Mission Control for Discord

## Overview

Discboard is a unified Mission Control platform for Discord that bridges chat sessions, document management, model switching, system monitoring, and homelab service orchestration into a single coherent experience.

**Repository:** https://github.com/BMillerCodes/Discboard

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        DISCORD                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │ Slash Cmds  │  │   Modal     │  │  Embeds     │       │
│   │ /sessions   │  │   Forms     │  │  Status     │       │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
└──────────┼────────────────┼─────────────────┼───────────────┘
           │                │                 │
           ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     DISCORD BOT                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Gateway  │  │  Commands │  │  Events  │  │   SSE    │  │
│  │  Handler  │  │  Parser   │  │  Dispatch │  │  Bridge  │  │
│  └──────┬────┘  └──────┬────┘  └──────┬────┘  └──────┬────┘  │
└─────────┼──────────────┼───────────────┼─────────────┼───────┘
          │              │               │             │
          └──────────────┴───────────────┴─────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
         ┌──────────────────┐  ┌──────────────────┐
         │   REST API       │  │   SSE Stream    │
         │   (FastAPI)      │  │   (WebSocket)   │
         └─────────┬────────┘  └─────────┬────────┘
                   │                      │
                   ▼                      ▼
         ┌─────────────────────────────────────┐
         │         SQLite Database            │
         └─────────────────────────────────────┘
                   │           ▲
                   ▼           │
         ┌──────────────────────────┐
         │     Next.js Dashboard    │
         │     (Mission Control)    │
         └──────────────────────────┘
```

---

## Features

### Tier 1 — Discord Native (MVP)
- [ ] `/sessions` — List active sessions with status embeds
- [ ] `/session switch <id>` — Switch between conversation contexts
- [ ] `/model` — Show current model + switch via dropdown
- [ ] `/status` — Service health embed (Uptime Kuma integration)
- [ ] `/search <query>` — Search vault, GitHub, chat history
- [ ] `/services` — List monitored homelab services
- [ ] `/bookmarks` — List saved links
- [ ] `/bookmark add <url> <label>` — Save a link
- [ ] Session context persistence across threads
- [ ] Model usage tracking + cost display

### Tier 2 — Web Dashboard
- [ ] Real-time session list (SSE)
- [ ] Service health cards with uptime %
- [ ] Unified search (vault + GitHub + history)
- [ ] Model switching UI with cost estimator
- [ ] Bookmark manager with tags
- [ ] GitHub PR/issue widgets

### Tier 3 — Full Mission Control
- [ ] Command palette (Ctrl+K)
- [ ] Role-based views (admin/user)
- [ ] Automation rules (GitHub PR → Discord embed → action)
- [ ] Token budget alerts
- [ ] Webhook management UI

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Discord Bot | discord.py 2.x + Python 3.11 |
| Backend | FastAPI + uvicorn |
| Database | SQLite (via SQLModel/ORM) |
| Real-time | SSE (Server-Sent Events) |
| Frontend | Next.js 14 (App Router) + shadcn/ui |
| Hosting | Docker + Docker Compose |

---

## Data Models

### Session
```
id: UUID (primary key)
discord_channel_id: str
discord_thread_id: str (nullable)
title: str
model: str
created_at: datetime
last_activity: datetime
message_count: int
metadata: JSON
```

### Service (homelab)
```
id: UUID
name: str
type: enum(service_type)
url: str
status: enum(status) — healthy, degraded, down, unknown
uptime_pct: float
last_check: datetime
icon: str
```

### Bookmark
```
id: UUID
url: str
label: str
description: str (nullable)
tags: list[str]
created_at: datetime
```

---

## Environment Variables

```env
# Discord
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_guild_id

# Backend
DATABASE_URL=sqlite:///./discboard.db
API_PORT=8000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Development

```bash
# Backend
cd backend
pip install -e .
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Docker
docker-compose up --build
```

---

## Repository Structure

```
Discboard/
├── SPEC.md
├── README.md
├── docker-compose.yml
├── Dockerfile
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── api/
│   │   ├── discord/
│   │   └── services/
│   └── tests/
└── frontend/
    ├── package.json
    ├── app/
    │   ├── page.tsx
    │   ├── dashboard/
    │   ├── sessions/
    │   ├── services/
    │   └── settings/
    ├── components/
    └── lib/
```
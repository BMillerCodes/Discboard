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
│   │ /sessions   │  │   Forms     │  │  Status    │       │
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
         │   REST API       │  │   SSE Stream     │
         │   (FastAPI)      │  │   (SSE)          │
         └─────────┬────────┘  └─────────┬────────┘
                   │                      │
                   ▼                      ▼
         ┌─────────────────────────────────────┐
         │         SQLite Database             │
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
- [x] `/sessions` — List active sessions with status embeds
- [x] `/session switch <id>` — Switch between conversation contexts
- [x] `/model` — Show current model + switch via dropdown
- [x] `/status` — Service health embed (Uptime Kuma integration)
- [x] `/search <query>` — Search vault, GitHub, chat history
- [x] `/services` — List monitored homelab services
- [x] `/bookmarks` — List saved links
- [x] `/bookmark add <url> <label>` — Save a link
- [x] Session context persistence across threads
- [x] Model usage tracking + cost display

### Tier 2 — Web Dashboard
- [x] Real-time session list (SSE)
- [x] Service health cards with uptime %
- [x] Unified search (vault + GitHub + history)
- [x] Model switching UI with cost estimator
- [x] Bookmark manager with tags
- [x] GitHub PR/issue widgets

### Tier 3 — Full Mission Control
- [x] Command palette (Ctrl+K)
- [x] Role-based views (admin/user)
- [x] Automation rules (GitHub PR → Discord embed → action)
- [x] Token budget alerts
- [x] Webhook management UI

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
status: enum(active, idle, archived)
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

### AutomationRule
```
id: UUID
name: str
trigger_type: str (github_pr, github_issue, service_down, token_budget, discord_interaction)
trigger_config: JSON
action_type: str (discord_embed, discord_message, webhook)
action_config: JSON
enabled: bool
created_at: datetime
```

### WebhookConfig
```
webhook_type: enum(github, discord)
webhook_url: str
events: list[str]
secret_configured: bool
```

---

## Environment Variables

```env
# Discord
DISCORD_BOT_TOKEN=***
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
├── Dockerfile.backend
├── Dockerfile.frontend
├── Dockerfile.bot
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── session.py
│   │   │   ├── service.py
│   │   │   ├── bookmark.py
│   │   │   ├── token_usage.py
│   │   │   ├── automation_rule.py
│   │   │   └── webhook_config.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── health.py
│   │   │   ├── sessions.py
│   │   │   ├── services.py
│   │   │   ├── bookmarks.py
│   │   │   ├── token_usage.py
│   │   │   ├── github.py
│   │   │   ├── config.py
│   │   │   ├── events.py
│   │   │   ├── automation.py
│   │   │   └── webhooks.py
│   │   ├── discord/
│   │   │   ├── __init__.py
│   │   │   ├── bot.py
│   │   │   └── commands.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── uptime_kuma.py
│   │   │   ├── github.py
│   │   │   └── sync.py
│   │   └── automation/
│   │       ├── __init__.py
│   │       └── rules.py
│   └── tests/
│       ├── __init__.py
│       ├── test_api.py
│       └── test_models.py
└── frontend/
    ├── package.json
    ├── app/
    │   ├── page.tsx
    │   ├── layout.tsx
    │   ├── automation/
    │   │   └── page.tsx
    │   ├── webhooks/
    │   │   └── page.tsx
    │   ├── command-palette.tsx
    │   └── lib/
    │       ├── types.ts
    │       └── utils.ts
    └── components/
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/health/ready` | Readiness check |
| GET | `/api/sessions` | List sessions |
| POST | `/api/sessions` | Create session |
| GET | `/api/sessions/{id}` | Get session by ID |
| PATCH | `/api/sessions/{id}` | Update session |
| DELETE | `/api/sessions/{id}` | Delete session |
| POST | `/api/sessions/{id}/activity` | Record activity |
| GET | `/api/services` | List services |
| POST | `/api/services` | Add service |
| POST | `/api/services/{id}/check` | Health check |
| GET | `/api/bookmarks` | List bookmarks |
| POST | `/api/bookmarks` | Create bookmark |
| PATCH | `/api/bookmarks/{id}` | Update bookmark |
| DELETE | `/api/bookmarks/{id}` | Delete bookmark |
| GET | `/api/token-usage/summary` | Usage summary |
| GET | `/api/automation/rules` | List automation rules |
| POST | `/api/automation/rules` | Create automation rule |
| POST | `/api/automation/rules/{id}/toggle` | Toggle rule |
| POST | `/api/automation/rules/{id}/test` | Test rule |
| DELETE | `/api/automation/rules/{id}` | Delete rule |
| POST | `/api/webhooks/github` | GitHub webhook receiver |
| GET | `/api/webhooks/github/config` | GitHub webhook config |
| POST | `/api/webhooks/discord` | Discord webhook receiver |
| GET | `/api/webhooks/discord/config` | Discord webhook config |

---

## Frontend Pages

- `/` — Main dashboard with sessions, services, bookmarks overview
- `/automation` — Automation rules management
- `/webhooks` — Webhook configuration and testing
- `/settings` — Application settings
- Command Palette (Ctrl+K) — Quick search across all resources

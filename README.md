# Discboard — Mission Control for Discord

**Repository:** https://github.com/BMillerCodes/Discboard

A unified Mission Control platform for Discord that bridges chat sessions, document management, model switching, system monitoring, and homelab service orchestration into a single coherent experience.

![Discboard](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-green.svg)
![Next.js](https://img.shields.io/badge/next.js-14-black.svg)

---

## 🎯 Features

### Tier 1 — Discord Native (MVP)
- `/sessions` — List active sessions with status embeds
- `/session switch <id>` — Switch between conversation contexts
- `/model` — Show current model + switch via dropdown
- `/status` — Service health embed (Uptime Kuma integration)
- `/search <query>` — Search vault, GitHub, chat history
- `/services` — List monitored homelab services
- `/bookmarks` — List saved links
- `/bookmark add <url> <label>` — Save a link

### Tier 2 — Web Dashboard
- Real-time session list (SSE)
- Service health cards with uptime %
- Unified search (vault + GitHub + history)
- Model switching UI with cost estimator
- Bookmark manager with tags
- GitHub PR/issue widgets

### Tier 3 — Full Mission Control
- **Command palette (Ctrl+K)** — Quick search across sessions, bookmarks, services, and GitHub repos
- **Role-based views (admin/user)**
- **Automation rules** — GitHub PR → Discord embed → action workflow automation
- **Token budget alerts** — Track and limit AI spending
- **Webhook management UI** — Configure GitHub and Discord webhooks

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        DISCORD                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │ Slash Cmds  │  │   Modal     │  │  Embeds     │       │
│   │ /sessions   │  │   Forms     │  │  Status    │       │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
└──────────┼────────────────┼─────────────────┼───────────────┘
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
         │     (Mission Control)     │
         └──────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional)

### 1. Clone the repository

```bash
git clone https://github.com/BMillerCodes/Discboard.git
cd Discboard
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your tokens
```

Required environment variables:
- `DISCORD_BOT_TOKEN` — Your Discord bot token
- `DISCORD_GUILD_ID` — Your server ID
- `UPTIME_KUMA_API_KEY` — Optional, for service monitoring
- `GITHUB_TOKEN` — Optional, for GitHub integration

### 3. Run with Docker

```bash
docker-compose up --build
```

### 4. Or run locally

**Backend:**
```bash
cd backend
pip install -e .
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
Discboard/
├── SPEC.md                    # Full specification
├── README.md                  # This file
├── docker-compose.yml         # Docker orchestration
├── Dockerfile.backend
├── Dockerfile.frontend
├── Dockerfile.bot
├── backend/
│   ├── pyproject.toml
│   └── app/
│       ├── main.py           # FastAPI app
│       ├── config.py         # Settings
│       ├── database.py       # SQLite setup
│       ├── models/           # SQLModel models
│       ├── api/              # REST endpoints
│       ├── discord/          # Bot commands
│       ├── services/         # Uptime Kuma, GitHub clients
│       ├── automation/       # Automation rules engine
│       └── tests/            # Unit tests
└── frontend/
    ├── package.json
    └── app/
        ├── page.tsx         # Dashboard
        ├── automation/       # Automation rules UI
        ├── webhooks/         # Webhook management UI
        ├── command-palette.tsx  # Ctrl+K command palette
        └── lib/             # API client, types
```

---

## 🔌 API Endpoints

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
| GET | `/api/events/stream` | SSE real-time events stream |

---

## 🧪 Development

```bash
# Backend tests
cd backend && pytest

# Frontend build
cd frontend && npm run build

# Lint
cd frontend && npm run lint
```

---

## 📜 License

MIT © BMillerCodes

---

Built with ❤️ for Discord power users

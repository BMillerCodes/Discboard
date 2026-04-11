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

### Tier 3 — Full Mission Control
- Command palette (Ctrl+K)
- Role-based views (admin/user)
- Automation rules (GitHub PR → Discord embed → action)
- Token budget alerts

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        DISCORD                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │ Slash Cmds  │  │   Modal     │  │  Embeds     │       │
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
         │   (FastAPI)      │  │   (WebSocket)    │
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
├── backend/
│   ├── pyproject.toml
│   └── app/
│       ├── main.py           # FastAPI app
│       ├── config.py         # Settings
│       ├── database.py       # SQLite setup
│       ├── models/           # SQLModel models
│       ├── api/              # REST endpoints
│       ├── discord/          # Bot commands
│       └── services/         # Uptime Kuma, GitHub clients
└── frontend/
    ├── package.json
    └── app/
        ├── page.tsx         # Dashboard
        └── lib/             # API client, types
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/sessions` | List sessions |
| POST | `/api/sessions` | Create session |
| PATCH | `/api/sessions/{id}` | Update session |
| DELETE | `/api/sessions/{id}` | Delete session |
| GET | `/api/services` | List services |
| POST | `/api/services` | Add service |
| POST | `/api/services/{id}/check` | Health check |
| GET | `/api/bookmarks` | List bookmarks |
| POST | `/api/bookmarks` | Create bookmark |
| GET | `/api/token-usage/summary` | Usage summary |

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
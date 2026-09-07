# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Khidmat AI** (a.k.a. BazaarAI) — a multi-agent AI pipeline that books home services (AC repair, plumbing,
electrician, etc.) in Pakistan from a single free-text message in Urdu, Roman Urdu, or English. Built for the
Google AI Hackathon 2026. There is **no single app** here — it's three independently-run services plus a mobile
client, all pointed at the same `data/providers.json`.

## Architecture: two parallel orchestrators, one mobile client

The same conceptual pipeline (parse intent → find providers → rank → price/book → notify) is implemented
**twice**, independently, in two languages. The mobile app calls both and prefers whichever responds.

1. **Python backend** (`python-agents/`) — canonical/primary implementation, Gemini-powered.
   - Entry point: `python-agents/main.py` (FastAPI, port 8000, docs at `/docs`).
   - Pipeline in `python-agents/agents/orchestrator.py`: Intent → Discovery → Ranking → Booking → Followup
     (5 agents), each in its own file under `python-agents/agents/`.
   - Bookings persisted to `python-agents/data/bookings.json`; reasoning trace appended to
     `python-agents/agents/logs/agent_trace.jsonl` (read via `GET /api/trace`).
   - Reads shared provider data from the repo-root `data/providers.json`.

2. **Node.js backend** (`agents/` + `backend/`) — fallback implementation, more elaborate/simulated.
   - Entry point: `backend/server.js` (Express, port 3000).
   - Pipeline in `agents/orchestrator.js`: Intent → Context → Complexity → Discovery → Matching →
     SmartDecision → Pricing → Scheduling → Booking → Notification → LiveSimulation → Feedback →
     (Dispute/Fallback as needed) — 15 numbered agent modules (`agents/01_intentAgent.js` … `15_loggingAgent.js`).
   - Also injects a random 20% "provider cancelled, auto-rebook" failure simulation on every booking
     (see `orchestrate()` in `agents/orchestrator.js`) — this is intentional demo behavior, not a bug.
   - Bookings persisted to `logs/bookings_db.json`.
   - This is the service actually containerized by the root `Dockerfile` / `deploy-cloud-run.bat` (Cloud Run).

3. **Mobile app** (`mobile-app/`) — Expo/React Native client, the primary UI.
   - `mobile-app/src/services/api.js` calls the **Python API first**, and falls back to the **Node API** only
     if Python is unreachable (`submitRequest`, `getProviders`, `getAllBookings`, etc. all follow this pattern).
   - Both backend base URLs are configured via `EXPO_PUBLIC_PYTHON_API_URL` / `EXPO_PUBLIC_NODE_API_URL` in
     `mobile-app/.env` — must point at your dev machine's LAN IP (not `localhost`) since Expo Go runs on a phone.
   - Screens under `mobile-app/src/screens/`; the `AgentTraceScreen.js` is a dev-mode view of the raw
     `agent_trace.jsonl` reasoning log described above.

**Implication for changes:** a feature request usually needs to be implemented in *both* orchestrators (Python
and Node) to actually show up end-to-end in the app, since the client silently falls back between them. When
asked to "fix the pipeline" or "add an agent step," check whether the ask applies to one backend or both.

## Other directories — not part of the active app

- `khidmat-ai-hackathon/` and `informal-economy-orchestrator/` are earlier/alternate prototypes (Flutter mobile
  in the former; a separate Expo Router app in the latter) tracked in git but superseded by the top-level
  `agents/` / `python-agents/` / `backend/` / `mobile-app/` structure described in the root `README.md`. Don't
  assume changes to the active app need mirroring there. `informal-economy-orchestrator/` has its own
  `CLAUDE.md`/`AGENTS.md` (points at versioned Expo SDK 54 docs) that applies only within that subtree.
- `firebase/`, `docs/`, `logs/` — auxiliary/generated; `logs/` and `python-agents/logs/` are gitignored runtime
  output, not source.

## Running the app

```bash
# Windows one-click launcher — starts Python API, Node API, and Expo in separate terminals
start-all.bat
```

Or individually:
```bash
python python-agents/main.py        # FastAPI on :8000 (docs: /docs, health: /health)
cd backend && npm start             # Express on :3000 (health: /api/health), npm run dev for nodemon
cd mobile-app && npx expo start --clear
```

Setup: copy `backend/.env.example` → `backend/.env` and create `mobile-app/.env` with
`EXPO_PUBLIC_PYTHON_API_URL` / `EXPO_PUBLIC_NODE_API_URL` pointing at your machine's LAN IP (phone and PC must
share WiFi to use Expo Go). Python deps: `pip install -r python-agents/requirements.txt`. Node deps: `npm install`
in both `backend/` and `mobile-app/`.

There are no automated tests, linters, or CI configured in this repo — verify changes by hitting the REST APIs
directly (see below) or running the Expo app.

## Manually exercising the pipeline

```bash
# Python (primary)
curl -X POST http://localhost:8000/api/request -H "Content-Type: application/json" \
  --data-binary '{"text": "plumber chahiye F-10 aaj pipe leak hai"}'

# Node (fallback)
curl -X POST http://localhost:3000/api/request -H "Content-Type: application/json" \
  --data-binary '{"text": "plumber chahiye F-10 aaj pipe leak hai"}'
```

Useful demo/debug endpoints on both backends: `POST /api/demo/cancel-rebook` (forces the auto-reroute path),
`POST /api/dispute` (dispute resolution), and Python's `GET /api/trace` (raw agent reasoning log). See the root
`README.md` for the full API reference table.

## Data

`data/providers.json` (repo root) is the single shared source of truth for service providers — 35 providers
across 17 categories — read by both backends. Bookings are *not* shared: each backend keeps its own booking
store (`python-agents/data/bookings.json` vs `logs/bookings_db.json`).

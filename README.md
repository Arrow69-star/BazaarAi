# 🤝 Khidmat AI — Autonomous Service Orchestrator

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-006D77?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Android%20|%20iOS-83C5BE?style=for-the-badge&logo=expo)
![Backend](https://img.shields.io/badge/backend-Python%20FastAPI%20+%20Node.js-F4A261?style=for-the-badge)
![AI](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-4285F4?style=for-the-badge&logo=google)
![License](https://img.shields.io/badge/license-MIT-3FB950?style=for-the-badge)
![Hackathon](https://img.shields.io/badge/Google%20AI%20Hackathon-2026-E53E3E?style=for-the-badge&logo=google)

**A 5-agent AI pipeline that books home services in Pakistan — in Urdu, Roman Urdu, or English.**

[📱 Download APK](#-download-apk) · [🚀 Quick Start](#-quick-start) · [🤖 Agent Pipeline](#-agent-pipeline) · [🎥 Demo](#-demo)

</div>

---

## ✨ What is Khidmat AI?

Khidmat AI is an **autonomous multi-agent orchestration system** that lets Pakistani users book home services (AC repair, plumbing, electricians, etc.) simply by typing or speaking in their native language.

The user says: **"AC bilkul kaam nahi kar raha, G-13 mein kal subah chahiye"**

The system:
1. 🧠 **Understands** the request (Urdu/Roman Urdu/English NLP)
2. 🔍 **Discovers** matching providers within 10km
3. 📊 **Ranks** them using 8 trust factors
4. 💰 **Calculates** a transparent price
5. 📅 **Books** the slot and sends notifications

All in **under 2 seconds**.

---

## 📱 Download APK

> **[⬇️ Direct Download: Khidmat AI v1.0.0 APK](https://expo.dev/artifacts/eas/ahyC5zagjHnZsN4PA7743P.apk)**  
> **[📋 Monitor EAS Build Details](https://expo.dev/accounts/ayyan234/projects/bazaarai/builds/4b324097-7fec-497f-95ba-8c82c52165df)**  
> Compatible with Android 9+ (API 28+)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Expo Go app (for mobile testing)

### 1. Clone & Install
```bash
git clone https://github.com/Arrow69-star/BazaarAi.git
cd BazaarAi
```

### 2. Configure Environment
```bash
# Copy and fill in your keys
cp mobile-app/.env.example mobile-app/.env
cp backend/.env.example backend/.env
```

Key variables in `mobile-app/.env`:
```
EXPO_PUBLIC_PYTHON_API_URL=http://YOUR_IP:8000
EXPO_PUBLIC_NODE_API_URL=http://YOUR_IP:3000
```

### 3. Start Everything
```bash
# Windows — double-click or run:
start-all.bat
```

Or manually:
```bash
# Terminal 1 — Python AI Backend
python python-agents/main.py

# Terminal 2 — Node.js Backend
cd backend && npm start

# Terminal 3 — Mobile App
cd mobile-app && npx expo start --clear
```

### 4. Open on Phone
- Install **Expo Go** from Play Store
- Scan the QR code
- Phone and PC must be on the **same WiFi**

---

## 🤖 Agent Pipeline

```
User Input
    │
    ▼
┌─────────────────┐
│  Intent Agent   │ ← Gemini 2.0 Flash / keyword fallback
│ (NLP + Urdu)    │   Extracts: service, location, urgency
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│ Discovery Agent │ ← Searches 35 verified providers
│ (Geo-filtered)  │   Radius: 10km, live availability
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│ Ranking Agent   │ ← 8-factor scoring algorithm:
│ (Trust Score)   │   Rating, Distance, Reliability,
│                 │   Availability, Price, Specialization,
│                 │   Cancellation Rate, User Preference
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│ Pricing Agent   │ ← Base fee + Distance + Urgency
│ (Transparent)   │   + Surge + Complexity → PKR range
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│ Booking Agent   │ ← Confirms slot, generates receipt
│ + Followup      │   Schedules 4 notification events
└─────────────────┘
```

---

## 📁 Project Structure

```
BazaarAi/
├── agents/              # 15 Node.js agent modules
│   ├── orchestrator.js  # Master pipeline controller
│   ├── 01_intentAgent.js
│   └── ... (15 agents total)
├── python-agents/       # Python FastAPI backend
│   ├── main.py          # FastAPI app (port 8000)
│   └── agents/          # Python orchestrator
├── backend/             # Node.js Express backend (port 3000)
│   └── server.js        # API routes
├── mobile-app/          # Expo React Native app
│   ├── App.js           # Root with ThemeProvider + Drawer
│   └── src/
│       ├── screens/     # 8 screens
│       ├── components/  # Reusable UI components
│       ├── theme/       # Dark/light theme system
│       └── services/    # API + Firebase services
├── data/
│   └── providers.json   # 35 providers, 17 service categories
└── start-all.bat        # One-click launcher (Windows)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **AI Models** | Gemini 2.0 Flash Lite (NLP), Gemini 2.0 Flash (fallback) |
| **Python API** | FastAPI + uvicorn (port 8000) |
| **Node.js API** | Express.js (port 3000) |
| **Mobile App** | React Native + Expo SDK 51 |
| **Navigation** | React Navigation v6 (Drawer + Stack + Tabs) |
| **Animations** | React Native Animated + Reanimated 3 |
| **Database** | Firebase Firestore (bookings) + local JSON |
| **Cloud** | GCP Project `ai-hackathon-496717` |

---

## 🧪 API Reference

### Python Backend (port 8000)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health check |
| POST | `/api/request` | Full 5-agent pipeline |
| GET | `/api/providers` | List all providers |
| GET | `/api/bookings` | All bookings |
| POST | `/api/dispute` | File a dispute |
| GET | `/api/trace` | Agent execution trace |

### Node.js Backend (port 3000)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Service health check |
| POST | `/api/request` | 15-agent Node pipeline |
| GET | `/api/bookings` | All bookings |
| POST | `/api/dispute` | Dispute resolution |

---

## 🎥 Demo

### Test the API directly
```bash
# Make a service request
curl -X POST http://localhost:8000/api/request \
  -H "Content-Type: application/json" \
  --data-binary '{"text": "plumber chahiye F-10 aaj pipe leak hai"}'
```

### Demo Scenarios
1. **Normal booking** — `"AC technician G-13 kal subah"`
2. **Urgent request** — `"bijli band hai abhi electrician chahiye"`
3. **Budget conscious** — `"sasta plumber chahiye I-8"`
4. **Low confidence** — `"koi banda chahiye"` → triggers clarification
5. **Cancellation rebook** — POST `/api/demo/cancel-rebook`

---

## 👥 Team

Built for the **Google AI Hackathon 2026** — Islamabad, Pakistan

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

# 🧠 BazaarAI — Autonomous Service Orchestration System

> **"This is not a booking app — it's an autonomous service orchestration system."**

Built with **Google Antigravity** | Multi-Agent Architecture | Urdu / Roman Urdu / English

---

## 🏗️ Architecture

```
User Input (Urdu/Roman Urdu/English)
          │
          ▼
┌─────────────────────────────────────┐
│        BazaarAI Orchestrator        │
│   (agents/orchestrator.js)          │
└─────────────────────────────────────┘
          │
    ┌─────┴──────────────────────────────────────────┐
    │                  15 AGENTS                      │
    │                                                 │
    │  01 IntentAgent          →  Extract intent      │
    │  02 ContextAgent         →  Enrich location     │
    │  03 ComplexityClassifier →  Basic/Inter/Complex │
    │  04 ProviderDiscovery    →  Find providers       │
    │  05 MatchingEngine       →  Score & rank        │
    │  06 SmartDecisionAgent   →  WHY this provider   │
    │  07 PricingAgent         →  Dynamic pricing     │
    │  08 SchedulingAgent      →  No double booking   │
    │  09 BookingAgent         →  Confirm & receipt   │
    │  10 NotificationAgent    →  SMS/Push sim        │
    │  11 LiveSimulation       →  Track lifecycle     │
    │  12 FeedbackAgent        →  Rating & review     │
    │  13 DisputeAgent         →  🔥 Auto-rebooking   │
    │  14 FallbackAgent        →  Edge case handling  │
    │  15 LoggingAgent         →  Full trace logs     │
    └─────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐    ┌──────────────────────┐
│  Express.js Backend │    │  React Native Expo   │
│  (backend/server.js)│◄───│  (mobile-app/)       │
└─────────────────────┘    └──────────────────────┘
          │
          ▼
┌─────────────────────┐
│  Firebase Firestore │  (or local JSON fallback)
│  bookings/          │
│  providers/         │
│  logs/              │
└─────────────────────┘
```

---

## 🚀 Quick Start

### 1. Backend
```bash
cd backend
npm install
node server.js
# API running at http://localhost:3000
```

### 2. Mobile App
```bash
cd mobile-app
npm install
npx expo start
# Scan QR with Expo Go app on your phone
```

### 3. Test the Full Pipeline
```bash
curl -X POST http://localhost:3000/api/request \
  -H "Content-Type: application/json" \
  -d '{"text": "Mujhe kal subah G-13 mein AC technician chahiye, budget kam hai"}'
```

---

## 🎥 Demo Script (Winning Flow)

**Input:** `"Mujhe kal subah G-13 mein AC technician chahiye, budget kam hai"`

| Step | Agent | Output |
|------|-------|--------|
| 1 | IntentAgent | service=AC Repair, location=G-13, time=tomorrow 09:00, budget=LOW, confidence=91% |
| 2 | ContextAgent | demand=HIGH (summer), surge=1.4x, traffic=NORMAL |
| 3 | ComplexityClassifier | level=basic, duration=60min, multiplier=1.0x |
| 4 | ProviderDiscovery | 8 AC providers found within 15km |
| 5 | MatchingEngine | Top 3 ranked by 7-factor weighted score |
| 6 | SmartDecision | Selected ColdBreeze (1.1km) OVER Ali AC (0.5km) — better reliability |
| 7 | PricingAgent | Base 1100 + Distance 17 + Surge 165 - Discount 128 = **PKR 1,154** |
| 8 | SchedulingAgent | Slot 09:00-11:00 confirmed, no conflict |
| 9 | BookingAgent | ID: BAZ-XXXXX-YYY, saved to Firestore |
| 10 | NotificationAgent | SMS confirmed, reminder scheduled for 08:00 |
| 11 | LiveSimulation | 5 lifecycle stages generated |

---

## 🎯 Matching Engine — Weighted Scoring

```
score =
  (distance × 0.20)         // Closer = better, but NOT always winner
+ (availability × 0.20)     // Open at requested time
+ (rating × 0.15)           // Customer reviews
+ (reliability × 0.15)      // Past success rate
+ (specialization × 0.10)   // Exact skill match
+ (price_fit × 0.10)        // Budget sensitivity
+ (low_cancellation × 0.10) // Provider dependability
```

**Key Point for Judges:** The system selects `ColdBreeze AC Experts` (1.1km, score=0.93) over `Ali AC Services` (0.5km, score=0.84) because reliability and cancellation risk matter more than mere proximity.

---

## 💰 Dynamic Pricing Formula

```
total = base_fee
      + (distance_km × PKR 15)
      + urgency_fee (PKR 300 if urgent)
      + (base × (complexity_multiplier - 1))
      + (subtotal × (surge_rate - 1))
      - (subtotal × discount_rate)
```

---

## 🔥 Edge Cases Demonstrated

| Case | Trigger | Resolution |
|------|---------|------------|
| **Provider Cancels** | `simulate_cancellation: true` | Auto-rebook to runner-up in <2 min |
| **Price Dispute** | `simulate_price_dispute: true` | 15% discount OR budget alternative |
| **No Providers** | Area with zero providers | Expand radius + suggest nearby sectors |
| **Unclear Input** | confidence < 80% | Bilingual clarification questions |
| **API Failure** | Backend offline | Demo mode with cached data |

---

## 📱 Mobile App Screens

| Screen | Purpose |
|--------|---------|
| **Home** | Multilingual input, example prompts, edge case demos |
| **Processing** 🔥 | Live agent pipeline — THE WINNING SCREEN |
| **Results** | 4-tab: Intent / Providers / Pricing / Decision |
| **Booking** | Receipt, notifications, dispute buttons |
| **Tracking** | Timeline, map, dispute resolution |
| **Feedback** | 5-star rating, Urdu/English review |

---

## 📊 Antigravity Log Format

```json
{
  "session_id": "session_abc123",
  "plan": "Intent → Context → Complexity → Discovery → Matching → ...",
  "agents_used": [
    { "name": "IntentAgent", "started_at": "...", "completed_at": "..." }
  ],
  "reasoning_steps": [...],
  "ranking_logic": [{ "providers_evaluated": 8, "scores": [...] }],
  "tool_calls": [...],
  "decisions": [...],
  "errors": [],
  "fallback_used": false,
  "final_decision": "Booking BAZ-XXXXX confirmed for ColdBreeze AC Experts at PKR 1154",
  "booking_status": "confirmed"
}
```

Download all logs as ZIP: `GET /api/logs/export/zip`

---

## 📁 Project Structure

```
AI HACKATHON/
├── agents/          15 agent modules + orchestrator
├── backend/         Express.js API + Firebase
├── data/            22 mock providers (Islamabad/Rawalpindi)
├── logs/            Per-session JSON logs + bookings DB
├── mobile-app/      React Native Expo (6 screens)
└── docs/            README + Architecture
```

---

## 🛠️ API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/request` | Full 15-agent pipeline |
| GET | `/api/providers?service=AC Repair` | Provider list with filters |
| GET | `/api/bookings/:id` | Booking details |
| POST | `/api/dispute` | File a dispute |
| GET | `/api/logs/:sessionId` | Session trace log |
| GET | `/api/logs/export/zip` | Download all logs as ZIP |
| POST | `/api/demo/cancel-rebook` | Demo: cancel & auto-rebook |
| POST | `/api/demo/price-dispute` | Demo: price dispute flow |

---

*Built for Google Antigravity AI Hackathon 2026 🏆*

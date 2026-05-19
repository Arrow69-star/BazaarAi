# BazaarAI: AI Service Orchestrator for the Informal Economy 🚀

BazaarAI is an autonomous, agentic orchestrator designed to digitize the informal service economy (plumbers, electricians, AC technicians) in Pakistan. It converts noisy, multilingual voice/text queries into matched, priced, and confirmed service bookings in under 5 seconds.

## ✨ Core Features
- **Multilingual NLP**: Understands Roman Urdu, Urdu, and English (e.g., *"AC bilkul kaam nahi kar raha kal subah k lye banda chahiye"*).
- **6-Factor AI Ranking**: Provider matching based on distance, rating, cancellation history, workload, recency, and on-time score.
- **Dynamic Pricing Engine**: Automated quotes adjusting for urgency, complexity, budget limits, and haversine distance.
- **Auto-Rebooking (Fallback)**: If a provider cancels, the system automatically re-routes the job to the next best match instantly.
- **Dispute Resolution**: Automated state machine handling "No Shows" or "Price Disagreements" with compensation logic.

## 🛠 Tech Stack
- **Frontend**: React Native Expo (Web/Mobile) with Expo Router
- **Backend/AI**: Google Gemini 1.5 Flash (via `@google/generative-ai`)
- **Database**: Supabase (PostgreSQL, Realtime, RLS)
- **Deployment**: Google Cloud Run & Cloud Storage

## 🚀 How to Run the App
1. **Start the Expo Server**:
   ```bash
   cd informal-economy-orchestrator
   npx expo start --web
   ```
2. **Access the Web Interface**: Press `w` in the terminal to open the web view, or visit `http://localhost:8081` or `http://localhost:8082`.

## 🧑‍⚖️ Judge Stress-Test Guide
Once the app is running, navigate to the **Orchestrator Studio (Chat)** to test the Antigravity engine:
1. **Standard Flow**: Click any "Quick Input" chip and watch the 5 agents log their execution traces in real-time.
2. **"Why Not Other Providers?"**: Go to the **Providers** tab to see explainable AI decisions on rejected candidates.
3. **Cancellation Simulation**: Click the **⚡ Auto-Reroute** button. This mimics a provider rejecting the job, forcing the orchestrator to instantly find a backup.
4. **Dispute Handling**: Click the **⚖️ Dispute** button to trigger the automated compensation engine.

const express = require('express');
const cors = require('cors');
const { Anthropic } = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());


const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || 'dummy_key',
});


const providersDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/providers.json'), 'utf8'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'KHIDMAT AI Orchestrator' });
});


app.post('/parse-intent', async (req, res) => {
  const { text, session_id } = req.body;
  
  
  
  const lowerText = text.toLowerCase();
  
  let service_type = "Unknown";
  if(lowerText.includes("ac")) service_type = "AC Technician";
  if(lowerText.includes("plumb") || lowerText.includes("pipe") || lowerText.includes("pani")) service_type = "Plumber";
  if(lowerText.includes("bijli") || lowerText.includes("electric")) service_type = "Electrician";
  if(lowerText.includes("tutor") || lowerText.includes("math")) service_type = "Tutor (Math/Science)";
  
  let location = "Islamabad";
  if(lowerText.includes("g-13") || lowerText.includes("g 13")) location = "G-13, Islamabad";
  if(lowerText.includes("f-7") || lowerText.includes("f 7")) location = "F-7, Islamabad";
  
  let urgency = "medium";
  if(lowerText.includes("urgent") || lowerText.includes("foran") || lowerText.includes("abhi")) urgency = "emergency";
  
  let confidence = service_type !== "Unknown" ? 0.85 : 0.40;
  
  const intentObj = {
    service_type,
    location,
    time_preference: lowerText.includes("kal") ? "tomorrow" : "asap",
    urgency_level: urgency,
    budget_sensitivity: lowerText.includes("sasta") || lowerText.includes("cheap") ? "high" : "medium",
    language_detected: "mixed",
    confidence_score: confidence,
    clarification_needed: confidence < 0.75,
    clarification_question: confidence < 0.75 ? "Kaunsi service chahiye? AC, plumber, electrician, ya koi aur?" : null,
    raw_input: text
  };

  res.json({ intent: intentObj });
});


app.post('/match-providers', async (req, res) => {
  const { intent } = req.body;
  
  
  let candidates = providersDb.filter(p => p.service_types.includes(intent.service_type));
  if(candidates.length === 0) {
    return res.json({ providers: [], message: "No providers found for this service." });
  }

  
  const ranked = candidates.map(p => {
    
    let distKm = p.location === intent.location ? 0.5 : 3.5;
    let distScore = Math.max(0, 20 - (distKm * 2));
    
    let availScore = p.capacity_today > 0 ? 20 : 0;
    let ratingScore = (p.rating / 5.0) * 15;
    let onTimeScore = p.on_time_score * 15;
    let specScore = 10; 
    let priceScore = intent.budget_sensitivity === 'high' ? (3000 - p.base_rate_pkr)/200 : 8;
    let cancelScore = (1 - p.cancellation_rate) * 5;
    let prefScore = 2;

    let total = distScore + availScore + ratingScore + onTimeScore + specScore + priceScore + cancelScore + prefScore;

    let reasoning = `Ranked with score ${total.toFixed(1)}/100. `;
    if(p.capacity_today === 0) reasoning += `WARNING: Capacity is 0. `;
    if(p.cancellation_rate > 0.3) reasoning += `HIGH RISK: Cancellation rate is ${(p.cancellation_rate*100).toFixed(0)}%. `;

    return {
      ...p,
      distance_km: distKm,
      match_score: total,
      reasoning
    };
  }).sort((a,b) => b.match_score - a.match_score);

  
  res.json({ ranked_list: ranked.slice(0,3) });
});


app.post('/generate-quote', async (req, res) => {
  const { provider, intent } = req.body;
  
  const base_fee = provider.base_rate_pkr;
  const distance_fee = provider.distance_km * 15;
  const urgency_multi = intent.urgency_level === 'emergency' ? 1.6 : (intent.urgency_level === 'high' ? 1.3 : 1.0);
  const surge = 1.0; 
  const total = Math.round((base_fee + distance_fee) * urgency_multi * surge);
  
  res.json({
    quote: {
      base_fee,
      distance_fee,
      urgency_adjustment: Math.round(base_fee * (urgency_multi - 1)),
      complexity_adjustment: 0,
      surge_fee: 0,
      loyalty_discount: 0,
      total_estimate_pkr: total,
      quote_range: { min: Math.round(total * 0.9), max: Math.round(total * 1.1) },
      budget_alternative: null,
      breakdown_text: `Total PKR ${total} (Base: ${base_fee}, Distance: ${distance_fee}, Urgency Multiplier: ${urgency_multi}x)`
    }
  });
});


app.post('/create-booking', async (req, res) => {
  const { provider_id, slot, intent, quote } = req.body;
  
  const booking_id = 'KHIDMAT-' + Math.random().toString(36).substring(2,10).toUpperCase();
  
  res.json({
    booking: {
      booking_id,
      status: "confirmed",
      provider_id,
      slot_datetime: slot,
      price_quote: quote.total_estimate_pkr,
      receipt_text: `RECEIPT: Booking ${booking_id} confirmed for ${intent.service_type} at ${slot}. Total: PKR ${quote.total_estimate_pkr}.`
    }
  });
});


app.post('/orchestrate', async (req, res) => {
  const { user_input, session_id } = req.body;
  const logs = [];
  
  const logStep = (agent, action, output) => {
    logs.push({ agent, action, output, timestamp: new Date().toISOString() });
  };
  
  
  logStep('INTENT_AGENT', 'parse_input', { raw: user_input });
  const intentRes = await fetch(`http://localhost:${PORT}/parse-intent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: user_input, session_id })
  }).then(r => r.json());
  
  const intent = intentRes.intent;
  logStep('INTENT_AGENT', 'parsed', intent);

  if (intent.clarification_needed) {
    return res.json({ success: false, mode: 'CLARIFY', message: intent.clarification_question, logs });
  }

  
  logStep('MATCHING_AGENT', 'find_and_rank', { service: intent.service_type });
  const matchRes = await fetch(`http://localhost:${PORT}/match-providers`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent })
  }).then(r => r.json());
  
  const ranked = matchRes.ranked_list;
  logStep('MATCHING_AGENT', 'ranked', { count: ranked.length, top: ranked[0]?.name });
  
  if (ranked.length === 0) {
    return res.json({ success: false, mode: 'NO_PROVIDERS', message: 'No providers available.', logs });
  }

  
  const topProvider = ranked[0];
  logStep('PRICING_AGENT', 'generate_quote', { provider: topProvider.name });
  const priceRes = await fetch(`http://localhost:${PORT}/generate-quote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: topProvider, intent })
  }).then(r => r.json());
  
  const quote = priceRes.quote;
  logStep('PRICING_AGENT', 'quote_generated', quote);

  
  logStep('BOOKING_AGENT', 'create_booking', { slot: topProvider.availability_slots[0] || "ASAP" });
  const bookRes = await fetch(`http://localhost:${PORT}/create-booking`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider_id: topProvider.provider_id, slot: topProvider.availability_slots[0] || "ASAP", intent, quote })
  }).then(r => r.json());
  
  const booking = bookRes.booking;
  logStep('BOOKING_AGENT', 'confirmed', booking);

  res.json({
    success: true,
    booking,
    intent,
    provider: topProvider,
    quote,
    logs
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`KHIDMAT AI Backend running on port ${PORT}`);
});

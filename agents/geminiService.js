/**
 * BazaarAI — Gemini AI Service
 * Powers real NLP for intent extraction, decision explanation, and dispute resolution
 * Falls back to keyword-based logic if API key not set
 */

const path = require('path');

// Resolve from backend/node_modules since that's where it's installed
let GoogleGenerativeAI;
try {
  const backendPath = path.join(__dirname, '..', 'backend', 'node_modules', '@google', 'generative-ai');
  GoogleGenerativeAI = require(backendPath).GoogleGenerativeAI;
} catch (e) {
  try {
    GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
  } catch (e2) {
    GoogleGenerativeAI = null;
  }
}


const API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;
let model = null;

if (GoogleGenerativeAI && API_KEY && API_KEY !== 'your_gemini_api_key_here') {
  genAI = new GoogleGenerativeAI(API_KEY);
  // Try gemini-1.5-flash first, fall back to gemini-pro
  model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
  console.log('[Gemini] ✅ Connected — using real AI (gemini-1.5-flash-latest)');
} else {
  console.log('[Gemini] ⚠️  No API key — using keyword fallback');
}

/**
 * Extract structured intent from multilingual text using Gemini
 */
async function geminiExtractIntent(rawText) {
  if (!model) return null;

  const prompt = `You are an AI assistant for a Pakistani service marketplace called BazaarAI.

Analyze this service request and extract structured information. The input may be in Urdu, Roman Urdu, English, or mixed.

Input: "${rawText}"

Return ONLY valid JSON (no markdown, no explanation):
{
  "service_type": "string (e.g. AC Repair, Plumber, Electrician, Carpenter, Painter, Cleaner)",
  "issue_description": "string (brief description of the problem)",
  "location": "string (area/sector/city if mentioned, e.g. G-13, F-10, Islamabad)",
  "time_preference": "string (when they want service, e.g. tomorrow morning, today, urgent)",
  "urgency": "URGENT or NORMAL",
  "budget_sensitivity": "LOW or MEDIUM or HIGH (LOW means wants cheap, HIGH means willing to pay more)",
  "language_detected": "urdu or roman_urdu or english or mixed",
  "keywords_detected": ["list", "of", "key", "words"],
  "confidence_score": 0.0 to 1.0,
  "needs_clarification": true or false,
  "clarification_question": "string if needs_clarification is true, else null"
}

Pakistani context clues:
- "kal" = tomorrow, "aaj" = today, "abhi" = right now, "subah" = morning, "shaam" = evening
- "sasta" = cheap, "budget kam" = low budget, "best" = quality preferred
- "jaldi" = urgent/fast, "urgent" = urgent
- "G-13", "F-10", "I-8" etc = Islamabad sectors
- "Bahria", "DHA" = housing societies`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Remove markdown code blocks if present
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[Gemini] Intent extraction error:', err.message);
    return null;
  }
}

/**
 * Generate human-readable explanation for provider selection
 */
async function geminiExplainDecision(selectedProvider, rejectedProviders, intent) {
  if (!model) return null;

  const prompt = `You are BazaarAI, an intelligent service booking system in Pakistan.

Explain in 3-4 bullet points WHY you selected this provider and NOT the others.
Be specific about scores, reliability, and trade-offs. Keep it concise and data-driven.

Selected: ${JSON.stringify({
    name: selectedProvider.name,
    rating: selectedProvider.rating,
    reliability: selectedProvider.reliability_score,
    distance: selectedProvider.distance_km + 'km',
    score: (selectedProvider.score?.total * 100).toFixed(0) + '%',
    specialization: selectedProvider.specialization
  })}

Rejected alternatives: ${JSON.stringify(rejectedProviders.slice(0, 2).map(p => ({
    name: p.name,
    rating: p.rating,
    reliability: p.reliability_score,
    distance: p.distance_km + 'km',
    score: (p.score?.total * 100).toFixed(0) + '%'
  })))}

User needs: ${intent.service_type} in ${intent.location} (budget: ${intent.budget_sensitivity})

Return ONLY a JSON array of 4 strings (bullet points), no markdown:
["reason 1", "reason 2", "reason 3", "reason 4"]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[Gemini] Decision explanation error:', err.message);
    return null;
  }
}

/**
 * Generate dynamic price justification
 */
async function geminiJustifyPrice(pricing, provider, intent) {
  if (!model) return null;

  const prompt = `You are BazaarAI pricing agent. Explain this price breakdown to a Pakistani customer in 2 sentences.
Be transparent and friendly. Mention if surge pricing is active.

Pricing: PKR ${pricing.total_price}
Breakdown: ${JSON.stringify(pricing.breakdown)}
Provider: ${provider?.name}
Service: ${intent.service_type}
Surge active: ${pricing.surge_applied || false}

Return ONLY a JSON string (one explanation sentence):
"Your explanation here"`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^"|"$/g, '');
    return text;
  } catch (err) {
    return null;
  }
}

/**
 * Generate dispute resolution message
 */
async function geminiResolveDispute(disputeType, booking, resolution) {
  if (!model) return null;

  const prompt = `You are BazaarAI customer support in Pakistan. Write a friendly, professional resolution message for this dispute.

Dispute type: ${disputeType}
Resolution: ${JSON.stringify(resolution)}
Service: ${booking?.booking?.service_type || 'AC Repair'}

Keep it under 2 sentences. Be empathetic. Return ONLY the message string (no quotes):`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    return null;
  }
}

module.exports = {
  isGeminiEnabled: () => !!model,
  geminiExtractIntent,
  geminiExplainDecision,
  geminiJustifyPrice,
  geminiResolveDispute,
};

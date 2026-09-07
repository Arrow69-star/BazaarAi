

const SERVICE_KEYWORDS = {
  'AC Repair': ['ac', 'air condition', 'cooling', 'thanda', 'ठंडा', 'cool', 'compressor', 'gas fill', 'ac service', 'ac band', 'ac kharab', 'ac nahi chal', 'ac ka scene'],
  'Plumbing': ['plumber', 'pipe', 'leak', 'paani', 'water', 'drain', 'tap', 'leakage', 'nali', 'nalka', 'toilet', 'flush', 'blockage'],
  'Electrician': ['electric', 'bijli', 'wiring', 'short circuit', 'light', 'fan', 'socket', 'switch', 'mcb', 'fuse', 'voltage', 'current'],
  'Carpenter': ['carpenter', 'wood', 'furniture', 'darwaza', 'door', 'almari', 'wardrobe', 'table', 'chair', 'sofa repair', 'lakri'],
  'Painter': ['paint', 'rang', 'painting', 'wall', 'dewar', 'colour', 'whitewash', 'polish'],
  'Cleaning': ['clean', 'safai', 'صفائی', 'dust', 'mop', 'sweep', 'deep clean', 'ghar saaf'],
  'Tutor': ['tutor', 'teacher', 'ustad', 'teacher chahiye', 'padhai', 'math', 'science', 'english', 'online tutor']
};

const TIME_KEYWORDS = {
  NOW: ['abhi', 'ابھی', 'now', 'asap', 'jaldi', 'فوری', 'fori', 'turant', 'emergency'],
  TODAY: ['aaj', 'آج', 'today', 'aaj hi', 'is waqt'],
  TOMORROW: ['kal', 'کل', 'tomorrow', 'kal subah', 'kal sham', 'next day'],
  MORNING: ['subah', 'صبح', 'morning', 'am', 'suba'],
  EVENING: ['sham', 'شام', 'evening', 'afternoon', 'dopahar']
};

const BUDGET_KEYWORDS = {
  LOW: ['sasta', 'سستا', 'cheap', 'budget', 'kam', 'budget kam', 'affordable', 'low cost', 'mehenga nahi', 'economic'],
  HIGH: ['acha', 'best', 'quality', 'premium', 'professional', 'expert', 'reliable', 'guaranteed']
};

const URGENCY_KEYWORDS = {
  HIGH: ['emergency', 'abhi', 'jaldi', 'urgent', 'fori', 'asap', 'turant', 'bahut zaroor', 'kal tak'],
  NORMAL: ['kal', 'tomorrow', 'next week', 'kisi din', 'week mein']
};

function detectLanguage(text) {
  const urduScript = /[\u0600-\u06FF]/;
  const hasUrduScript = urduScript.test(text);
  const romanUrduWords = ['mujhe', 'chahiye', 'kal', 'aaj', 'subah', 'sham', 'karo', 'karna', 'hai', 'hain', 'mein', 'ka', 'ki', 'ke', 'wala', 'sasta', 'jaldi', 'scene'];
  const romanUrduCount = romanUrduWords.filter(w => text.toLowerCase().includes(w)).length;

  if (hasUrduScript && romanUrduCount > 0) return 'mixed';
  if (hasUrduScript) return 'urdu';
  if (romanUrduCount >= 2) return 'roman_urdu';
  return 'english';
}

function extractService(text) {
  const lower = text.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += (kw.length > 4 ? 2 : 1);
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = service;
    }
  }
  return { service: bestMatch, score: bestScore };
}

function extractTime(text) {
  const lower = text.toLowerCase();
  let timeResult = { day: 'TOMORROW', period: 'MORNING', raw: '' };

  for (const [period, keywords] of Object.entries(TIME_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        timeResult.raw += kw + ' ';
        if (['NOW', 'TODAY', 'TOMORROW'].includes(period)) timeResult.day = period;
        if (['MORNING', 'EVENING'].includes(period)) timeResult.period = period;
      }
    }
  }

  
  const now = new Date();
  if (timeResult.day === 'NOW') {
    timeResult.timestamp = now.toISOString();
    timeResult.display = 'Right now';
  } else if (timeResult.day === 'TODAY') {
    const today = new Date(now);
    today.setHours(timeResult.period === 'MORNING' ? 9 : 16, 0, 0, 0);
    timeResult.timestamp = today.toISOString();
    timeResult.display = `Today ${timeResult.period === 'MORNING' ? 'morning' : 'evening'}`;
  } else {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(timeResult.period === 'MORNING' ? 9 : 16, 0, 0, 0);
    timeResult.timestamp = tomorrow.toISOString();
    timeResult.display = `Tomorrow ${timeResult.period === 'MORNING' ? 'morning (9:00 AM)' : 'evening (4:00 PM)'}`;
  }

  return timeResult;
}

function extractLocation(text) {
  
  const sectorPattern = /([A-IFG]-\d{1,2})/gi;
  const sectors = text.match(sectorPattern);

  const KNOWN_AREAS = {
    'g-13': { sector: 'G-13', city: 'Islamabad', lat: 33.6844, lng: 73.0479 },
    'g-14': { sector: 'G-14', city: 'Islamabad', lat: 33.6900, lng: 73.0550 },
    'f-10': { sector: 'F-10', city: 'Islamabad', lat: 33.7050, lng: 73.0700 },
    'f-11': { sector: 'F-11', city: 'Islamabad', lat: 33.6950, lng: 73.0600 },
    'g-10': { sector: 'G-10', city: 'Islamabad', lat: 33.6730, lng: 73.0400 },
    'g-11': { sector: 'G-11', city: 'Islamabad', lat: 33.6780, lng: 73.0420 },
    'i-8':  { sector: 'I-8',  city: 'Islamabad', lat: 33.6600, lng: 73.0300 },
    'i-9':  { sector: 'I-9',  city: 'Islamabad', lat: 33.6680, lng: 73.0380 },
    'h-9':  { sector: 'H-9',  city: 'Islamabad', lat: 33.6700, lng: 73.0350 }
  };

  if (sectors && sectors.length > 0) {
    const key = sectors[0].toLowerCase();
    return KNOWN_AREAS[key] || { sector: sectors[0], city: 'Islamabad', lat: 33.6844, lng: 73.0479 };
  }

  
  if (text.toLowerCase().includes('rawalpindi') || text.toLowerCase().includes('pindi')) {
    return { sector: 'Rawalpindi', city: 'Rawalpindi', lat: 33.6007, lng: 73.0679 };
  }
  if (text.toLowerCase().includes('islamabad') || text.toLowerCase().includes('isb')) {
    return { sector: 'Islamabad', city: 'Islamabad', lat: 33.6844, lng: 73.0479 };
  }

  return null; 
}

function calculateConfidence(service, location, timeInfo) {
  let score = 0;
  let maxScore = 3;

  if (service.score > 0) score += 1;
  if (service.score >= 2) score += 0.5; 
  if (location) score += 1;
  if (timeInfo.raw.trim().length > 0) score += 0.5;

  return Math.min(score / maxScore, 1.0);
}

function runIntentAgent(rawText, logger) {
  logger.logAgentStart('IntentAgent', { raw_text: rawText });

  const reasoning = [];
  reasoning.push(`Input received: "${rawText}"`);

  
  const language = detectLanguage(rawText);
  reasoning.push(`Language detected: ${language}`);

  
  const { service, score: serviceScore } = extractService(rawText);
  reasoning.push(`Service keyword match: "${service}" (score: ${serviceScore})`);

  
  const timeInfo = extractTime(rawText);
  reasoning.push(`Time parsed: ${timeInfo.display} → ${timeInfo.timestamp}`);

  
  const location = extractLocation(rawText);
  reasoning.push(location
    ? `Location found: ${location.sector}, ${location.city}`
    : 'Location NOT found — will ask clarification'
  );

  
  const lowerText = rawText.toLowerCase();
  let budgetPreference = 'NEUTRAL';
  for (const kw of BUDGET_KEYWORDS.LOW) {
    if (lowerText.includes(kw)) { budgetPreference = 'LOW'; break; }
  }
  if (budgetPreference === 'NEUTRAL') {
    for (const kw of BUDGET_KEYWORDS.HIGH) {
      if (lowerText.includes(kw)) { budgetPreference = 'HIGH'; break; }
    }
  }
  reasoning.push(`Budget preference: ${budgetPreference}`);

  
  let urgency = 'NORMAL';
  for (const kw of URGENCY_KEYWORDS.HIGH) {
    if (lowerText.includes(kw)) { urgency = 'HIGH'; break; }
  }
  reasoning.push(`Urgency level: ${urgency}`);

  
  const confidence = calculateConfidence({ score: serviceScore }, location, timeInfo);
  reasoning.push(`Confidence score: ${(confidence * 100).toFixed(0)}%`);

  const output = {
    service_type: service,
    issue_description: rawText,
    location,
    time: timeInfo,
    urgency,
    budget_preference: budgetPreference,
    language_detected: language,
    confidence_score: confidence,
    needs_clarification: confidence < 0.8
  };

  
  if (output.needs_clarification) {
    output.clarification_questions = [];
    if (!service) output.clarification_questions.push('Aap kaunsi service chahte hain? (AC repair, plumber, electrician?)');
    if (!location) output.clarification_questions.push('Aap ka sector kya hai? (G-13, F-10, etc.)');
    reasoning.push('⚠️  Confidence < 80% — clarification required');
  }

  logger.logAgentComplete('IntentAgent', output, reasoning.join(' | '));
  logger.logToolCall('IntentAgent.extractService', { text: rawText }, `service=${service}, score=${serviceScore}`);
  logger.logToolCall('IntentAgent.extractLocation', { text: rawText }, JSON.stringify(location));

  return output;
}

async function runIntentAgentAsync(rawText, logger) {
  const { isGeminiEnabled, geminiExtractIntent } = require('./geminiService');
  logger.logAgentStart('IntentAgent', { raw_text: rawText, mode: isGeminiEnabled() ? 'GEMINI_AI' : 'KEYWORD' });

  if (isGeminiEnabled()) {
    try {
      console.log('[IntentAgent] 🧠 Using Gemini AI for real NLP...');
      const g = await geminiExtractIntent(rawText);
      if (g) {
        const location = extractLocation(rawText) || (g.location ? { sector: g.location, city: 'Islamabad', lat: 33.6844, lng: 73.0479 } : null);
        const timeInfo = extractTime(rawText);
        const output = {
          service_type: g.service_type,
          issue_description: g.issue_description || rawText,
          location, time: timeInfo,
          urgency: g.urgency || 'NORMAL',
          budget_preference: g.budget_sensitivity || 'NEUTRAL',
          language_detected: g.language_detected || 'roman_urdu',
          confidence_score: g.confidence_score || 0.9,
          needs_clarification: g.needs_clarification || false,
          clarification_questions: g.clarification_question ? [g.clarification_question] : [],
          keywords_detected: g.keywords_detected || [],
          ai_powered: true,
          ai_model: 'gemini-2.0-flash-lite',
        };
        logger.logAgentComplete('IntentAgent', output, `Gemini AI: ${output.service_type} @ ${output.location?.sector} conf=${output.confidence_score}`);
        return output;
      }
    } catch (err) {
      console.log('[IntentAgent] Gemini error, keyword fallback:', err.message);
    }
  }
  
  return runIntentAgent(rawText, logger);
}

module.exports = { runIntentAgent, runIntentAgentAsync };

/**
 * BazaarAI — Agent 03: Job Complexity Classifier
 * Classifies job complexity: basic | intermediate | complex
 * Affects pricing and technician selection
 */

const COMPLEXITY_RULES = {
  'AC Repair': [
    {
      level: 'basic',
      keywords: ['service', 'cleaning', 'filter', 'gas check', 'routine', 'maintenance', 'clean'],
      description: 'Routine AC service / filter cleaning / gas top-up',
      estimated_duration_min: 60,
      price_multiplier: 1.0
    },
    {
      level: 'intermediate',
      keywords: ['not cooling', 'thanda nahi', 'nahi chala raha', 'tha nda', 'leaking', 'dripping', 'noise', 'awaz', 'error', 'kharab', 'band ho gaya', 'band hai', 'nahi chal'],
      description: 'AC not cooling / leaking / making noise',
      estimated_duration_min: 120,
      price_multiplier: 1.4
    },
    {
      level: 'complex',
      keywords: ['compressor', 'pcb', 'board', 'burnt', 'jala', 'major', 'replace', 'install', 'installation', 'blast', 'not starting', 'start nahi'],
      description: 'Compressor/PCB issue or full replacement',
      estimated_duration_min: 240,
      price_multiplier: 2.0
    }
  ],
  'Plumbing': [
    {
      level: 'basic',
      keywords: ['tap', 'nalka', 'leak', 'drip', 'washer', 'seal'],
      description: 'Tap/washer replacement or minor leak fix',
      estimated_duration_min: 45,
      price_multiplier: 1.0
    },
    {
      level: 'intermediate',
      keywords: ['pipe', 'blockage', 'block', 'drainage', 'nali', 'overflow', 'slow drain'],
      description: 'Pipe blockage or drainage issue',
      estimated_duration_min: 90,
      price_multiplier: 1.3
    },
    {
      level: 'complex',
      keywords: ['burst', 'main pipe', 'flood', 'complete', 'replace entire', 'underground', 'sewage'],
      description: 'Burst pipe or complete replumbing',
      estimated_duration_min: 300,
      price_multiplier: 2.5
    }
  ],
  'Electrician': [
    {
      level: 'basic',
      keywords: ['switch', 'socket', 'plug', 'bulb', 'fuse'],
      description: 'Switch/socket/bulb replacement',
      estimated_duration_min: 30,
      price_multiplier: 1.0
    },
    {
      level: 'intermediate',
      keywords: ['short circuit', 'trip', 'mcb', 'circuit', 'fan', 'motor', 'not working'],
      description: 'Short circuit or MCB tripping',
      estimated_duration_min: 90,
      price_multiplier: 1.4
    },
    {
      level: 'complex',
      keywords: ['full wiring', 'rewiring', 'panel', 'meter', 'solar', 'generator', 'three phase'],
      description: 'Full wiring or solar panel installation',
      estimated_duration_min: 480,
      price_multiplier: 3.0
    }
  ]
};

function classifyComplexity(serviceType, issueDescription, logger) {
  logger.logAgentStart('ComplexityClassifier', { service: serviceType, issue: issueDescription });

  const rules = COMPLEXITY_RULES[serviceType];
  const lowerText = issueDescription.toLowerCase();
  const reasoning = [];

  if (!rules) {
    const defaultResult = {
      level: 'basic',
      description: 'Standard service request',
      estimated_duration_min: 60,
      price_multiplier: 1.0,
      requires_specialist: false
    };
    reasoning.push(`No complexity rules for "${serviceType}" → defaulting to basic`);
    logger.logAgentComplete('ComplexityClassifier', defaultResult, reasoning.join(' | '));
    return defaultResult;
  }

  let matchedLevel = null;
  let matchedRule = null;
  let highestPriority = -1;

  // Check complex first (highest priority), then intermediate, then basic
  for (const rule of [...rules].reverse()) {
    for (const keyword of rule.keywords) {
      if (lowerText.includes(keyword)) {
        const priority = rule.level === 'complex' ? 2 : rule.level === 'intermediate' ? 1 : 0;
        if (priority > highestPriority) {
          highestPriority = priority;
          matchedLevel = rule.level;
          matchedRule = rule;
          reasoning.push(`Matched "${keyword}" → complexity: ${rule.level}`);
        }
      }
    }
  }

  // Default to basic if no match
  if (!matchedRule) {
    matchedRule = rules[0]; // basic
    reasoning.push('No specific complexity keywords matched → defaulting to basic');
  }

  const result = {
    level: matchedRule.level,
    description: matchedRule.description,
    estimated_duration_min: matchedRule.estimated_duration_min,
    price_multiplier: matchedRule.price_multiplier,
    requires_specialist: matchedRule.level === 'complex',
    matched_keywords: reasoning
  };

  reasoning.push(`Final classification: ${matchedRule.level.toUpperCase()} — ${matchedRule.description}`);
  reasoning.push(`Duration estimate: ~${matchedRule.estimated_duration_min} min, Price multiplier: ${matchedRule.price_multiplier}x`);

  logger.logAgentComplete('ComplexityClassifier', result, reasoning.join(' | '));
  return result;
}

module.exports = { classifyComplexity };

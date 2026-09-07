import os, json, re, base64
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', 'backend', '.env'))

GEMINI_KEY = os.getenv('GEMINI_API_KEY', '')

_client = None
SDK_VERSION = 'none'
try:
    from google import genai as _genai_new
    if GEMINI_KEY:
        _client = _genai_new.Client(api_key=GEMINI_KEY)
    SDK_VERSION = 'new'
except Exception:
    try:
        import google.generativeai as _genai_old
        if GEMINI_KEY:
            _genai_old.configure(api_key=GEMINI_KEY)
        SDK_VERSION = 'old'
    except Exception:
        SDK_VERSION = 'none'

DIAGNOSTIC_PROMPT = """You are an expert diagnostic engineer for Khidmat AI, specializing in home repair issues in Pakistan (HVAC, plumbing, electrical, carpentry, appliances).

Analyze this repair situation:
Description: "{text}"

Evaluate the technical failure and return ONLY valid JSON:
{{
  "diagnosis_title": "Concise failure title (e.g., Compressor Capacitor Blown)",
  "category": "AC Repair | Plumbing | Electrician | etc.",
  "severity": "CRITICAL | MODERATE | MINOR",
  "root_cause_analysis": "Technical explanation of what failed and why",
  "safety_precautions": [
    "Immediate safety step 1 (e.g. Turn off main circuit breaker / Close gas valve)",
    "Immediate safety step 2"
  ],
  "recommended_parts": [
    {{"part_name": "Name of replacement part", "est_price_pkr": 800, "where_to_buy": "Local electronics market / hardware shop"}}
  ],
  "estimated_labor_pkr": {{"min": 1000, "max": 2000}},
  "estimated_total_pkr": {{"min": 1800, "max": 2800}},
  "estimated_duration_minutes": 45,
  "kaarigar_skills_required": ["Capacitor testing", "Multi-meter usage", "Refrigerant pressure check"]
}}
"""

def run_diagnostic_agent(text: str, image_base64: str = None, mime_type: str = "image/jpeg") -> dict:
    """Diagnoses a repair issue using Gemini multimodal capabilities."""
    prompt = DIAGNOSTIC_PROMPT.format(text=text[:600])

    if _client and SDK_VERSION == 'new':
        contents = [prompt]
        if image_base64:
            try:
                if ',' in image_base64:
                    image_base64 = image_base64.split(',', 1)[1]
                raw_bytes = base64.b64decode(image_base64)
                from google.genai import types
                contents.append(types.Part.from_bytes(data=raw_bytes, mime_type=mime_type))
            except Exception:
                pass

        for m in ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest']:
            try:
                resp = _client.models.generate_content(model=m, contents=contents)
                raw = resp.text.strip()
                raw = re.sub(r'^```json\s*', '', raw, flags=re.IGNORECASE)
                raw = re.sub(r'^```\s*', '', raw)
                raw = re.sub(r'\s*```$', '', raw)
                data = json.loads(raw)
                data['source'] = 'gemini_multimodal'
                data['timestamp'] = datetime.now().isoformat()
                return data
            except Exception:
                continue

    lower = text.lower()
    cat = 'General Repair'
    title = 'Standard Service Diagnostics'
    safety = ['Ensure area is ventilated and dry']
    parts = []
    labor_min, labor_max = 1000, 2000

    if any(k in lower for k in ['ac', 'thanda', 'cooling', 'compressor']):
        cat = 'AC Repair'
        title = 'AC Cooling Deficiency / Gas Leak'
        safety = ['Turn off AC from master switch', 'Do not touch outdoor condenser fan while running']
        parts = [{'part_name': 'Run Capacitor (45uF)', 'est_price_pkr': 950, 'where_to_buy': 'Electronic Market'}]
        labor_min, labor_max = 1500, 3000
    elif any(k in lower for k in ['pipe', 'paani', 'water', 'leak', 'nalka']):
        cat = 'Plumbing'
        title = 'Water Pipeline Leakage / Joint Failure'
        safety = ['Shut off the main water valve / overhead tank cock immediately']
        parts = [{'part_name': 'Teflon Tape & PPRC Elbow Socket', 'est_price_pkr': 400, 'where_to_buy': 'Sanitary Store'}]
        labor_min, labor_max = 800, 1800
    elif any(k in lower for k in ['bijli', 'electric', 'short', 'spark', 'fuse', 'mcb']):
        cat = 'Electrician'
        title = 'Circuit Breaker Trip / Short Circuit'
        safety = ['Do not touch wet wires', 'Switch off the main distribution box (DB) breaker']
        parts = [{'part_name': 'Single Pole MCB Breaker (16A)', 'est_price_pkr': 650, 'where_to_buy': 'Electrical Shop'}]
        labor_min, labor_max = 1000, 2200

    return {
        'diagnosis_title': title,
        'category': cat,
        'severity': 'MODERATE',
        'root_cause_analysis': f'Identified potential wear or connection issue based on reported symptoms: {text[:100]}',
        'safety_precautions': safety,
        'recommended_parts': parts,
        'estimated_labor_pkr': {'min': labor_min, 'max': labor_max},
        'estimated_total_pkr': {'min': labor_min + 400, 'max': labor_max + 1000},
        'estimated_duration_minutes': 45,
        'kaarigar_skills_required': ['Safety lockout', 'Component replacement', 'Testing & validation'],
        'source': 'heuristic_fallback',
        'timestamp': datetime.now().isoformat()
    }

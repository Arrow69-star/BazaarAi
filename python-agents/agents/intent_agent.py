import os, json, re
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', 'backend', '.env'))

GEMINI_KEY = os.getenv('GEMINI_API_KEY', '')

# Try new SDK first, fall back gracefully
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

# ─── Service keyword map ───────────────────────────────────────────
SERVICE_MAP = {
    'AC Repair':           ['ac','air condition','cooling','thanda','compressor','gas fill','ac kharab','technician','hvac','inverter','air con'],
    'Plumbing':            ['plumber','pipe','paani','water','drain','leak','nali','nalka','toilet','flush','drainage'],
    'Electrician':         ['bijli','electric','wiring','fan','light','socket','switch','mcb','short circuit','fuse','bijliwala'],
    'Carpenter':           ['carpenter','darwaza','door','furniture','almari','wardrobe','lakri','polish','wood','cabinet'],
    'Cleaning':            ['clean','safai','dust','sweep','ghar saaf','washing','jharo','mop'],
    'Painter':             ['paint','rang','deewar','wall','colour','brush','painter'],
    'Tutor':               ['tutor','teacher','math','maths','science','english','padhai','padhana','ustani'],
    'Beautician':          ['beautician','makeup','facial','beauty','parlour','salon','wax','threading'],
    'Mehendi Artist':      ['mehendi','henna','bridal','dulhan','mehandi'],
    'Cook/Chef':           ['cook','chef','khana','food','bana','cooking','daig','biryani','khana pakana'],
    'Driver':              ['driver','gaari','car','chauffeur','driving'],
    'Tailor':              ['tailor','darzi','silai','kapra','suit','sewing','dress'],
    'Welder':              ['welder','welding','iron gate','metal','gate','railing','weld'],
    'Computer Repair':     ['computer','laptop','pc','virus','format','screen','keyboard','computer kharab'],
    'Mobile Repair':       ['mobile','phone','screen crack','battery','charging','smartphone','mobile screen'],
    'Generator Repair':    ['generator','genset','gen ','power backup','ups repair'],
    'Water Tank Cleaning': ['water tank','tanki','tank saaf','overhead tank','tanki saaf'],
}

LOCATION_COORDS = {
    'G-13':{'lat':33.6844,'lon':73.0479}, 'G-14':{'lat':33.690,'lon':73.055},
    'G-11':{'lat':33.678,'lon':73.042},   'G-10':{'lat':33.673,'lon':73.040},
    'F-10':{'lat':33.705,'lon':73.070},   'F-11':{'lat':33.695,'lon':73.060},
    'F-7': {'lat':33.720,'lon':73.075},   'F-8': {'lat':33.710,'lon':73.065},
    'F-6': {'lat':33.728,'lon':73.080},   'I-8': {'lat':33.660,'lon':73.030},
    'I-9': {'lat':33.668,'lon':73.038},   'I-10':{'lat':33.672,'lon':73.043},
    'H-8': {'lat':33.668,'lon':73.048},   'H-9': {'lat':33.672,'lon':73.050},
    'E-11':{'lat':33.740,'lon':73.090},   'DHA': {'lat':33.580,'lon':73.080},
    'Bahria':{'lat':33.530,'lon':73.140}, 'Rawat':{'lat':33.650,'lon':73.020},
}

GEMINI_PROMPT = """You are an expert at understanding service requests in Pakistani context (Urdu, Roman Urdu, English).
Extract from this input: "{text}"

Return ONLY valid JSON:
{{
  "service_type": "one of: AC Repair|Plumbing|Electrician|Carpenter|Cleaning|Painter|Tutor|Beautician|Mehendi Artist|Cook/Chef|Driver|Tailor|Welder|Computer Repair|Mobile Repair|Generator Repair|Water Tank Cleaning or null",
  "location": "Islamabad sector like G-13|F-10|I-8 or null",
  "time_preference": "ASAP|today|tomorrow morning (9 AM)|tomorrow evening (5 PM)",
  "urgency_level": "emergency|normal|flexible",
  "language_detected": "Urdu|Roman Urdu|English|Mixed",
  "confidence": 0.95,
  "clarification_needed": false,
  "clarification_question": null
}}
Rules: 'kal subah'=tomorrow morning, 'abhi'=ASAP, 'G-13 mein'=G-13. Never guess missing fields, use null."""


def _keyword_extract(text: str) -> dict:
    q = text.lower()
    service_type, location = None, None
    for svc, kws in SERVICE_MAP.items():
        if any(k in q for k in kws):
            service_type = svc
            break
    for loc in LOCATION_COORDS:
        if loc.lower() in q:
            location = loc
            break
    if not location:
        if 'islamabad' in q or ' isb' in q: location = 'G-13'
        elif 'rawalpindi' in q or 'pindi' in q: location = 'I-8'

    urgency = 'emergency' if any(w in q for w in ['abhi','urgent','jaldi','asap','now','emergency','foran']) else 'normal'
    if 'kal' in q or 'tomorrow' in q:
        tp = 'tomorrow evening (5 PM)' if any(w in q for w in ['sham','evening','shaam']) else 'tomorrow morning (9 AM)'
    elif 'aaj' in q or 'today' in q:
        tp = 'today'
    elif urgency == 'emergency':
        tp = 'ASAP'
    else:
        tp = 'tomorrow morning (9 AM)'

    lang = 'English'
    if re.search(r'[\u0600-\u06ff]', text):
        lang = 'Urdu'
    elif any(w in q for w in ['kal','aaj','chahiye','mujhe','mein','hai','karo','abhi','nahi','wala','banda']):
        lang = 'Roman Urdu'

    conf = 0.15
    if service_type: conf += 0.50
    if location:     conf += 0.35

    return {
        'service_type': service_type, 'location': location, 'time_preference': tp,
        'urgency_level': urgency, 'language_detected': lang, 'confidence': round(conf, 2),
        'clarification_needed': conf < 0.70,
        'clarification_question': _clarify(service_type, location) if conf < 0.70 else None,
    }


def _clarify(svc, loc):
    if not svc:
        return 'Aap ko kis qism ki service chahiye? (e.g., AC repair, plumber, electrician, tutor)'
    if not loc:
        return 'Aap kis sector mein hain? (e.g., G-13, F-10, I-8, F-11)'
    return 'Please share more details about your requirement.'


def _call_gemini(text: str) -> dict:
    prompt = GEMINI_PROMPT.format(text=text[:500])
    raw = ''
    if SDK_VERSION == 'new' and _client:
        resp = _client.models.generate_content(model='gemini-2.0-flash', contents=prompt)
        raw = resp.text.strip()
    elif SDK_VERSION == 'old':
        import google.generativeai as _g
        model = _g.GenerativeModel('gemini-1.5-flash')
        resp = model.generate_content(prompt)
        raw = resp.text.strip()
    else:
        raise Exception('No Gemini SDK configured')
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def run_intent_agent(text: str, trace: list) -> dict:
    trace.append({'agent': 'IntentAgent', 'started_at': datetime.now().isoformat(), 'input': text[:200]})

    result = {}
    if GEMINI_KEY:
        try:
            result = _call_gemini(text)
            result['source'] = 'gemini'
        except Exception as e:
            result = _keyword_extract(text)
            result['source'] = 'keyword_fallback'
            result['gemini_error'] = str(e)
    else:
        result = _keyword_extract(text)
        result['source'] = 'keyword_fallback'

    trace[-1].update({'completed_at': datetime.now().isoformat(), 'output': result, 'status': 'success'})
    return result

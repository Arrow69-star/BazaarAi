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
    'AC Repair':           ['ac','air condition','cooling','thanda','compressor','gas fill','ac kharab','technician','hvac','inverter','air con','اے سی','ٹھنڈا','کولنگ','ایئر کنڈیشن','کمپریسر'],
    'Plumbing':            ['plumber','pipe','paani','water','drain','leak','nali','nalka','toilet','flush','drainage','پلمبر','پانی','نل','ٹونٹی','پائپ','لیکج','نالی'],
    'Electrician':         ['bijli','electric','wiring','fan','light','socket','switch','mcb','short circuit','fuse','bijliwala','بجلی','الیکٹریشن','وائرنگ','پنکھا','لائٹ','سوئچ','شارٹ سرکٹ'],
    'Carpenter':           ['carpenter','darwaza','door','furniture','almari','wardrobe','lakri','polish','wood','cabinet','ترکھان','دروازہ','فرنیچر','الماری','لکڑی'],
    'Cleaning':            ['clean','safai','dust','sweep','ghar saaf','washing','jharo','mop','صفائی','صاف','جھاڑو'],
    'Painter':             ['paint','rang','deewar','wall','colour','brush','painter','پینٹ','رنگ','دیوار'],
    'Tutor':               ['tutor','teacher','math','maths','science','english','padhai','padhana','ustani','ٹیوٹر','استاد','پڑھائی','ٹیچر'],
    'Beautician':          ['beautician','makeup','facial','beauty','parlour','salon','wax','threading','بیوٹیشن','میک اپ','پارلر','فیشل'],
    'Mehendi Artist':      ['mehendi','henna','bridal','dulhan','mehandi','مہندی','دلہن'],
    'Cook/Chef':           ['cook','chef','khana','food','bana','cooking','daig','biryani','khana pakana','کھانا','باورچی','شیف','دیگ'],
    'Driver':              ['driver','gaari','car','chauffeur','driving','ڈرائیور','گاڑی'],
    'Tailor':              ['tailor','darzi','silai','kapra','suit','sewing','dress','درزی','سلائی','کپڑے'],
    'Welder':              ['welder','welding','iron gate','metal','gate','railing','weld','ویلڈر','لوہا','گیٹ'],
    'Computer Repair':     ['computer','laptop','pc','virus','format','screen','keyboard','computer kharab','کمپیوٹر','لیپ ٹاپ'],
    'Mobile Repair':       ['mobile','phone','screen crack','battery','charging','smartphone','mobile screen','موبائل','فون','اسکرین','بیٹری'],
    'Generator Repair':    ['generator','genset','gen ','power backup','ups repair','جنریٹر','یو پی ایس'],
    'Water Tank Cleaning': ['water tank','tanki','tank saaf','overhead tank','tanki saaf','ٹینکی','پانی کی ٹینکی'],
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

GEMINI_PROMPT = """You are the master cognitive orchestrator for Khidmat AI (BazaarAI), Pakistan's premier autonomous service marketplace.
Understand service requests in Pakistani context across Urdu (Nastaliq), Roman Urdu, and English code-switching.

Analyze this user request: "{text}"

Extract the parameters and return ONLY valid JSON:
{{
  "service_type": "one of: AC Repair|Plumbing|Electrician|Carpenter|Cleaning|Painter|Tutor|Beautician|Mehendi Artist|Cook/Chef|Driver|Tailor|Welder|Computer Repair|Mobile Repair|Generator Repair|Water Tank Cleaning or null",
  "sub_issue": "specific problem or failure mode (e.g., Gas Leak, Pipe Joint Crack, Fan Capacitor, Short Circuit)",
  "location": "Islamabad/Rawalpindi sector or area (e.g., G-13, F-10, I-8, F-11, DHA, Bahria) or null",
  "time_preference": "ASAP|today|tomorrow morning (9 AM)|tomorrow evening (5 PM)",
  "urgency_level": "emergency|normal|flexible",
  "language_detected": "Urdu|Roman Urdu|English|Mixed",
  "safety_flag": "NORMAL|HAZARDOUS_ELECTRICITY|GAS_LEAK|WATER_BURST",
  "pricing_estimate": {{
    "currency": "PKR",
    "base_visit_fee": 500,
    "estimated_labor_min": 1200,
    "estimated_labor_max": 2500,
    "surge_multiplier": 1.0,
    "total_estimated_range": "1,700 - 3,000 PKR"
  }},
  "client_response": {{
    "urdu": "ہم نے آپ کی درخواست وصول کر لی ہے۔ تصدیق شدہ کاریگر تلاش کیا جا رہا ہے۔",
    "roman_urdu": "Aap ki request mil gayi hai. Verified kaarigar talash kiya ja raha hai.",
    "english": "Your request has been received. Finding verified providers nearby."
  }},
  "confidence": 0.95,
  "clarification_needed": false,
  "clarification_question": null
}}

Linguistic Rules:
- Roman Urdu: 'kal subah'=tomorrow morning, 'abhi/foran'=ASAP, 'G-13 mein'=G-13, 'paani tapak raha hai'=leakage/Plumbing, 'bijli chali gayi/short'=Electrician, 'thanda nahi kar raha'=AC Repair.
- Urdu script: sector letters are spelled out and digits may be Urdu-Indic — 'جی ۱۳'=G-13, 'ایف ۱۰'=F-10, 'آئی ۸'=I-8, 'ایچ ۹'=H-9, 'ای ۱۱'=E-11, 'ڈی ایچ اے'=DHA. Always normalise these to the Latin form (G-13, F-10, ...).
- Urdu script vocabulary: 'اے سی'=AC Repair, 'بجلی'=Electrician, 'پانی/نل/پائپ'=Plumbing, 'ترکھان'=Carpenter, 'صفائی'=Cleaning, 'کل'=tomorrow, 'آج'=today, 'ابھی/فوری'=ASAP, 'صبح'=morning, 'شام'=evening.
- If service_type or location cannot be determined, set clarification_needed: true and provide clarification_question in Roman Urdu.
- Return ONLY the JSON object."""


# Urdu-Indic and Arabic-Indic digits → ASCII, so "جی ۱۳" can resolve to G-13.
_DIGIT_TRANS = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')

# Sector letters spelled in Urdu. Only converted when followed by digits, so ordinary
# words that happen to start with these letters are left alone.
_URDU_SECTOR_PATTERNS = [
    (r'ڈی\s*ایچ\s*اے', 'DHA'),
    (r'بحریہ', 'Bahria'),
    (r'ایف\s*-?\s*(\d{1,2})', r'F-\1'),
    (r'ایچ\s*-?\s*(\d{1,2})', r'H-\1'),
    (r'آئی\s*-?\s*(\d{1,2})', r'I-\1'),
    (r'جی\s*-?\s*(\d{1,2})', r'G-\1'),
    (r'ای\s*-?\s*(\d{1,2})', r'E-\1'),
]


def normalize_urdu_script(text: str) -> str:
    """Transliterates Urdu-script sector names and numerals into the Latin forms the
    keyword tables use, so Urdu input resolves as well as Roman Urdu."""
    out = text.translate(_DIGIT_TRANS)
    for pattern, repl in _URDU_SECTOR_PATTERNS:
        out = re.sub(pattern, repl, out)
    return re.sub(r'\b([GFIHE])\s*-\s*(\d{1,2})\b', r'\1-\2', out)


def _keyword_extract(text: str) -> dict:
    q = normalize_urdu_script(text).lower()
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

    urgency = 'emergency' if any(w in q for w in ['abhi','urgent','jaldi','asap','now','emergency','foran',
                                                  'ابھی','فوری','جلدی','ایمرجنسی']) else 'normal'
    if any(w in q for w in ['kal', 'tomorrow', 'کل']):
        tp = ('tomorrow evening (5 PM)' if any(w in q for w in ['sham','evening','shaam','شام'])
              else 'tomorrow morning (9 AM)')
    elif any(w in q for w in ['aaj', 'today', 'آج']):
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
        'service_type': service_type,
        'sub_issue': 'General Service Required',
        'location': location,
        'time_preference': tp,
        'urgency_level': urgency,
        'language_detected': lang,
        'safety_flag': 'NORMAL',
        'pricing_estimate': {
            'currency': 'PKR',
            'base_visit_fee': 500,
            'estimated_labor_min': 1000,
            'estimated_labor_max': 2500,
            'surge_multiplier': 1.1 if urgency == 'emergency' else 1.0,
            'total_estimated_range': '1,500 - 3,000 PKR'
        },
        'client_response': {
            'urdu': 'آپ کی درخواست درج کر لی گئی ہے۔',
            'roman_urdu': 'Aap ki service request darj kar li gayi hai.',
            'english': 'Your service request has been logged.'
        },
        'confidence': round(conf, 2),
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
    models_to_try = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest']
    last_err = None

    if SDK_VERSION == 'new' and _client:
        for m in models_to_try:
            try:
                resp = _client.models.generate_content(model=m, contents=prompt)
                raw = resp.text.strip()
                break
            except Exception as e:
                last_err = e
                continue
        if not raw and last_err:
            raise last_err
    elif SDK_VERSION == 'old':
        import google.generativeai as _g
        for m in ['gemini-1.5-flash', 'gemini-1.5-pro']:
            try:
                model = _g.GenerativeModel(m)
                resp = model.generate_content(prompt)
                raw = resp.text.strip()
                break
            except Exception as e:
                last_err = e
                continue
        if not raw and last_err:
            raise last_err
    else:
        raise Exception('No Gemini SDK configured')

    raw = re.sub(r'^```json\s*', '', raw, flags=re.IGNORECASE)
    raw = re.sub(r'^```\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def run_intent_agent(text: str, trace: list) -> dict:
    trace.append({'agent': 'IntentAgent', 'started_at': datetime.now().isoformat(), 'input': text[:200]})

    result = {}
    if GEMINI_KEY:
        try:
            result = _call_gemini(text)
            result['source'] = 'gemini'
            # Gemini is non-deterministic on the same input and sometimes asks to clarify
            # a request the deterministic extractor reads confidently. Backfill rather than
            # bounce the question back to the user.
            if not result.get('service_type') or not result.get('location'):
                kw = _keyword_extract(text)
                backfilled = []
                if not result.get('service_type') and kw.get('service_type'):
                    result['service_type'] = kw['service_type']
                    backfilled.append('service_type')
                if not result.get('location') and kw.get('location'):
                    result['location'] = kw['location']
                    backfilled.append('location')
                if backfilled:
                    result['source'] = 'gemini+keyword_backfill'
                    result['backfilled_fields'] = backfilled
                    for field in ('time_preference', 'urgency_level'):
                        result.setdefault(field, kw.get(field))
            if result.get('service_type') and result.get('location'):
                result['clarification_needed'] = False
                result['clarification_question'] = None
        except Exception as e:
            result = _keyword_extract(text)
            result['source'] = 'keyword_fallback'
            result['gemini_error'] = str(e)
    else:
        result = _keyword_extract(text)
        result['source'] = 'keyword_fallback'

    trace[-1].update({'completed_at': datetime.now().isoformat(), 'output': result, 'status': 'success'})
    return result

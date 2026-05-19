import json, os, random, string
from datetime import datetime
from filelock import FileLock

BOOKINGS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'bookings.json')
TRACE_FILE    = os.path.join(os.path.dirname(__file__), '..', 'logs', 'agent_trace.jsonl')
os.makedirs(os.path.dirname(BOOKINGS_FILE), exist_ok=True)
os.makedirs(os.path.dirname(TRACE_FILE), exist_ok=True)

def _gen_booking_id():
    date = datetime.now().strftime('%Y%m%d')
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f'BK-{date}-{suffix}'

def _load_bookings():
    if not os.path.exists(BOOKINGS_FILE):
        return {'bookings': []}
    with open(BOOKINGS_FILE, 'r') as f:
        return json.load(f)

def _save_bookings(db):
    lock_path = BOOKINGS_FILE + '.lock'
    with FileLock(lock_path):
        with open(BOOKINGS_FILE, 'w') as f:
            json.dump(db, f, indent=2)

def _append_trace(entry: dict):
    with open(TRACE_FILE, 'a', encoding='utf-8') as f:
        f.write(json.dumps(entry, ensure_ascii=False) + '\n')

def _notification_sim(provider: dict, booking_id: str, intent: dict) -> dict:
    return {
        'sms': f"[BazaarAI] Booking {booking_id} confirmed. {provider['name']} will arrive at {intent.get('time_preference','scheduled time')}. Phone: {provider.get('phone','')}",
        'whatsapp': f"✅ *Booking Confirmed!*\nProvider: {provider['name']}\nTime: {intent.get('time_preference','')}\nID: {booking_id}\nPhone: {provider.get('phone','')}",
        'sent_at': datetime.now().isoformat()
    }

def _dynamic_price(provider: dict, intent: dict) -> dict:
    base = provider.get('price_base', 1000)
    dist_fee = round(provider.get('distance_km', 2) * 15)
    urgency_fee = 300 if intent.get('urgency_level') == 'emergency' else 0
    surge = 1.3 if intent.get('urgency_level') == 'emergency' else 1.0
    total = round((base + dist_fee + urgency_fee) * surge)
    return {
        'base_fee': base,
        'distance_fee': dist_fee,
        'urgency_fee': urgency_fee,
        'surge_multiplier': surge,
        'total_pkr': total,
        'currency': 'PKR'
    }

def run_booking_agent(provider: dict, intent: dict, simulate_cancellation: bool, trace: list) -> dict:
    trace.append({'agent': 'BookingAgent', 'started_at': datetime.now().isoformat(),
                  'input': {'provider': provider.get('name'), 'simulate_cancellation': simulate_cancellation}})

    # STEP 1: Select provider (already done by ranking agent)
    # STEP 2: Check slot availability
    slots = provider.get('availability_slots', ['09:00'])
    preferred_slot = slots[0] if slots else '09:00'

    # STEP 3: Simulate cancellation
    if simulate_cancellation:
        trace[-1]['cancellation_simulated'] = True
        trace[-1].update({'completed_at': datetime.now().isoformat(), 'status': 'cancelled'})
        return {'cancelled': True, 'provider_name': provider.get('name'), 'reason': 'Provider rejected assignment (20% probability event)'}

    # STEP 4: Generate booking ID
    booking_id = _gen_booking_id()

    # STEP 5: Confirmation message (in user's language)
    lang = intent.get('language_detected', 'English')
    if lang in ('Roman Urdu', 'Urdu'):
        confirm_msg = f"✅ Booking confirmed! {provider['name']} kal {preferred_slot} bajay aayega. Booking ID: {booking_id}"
    else:
        confirm_msg = f"✅ Booking confirmed! {provider['name']} will arrive at {preferred_slot}. Booking ID: {booking_id}"

    # STEP 6: Dynamic pricing
    pricing = _dynamic_price(provider, intent)

    # STEP 7: Build receipt
    receipt = {
        'booking_id': booking_id,
        'status': 'CONFIRMED',
        'provider': {
            'id': provider.get('id'), 'name': provider.get('name'),
            'phone': provider.get('phone'), 'rating': provider.get('rating'),
            'distance_km': provider.get('distance_km'),
            'specialization': provider.get('specialization'),
        },
        'service': intent.get('service_type'),
        'location': intent.get('location'),
        'time_slot': preferred_slot,
        'time_preference': intent.get('time_preference'),
        'pricing': pricing,
        'confirmation_message': confirm_msg,
        'created_at': datetime.now().isoformat(),
    }

    # STEP 8: Save to bookings.json atomically
    db = _load_bookings()
    db['bookings'].append(receipt)
    _save_bookings(db)

    # STEP 9: Notification simulation
    receipt['notification'] = _notification_sim(provider, booking_id, intent)

    # STEP 10: Log to agent_trace.jsonl
    _append_trace({'type': 'booking', 'booking_id': booking_id, 'provider': provider.get('name'),
                   'pricing': pricing, 'timestamp': datetime.now().isoformat()})

    trace[-1].update({'completed_at': datetime.now().isoformat(), 'output': {
        'booking_id': booking_id, 'status': 'CONFIRMED', 'total_pkr': pricing['total_pkr']
    }, 'status': 'success'})
    return receipt

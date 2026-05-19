import json, os
from datetime import datetime, timedelta

BOOKINGS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'bookings.json')
TRACE_FILE    = os.path.join(os.path.dirname(__file__), '..', 'logs', 'agent_trace.jsonl')

def _update_booking_status(booking_id: str, status: str):
    if not os.path.exists(BOOKINGS_FILE): return
    with open(BOOKINGS_FILE, 'r') as f: db = json.load(f)
    for b in db.get('bookings', []):
        if b.get('booking_id') == booking_id:
            b['status'] = status; b['updated_at'] = datetime.now().isoformat(); break
    with open(BOOKINGS_FILE, 'w') as f: json.dump(db, f, indent=2)

def _log_trace(entry): 
    with open(TRACE_FILE, 'a') as f: f.write(json.dumps(entry) + '\n')

def run_followup_agent(receipt: dict, intent: dict, trace: list) -> dict:
    trace.append({'agent': 'FollowupAgent', 'started_at': datetime.now().isoformat()})
    booking_id = receipt.get('booking_id', 'UNKNOWN')
    provider   = receipt.get('provider', {})
    service    = receipt.get('service', 'service')
    lang       = intent.get('language_detected', 'English')
    now        = datetime.now()

    # Build timeline
    timeline = [
        {
            'trigger': 'T-1hr',
            'scheduled_at': (now + timedelta(minutes=1)).isoformat(),
            'event': 'reminder',
            'message': (f"Yaad dihani: {provider.get('name')} ek ghante mein aayega! ID: {booking_id}"
                        if lang != 'English' else
                        f"Reminder: {provider.get('name')} arrives in 1 hour! Booking ID: {booking_id}"),
            'channel': 'SMS',
            'status': 'SCHEDULED',
        },
        {
            'trigger': 'T-30min',
            'scheduled_at': (now + timedelta(minutes=2)).isoformat(),
            'event': 'provider_on_way',
            'message': (f"{provider.get('name')} raste mein hai! Tayyar rahein."
                        if lang != 'English' else
                        f"{provider.get('name')} is on the way! Please be ready."),
            'channel': 'WhatsApp',
            'status': 'SCHEDULED',
        },
        {
            'trigger': 'T+0',
            'scheduled_at': (now + timedelta(minutes=3)).isoformat(),
            'event': 'service_started',
            'message': f"Service has started. Booking ID: {booking_id}",
            'channel': 'Push',
            'status': 'SCHEDULED',
        },
        {
            'trigger': 'T+service_duration',
            'scheduled_at': (now + timedelta(minutes=5)).isoformat(),
            'event': 'completion_rating',
            'message': (f"Kaam mukammal! Apna tajurba share karen. Rating dein: ⭐⭐⭐⭐⭐"
                        if lang != 'English' else
                        f"Service completed! Please rate your experience: ⭐⭐⭐⭐⭐"),
            'channel': 'WhatsApp',
            'status': 'SCHEDULED',
        },
    ]

    # Log each scheduled event
    for event in timeline:
        _log_trace({'type': 'followup', 'booking_id': booking_id,
                    'event': event['event'], 'trigger': event['trigger'],
                    'scheduled_at': event['scheduled_at'], 'timestamp': datetime.now().isoformat()})

    result = {'booking_id': booking_id, 'followup_timeline': timeline, 'total_events': len(timeline)}
    trace[-1].update({'completed_at': datetime.now().isoformat(), 'output': {
        'events_scheduled': len(timeline), 'booking_id': booking_id
    }, 'status': 'success'})
    return result

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json, os, sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from agents.orchestrator import orchestrate

BOOKINGS_FILE = os.path.join(os.path.dirname(__file__), 'data', 'bookings.json')
TRACE_FILE    = os.path.join(os.path.dirname(__file__), 'logs', 'agent_trace.jsonl')
DATA_DIR      = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(os.path.join(os.path.dirname(__file__), 'data'), exist_ok=True)
os.makedirs(os.path.join(os.path.dirname(__file__), 'logs'), exist_ok=True)

app = FastAPI(title='BazaarAI Python Orchestrator', version='2.0.0')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

class RequestBody(BaseModel):
    text: str
    simulate_cancellation: Optional[bool] = False
    force_mode: Optional[str] = None   # 'LOW_CONFIDENCE' | 'PROVIDER_CANCELLATION'

class DisputeBody(BaseModel):
    booking_id: str
    reason: str   # 'NO_SHOW' | 'PRICE_DISAGREEMENT' | 'QUALITY_COMPLAINT'

@app.get('/health')
def health():
    providers_count = 0
    try:
        with open(os.path.join(DATA_DIR, 'providers.json')) as f:
            providers_count = len(json.load(f))
    except: pass
    return {'status': 'ok', 'service': 'BazaarAI Python Orchestrator', 'version': '2.0.0',
            'agents': 5, 'providers_loaded': providers_count, 'timestamp': datetime.now().isoformat()}

@app.post('/api/request')
async def handle_request(body: RequestBody):
    if not body.text or len(body.text.strip()) < 3:
        raise HTTPException(400, detail='Input text too short')
    try:
        result = orchestrate(body.text, body.simulate_cancellation or False, body.force_mode)
        return {'success': True, 'result': result}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@app.get('/api/providers')
def get_providers(service: Optional[str] = None, sector: Optional[str] = None):
    try:
        with open(os.path.join(DATA_DIR, 'providers.json')) as f:
            providers = json.load(f)
        if service: providers = [p for p in providers if service.lower() in p.get('service','').lower()]
        if sector:  providers = [p for p in providers if p.get('sector','').lower() == sector.lower()]
        return {'count': len(providers), 'providers': providers}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@app.get('/api/bookings')
def get_all_bookings():
    if not os.path.exists(BOOKINGS_FILE): return {'bookings': []}
    with open(BOOKINGS_FILE) as f: return json.load(f)

@app.get('/api/bookings/{booking_id}')
def get_booking(booking_id: str):
    if not os.path.exists(BOOKINGS_FILE): raise HTTPException(404, detail='No bookings')
    with open(BOOKINGS_FILE) as f: db = json.load(f)
    booking = next((b for b in db.get('bookings',[]) if b.get('booking_id') == booking_id), None)
    if not booking: raise HTTPException(404, detail='Booking not found')
    return booking

@app.post('/api/dispute')
def handle_dispute(body: DisputeBody):
    if not os.path.exists(BOOKINGS_FILE): raise HTTPException(404, detail='No bookings')
    with open(BOOKINGS_FILE) as f: db = json.load(f)
    booking = next((b for b in db.get('bookings',[]) if b.get('booking_id') == body.booking_id), None)
    if not booking: raise HTTPException(404, detail='Booking not found')

    # Resolution logic
    resolution = {}
    if body.reason == 'NO_SHOW':
        resolution = {'status': 'RESOLVED_REFUND', 'action': 'Full refund issued', 'compensation_pkr': booking.get('pricing',{}).get('total_pkr', 0), 'provider_flagged': True}
    elif body.reason == 'PRICE_DISAGREEMENT':
        refund = round(booking.get('pricing',{}).get('total_pkr', 0) * 0.15)
        resolution = {'status': 'RESOLVED_COMPENSATION', 'action': f'15% refund (PKR {refund}) applied', 'compensation_pkr': refund}
    else:
        resolution = {'status': 'RESOLVED_COMPENSATION', 'action': '10% service credit issued', 'compensation_pkr': round(booking.get('pricing',{}).get('total_pkr', 0) * 0.10)}

    # Update booking status
    for b in db['bookings']:
        if b.get('booking_id') == body.booking_id:
            b['status'] = 'DISPUTED'; b['dispute'] = {'reason': body.reason, **resolution, 'filed_at': datetime.now().isoformat()}; break
    with open(BOOKINGS_FILE, 'w') as f: json.dump(db, f, indent=2)
    return {'success': True, 'resolution': resolution}

@app.get('/api/trace')
def get_trace(limit: int = 50):
    if not os.path.exists(TRACE_FILE): return {'entries': []}
    with open(TRACE_FILE) as f:
        lines = [json.loads(l) for l in f.readlines() if l.strip()]
    return {'entries': lines[-limit:], 'total': len(lines)}

@app.post('/api/demo/cancel-rebook')
async def demo_cancel_rebook(body: RequestBody):
    result = orchestrate(body.text or 'AC G-13 kal subah', True, None)
    return {'success': True, 'demo': 'CANCEL_AND_REBOOK', 'result': result}

@app.post('/api/demo/low-confidence')
async def demo_low_confidence():
    result = orchestrate('kuch kaam hai', False, 'LOW_CONFIDENCE')
    return {'success': True, 'demo': 'LOW_CONFIDENCE', 'result': result}

if __name__ == '__main__':
    import uvicorn
    print('\n*** BazaarAI Python Orchestrator v2.0 ***')
    print('API: http://localhost:8000/health')
    print('Docs: http://localhost:8000/docs\n')
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)

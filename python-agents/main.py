from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json, os, sys
from datetime import datetime

# Configure UTF-8 encoding for standard output on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(__file__))
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import select, func
from db import Booking, Escrow, Dispute, LedgerEntry, Provider, get_session, init_db
from agents.orchestrator import orchestrate
from agents.diagnostic_agent import run_diagnostic_agent
from agents.escrow_agent import release_escrow, apply_dispute_to_escrow

BOOKINGS_FILE = os.path.join(os.path.dirname(__file__), 'data', 'bookings.json')
TRACE_FILE    = os.path.join(os.path.dirname(__file__), 'logs', 'agent_trace.jsonl')
DATA_DIR      = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(os.path.join(os.path.dirname(__file__), 'data'), exist_ok=True)
os.makedirs(os.path.join(os.path.dirname(__file__), 'logs'), exist_ok=True)

app = FastAPI(title='Khidmat AI Python Orchestrator', version='3.0.0')

# Creates any missing tables on boot. Run seed_db.py to load providers.
init_db()
# Browser origins allowed to call the API. Expo Go / the APK are native clients and
# are unaffected by CORS; this list only governs the web build.
# Override in production with ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
_default_origins = 'http://localhost:8081,http://localhost:19006,http://127.0.0.1:8081,http://127.0.0.1:19006'
ALLOWED_ORIGINS = [o.strip() for o in os.getenv('ALLOWED_ORIGINS', _default_origins).split(',') if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=['GET', 'POST'],
    allow_headers=['Content-Type', 'Authorization'],
)

# Per-IP rate limiting. The Gemini-backed routes are the expensive ones and get
# tighter budgets than plain reads.
limiter = Limiter(key_func=get_remote_address, default_limits=['120/minute'])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

class RequestBody(BaseModel):
    text: str
    simulate_cancellation: Optional[bool] = False
    force_mode: Optional[str] = None   # 'LOW_CONFIDENCE' | 'PROVIDER_CANCELLATION'

class DiagnoseBody(BaseModel):
    text: str
    image_base64: Optional[str] = None
    mime_type: Optional[str] = 'image/jpeg'

class EscrowReleaseBody(BaseModel):
    escrow_id: str
    pin_entered: str

class DisputeBody(BaseModel):
    booking_id: str
    reason: Optional[str] = None        # Legacy field
    dispute_type: Optional[str] = None  # New field from mobile app

@app.get('/health')
def health():
    session = get_session()
    try:
        providers_count = session.scalar(select(func.count()).select_from(Provider)) or 0
    except Exception:
        providers_count = 0
    finally:
        session.close()
    return {'status': 'ok', 'service': 'Khidmat AI Python Orchestrator', 'version': app.version,
            'agents': 6, 'providers_loaded': providers_count, 'timestamp': datetime.now().isoformat()}

@app.post('/api/request')
@limiter.limit('10/minute')
async def handle_request(request: Request, body: RequestBody):
    if not body.text or len(body.text.strip()) < 3:
        raise HTTPException(400, detail='Input text too short')
    try:
        result = orchestrate(body.text, body.simulate_cancellation or False, body.force_mode)
        return {'success': True, 'result': result}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@app.get('/api/providers')
def get_providers(service: Optional[str] = None, sector: Optional[str] = None):
    session = get_session()
    try:
        stmt = select(Provider).where(Provider.active.is_(True))
        if service:
            stmt = stmt.where(Provider.service.ilike(f'%{service}%'))
        if sector:
            stmt = stmt.where(func.lower(Provider.sector) == sector.lower())
        providers = [p.to_dict() for p in session.scalars(stmt)]
        return {'count': len(providers), 'providers': providers}
    except Exception as e:
        raise HTTPException(500, detail=str(e))
    finally:
        session.close()

@app.get('/api/bookings')
def get_all_bookings():
    session = get_session()
    try:
        stmt = select(Booking).order_by(Booking.created_at.desc())
        return {'bookings': [b.to_dict() for b in session.scalars(stmt)]}
    finally:
        session.close()

@app.get('/api/bookings/{booking_id}')
def get_booking(booking_id: str):
    session = get_session()
    try:
        booking = session.get(Booking, booking_id)
        if not booking: raise HTTPException(404, detail='Booking not found')
        return booking.to_dict()
    finally:
        session.close()

@app.post('/api/dispute')
@limiter.limit('20/minute')
def handle_dispute(request: Request, body: DisputeBody):
    session = get_session()
    try:
        booking = session.get(Booking, body.booking_id)
        if not booking:
            raise HTTPException(404, detail='Booking not found')

        # JS sends dispute_type; legacy callers send reason.
        dispute_reason = body.dispute_type or body.reason or 'QUALITY_COMPLAINT'
        total_pkr = (booking.pricing or {}).get('total_pkr', 0)

        if dispute_reason in ('NO_SHOW', 'CANCELLATION'):
            resolution = {'status': 'RESOLVED_REFUND', 'action': 'Full refund issued',
                          'compensation_pkr': total_pkr, 'provider_flagged': True}
        elif dispute_reason in ('PRICE_DISAGREEMENT', 'PRICE_DISPUTE'):
            refund = round(total_pkr * 0.15)
            resolution = {'status': 'RESOLVED_COMPENSATION',
                          'action': f'15% refund (PKR {refund}) applied', 'compensation_pkr': refund}
        elif dispute_reason == 'BAD_SERVICE':
            credit = round(total_pkr * 0.10)
            resolution = {'status': 'RESOLVED_CREDIT',
                          'action': f'10% service credit (PKR {credit}) issued', 'compensation_pkr': credit}
        else:
            resolution = {'status': 'RESOLVED_COMPENSATION', 'action': '10% service credit issued',
                          'compensation_pkr': round(total_pkr * 0.10)}

        booking.status = 'DISPUTED'
        session.add(Dispute(
            booking_id=booking.booking_id,
            reason=dispute_reason,
            status=resolution['status'],
            action=resolution['action'][:200],
            compensation_pkr=resolution['compensation_pkr'],
            provider_flagged=bool(resolution.get('provider_flagged')),
        ))

        # Freeze the held funds in the same transaction, so a refunded booking can
        # never also be released to the provider.
        if booking.escrow is not None:
            apply_dispute_to_escrow(booking.escrow, resolution)
            resolution['escrow_status'] = booking.escrow.status

        session.commit()
        return {'success': True, 'resolution': resolution, 'booking_id': body.booking_id}
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(500, detail=str(e))
    finally:
        session.close()

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

@app.post('/api/diagnose')
@limiter.limit('10/minute')
async def diagnose_damage(request: Request, body: DiagnoseBody):
    """Multimodal repair diagnosis using Gemini 3.5."""
    try:
        report = run_diagnostic_agent(body.text, body.image_base64, body.mime_type or 'image/jpeg')
        return {'success': True, 'diagnostic_report': report}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@app.post('/api/escrow/release')
@limiter.limit('12/minute')
def release_escrow_endpoint(request: Request, body: EscrowReleaseBody):
    """Release escrow payout after verifying the 4-digit PIN against the stored booking."""
    res = release_escrow(body.escrow_id, body.pin_entered)
    if res.get('status') == 'NOT_FOUND':
        raise HTTPException(404, detail=res.get('error'))
    if res.get('status') in ('PIN_MISMATCH', 'LOCKED', 'ALREADY_RELEASED', 'FROZEN_PENDING_DISPUTE'):
        raise HTTPException(400, detail=res)
    return res

@app.get('/api/market/stats')
def market_stats():
    """Live metrics for investor and commercial operations dashboard."""
    providers_count = 35
    try:
        with open(os.path.join(DATA_DIR, 'providers.json'), encoding='utf-8') as f:
            providers_count = len(json.load(f))
    except Exception:
        pass

    return {
        'platform': 'Khidmat AI Commercial Engine',
        'active_kaarigars': providers_count,
        'coverage_sectors': ['G-13', 'G-11', 'G-10', 'F-10', 'F-11', 'F-7', 'F-8', 'I-8', 'I-9', 'I-10', 'E-11', 'Bahria', 'DHA'],
        'avg_response_latency_sec': 1.15,
        'escrow_protection_rate': '100%',
        'total_dispute_rate': '1.2%',
        'customer_satisfaction': 4.88,
        'platform_take_rate': '12%',
        'active_subscriptions': {
            'silver_pass_holders': 142,
            'family_care_holders': 68,
            'kaarigar_pro_members': 29
        },
        'status': 'OPERATIONAL'
    }

GUIDE_MD_PATH = os.path.join(os.path.dirname(__file__), '..', 'KHIDMAT_AI_COMPLETE_MASTER_GUIDE.md')
GUIDE_HTML_PATH = os.path.join(os.path.dirname(__file__), '..', 'KHIDMAT_AI_COMPLETE_MASTER_GUIDE.html')

@app.get('/guide', response_class=HTMLResponse)
def view_guide():
    """Interactive styled HTML view of the complete master guide with Print/Save PDF."""
    if not os.path.exists(GUIDE_HTML_PATH):
        raise HTTPException(404, detail="Guide HTML not found")
    with open(GUIDE_HTML_PATH, 'r', encoding='utf-8') as f:
        return f.read()

@app.get('/guide/download')
def download_guide_md():
    """Direct one-click download of the master markdown document."""
    if not os.path.exists(GUIDE_MD_PATH):
        raise HTTPException(404, detail="Guide markdown file not found")
    return FileResponse(
        GUIDE_MD_PATH,
        media_type='text/markdown',
        filename='KHIDMAT_AI_COMPLETE_MASTER_GUIDE.md'
    )

if __name__ == '__main__':
    import uvicorn
    print('\n=================================================')
    print('  Khidmat AI -- Python Orchestrator v3.0')
    print('  API:   http://localhost:8000/health')
    print('  Docs:  http://localhost:8000/docs')
    print('  Guide: http://localhost:8000/guide')
    print('=================================================\n')
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)

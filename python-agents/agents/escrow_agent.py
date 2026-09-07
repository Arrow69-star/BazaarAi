import json, os, uuid
from datetime import datetime
from filelock import FileLock

PLATFORM_COMMISSION_RATE = 0.12  # 12% platform fee
MAX_PIN_ATTEMPTS = 5

BOOKINGS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'bookings.json')
_LOCK_PATH = BOOKINGS_FILE + '.lock'

def calculate_escrow(service_type: str, urgency: str, is_pass_holder: bool = False,
                     pricing: dict = None) -> dict:
    """Calculates the escrow deposit breakdown and commission.

    The deposit must equal the price the customer was quoted, so `pricing` (the
    booking receipt's pricing block) is the source of truth when available;
    the fee-table estimate is only a fallback for callers without a quote."""
    surge_waived = is_pass_holder and urgency.lower() == 'emergency'

    if pricing:
        base = pricing.get('base_fee', 0)
        travel = pricing.get('distance_fee', 0)
        urgency_fee = pricing.get('urgency_fee', 0)
        surge_mult = pricing.get('surge_multiplier', 1.0) or 1.0
        total_est = int(pricing.get('total_pkr', base + travel + urgency_fee))
        if surge_waived and surge_mult > 1:
            total_est = int(round(total_est / surge_mult))
            surge_mult = 1.0
        breakdown = {
            'base_inspection_fee': base,
            'travel_fee': travel,
            'urgency_fee': urgency_fee,
            'surge_multiplier': surge_mult,
            'surge_waived': surge_waived,
        }
    else:
        base_fees = {
            'AC Repair': 600,
            'Plumbing': 400,
            'Electrician': 450,
            'Carpenter': 500,
            'Cleaning': 700,
            'Painter': 600,
        }
        base = base_fees.get(service_type, 500)
        est_labor = 1500
        surge_mult = 1.0 if is_pass_holder else (1.25 if urgency.lower() == 'emergency' else 1.0)
        total_est = int((base + est_labor) * surge_mult)
        breakdown = {
            'base_inspection_fee': base,
            'estimated_labor': est_labor,
            'surge_multiplier': surge_mult,
            'surge_waived': surge_waived,
        }

    platform_take = int(total_est * PLATFORM_COMMISSION_RATE)
    breakdown.update({
        'total_deposit_pkr': total_est,
        'platform_fee_pkr': platform_take,
        'kaarigar_payout_pkr': total_est - platform_take,
    })

    return {
        'escrow_id': f"ESC-{str(uuid.uuid4())[:6].upper()}",
        'status': 'HOLD_IN_ESCROW',
        'currency': 'PKR',
        'breakdown': breakdown,
        'completion_pin': str(uuid.uuid4().int % 9000 + 1000),
        'payment_methods_supported': ['EasyPaisa', 'JazzCash', 'Raast', 'Nayapay', 'Cash on Escrow'],
        'created_at': datetime.now().isoformat()
    }

def attach_escrow_to_booking(booking_id: str, escrow: dict) -> bool:
    """Persists the escrow record (including its completion PIN) onto the stored
    booking, so release can verify against server-held state."""
    with FileLock(_LOCK_PATH):
        if not os.path.exists(BOOKINGS_FILE):
            return False
        with open(BOOKINGS_FILE, 'r', encoding='utf-8') as f:
            db = json.load(f)
        for b in db.get('bookings', []):
            if b.get('booking_id') == booking_id:
                b['escrow'] = escrow
                with open(BOOKINGS_FILE, 'w', encoding='utf-8') as f:
                    json.dump(db, f, indent=2)
                return True
    return False


def apply_dispute_to_escrow(escrow: dict, resolution: dict) -> dict:
    """Reflects a dispute resolution on held funds, so a promised refund can't also
    be released to the kaarigar. Mutates and returns the escrow dict."""
    if not escrow or escrow.get('status') == 'RELEASED_TO_KAARIGAR':
        return escrow

    compensation = resolution.get('compensation_pkr') or 0
    deposit = (escrow.get('breakdown') or {}).get('total_deposit_pkr') or 0

    if deposit and compensation >= deposit:
        escrow['status'] = 'REFUNDED_TO_CUSTOMER'
    elif compensation > 0:
        escrow['status'] = 'PARTIALLY_REFUNDED'
    else:
        escrow['status'] = 'FROZEN_PENDING_DISPUTE'

    escrow['refunded_pkr'] = compensation
    escrow['dispute_applied_at'] = datetime.now().isoformat()
    return escrow


def release_escrow(escrow_id: str, pin_entered: str) -> dict:
    """Releases escrow funds to the kaarigar if the entered completion PIN matches
    the one stored on the booking. The correct PIN is never accepted from the caller."""
    with FileLock(_LOCK_PATH):
        if not os.path.exists(BOOKINGS_FILE):
            return {'escrow_id': escrow_id, 'status': 'NOT_FOUND',
                    'error': 'No escrow found for that ID.', 'released_at': None}

        with open(BOOKINGS_FILE, 'r', encoding='utf-8') as f:
            db = json.load(f)

        booking = next((b for b in db.get('bookings', [])
                        if (b.get('escrow') or {}).get('escrow_id') == escrow_id), None)
        if not booking:
            return {'escrow_id': escrow_id, 'status': 'NOT_FOUND',
                    'error': 'No escrow found for that ID.', 'released_at': None}

        escrow = booking['escrow']

        if escrow.get('status') in ('REFUNDED_TO_CUSTOMER', 'PARTIALLY_REFUNDED', 'FROZEN_PENDING_DISPUTE'):
            return {'escrow_id': escrow_id, 'status': 'FROZEN_PENDING_DISPUTE',
                    'error': 'These funds are frozen by an open dispute and cannot be released.',
                    'released_at': None}

        if escrow.get('status') == 'RELEASED_TO_KAARIGAR':
            return {'escrow_id': escrow_id, 'status': 'ALREADY_RELEASED',
                    'error': 'These funds have already been released.',
                    'released_at': escrow.get('released_at')}

        attempts = escrow.get('failed_pin_attempts', 0)
        if attempts >= MAX_PIN_ATTEMPTS:
            return {'escrow_id': escrow_id, 'status': 'LOCKED',
                    'error': 'Too many incorrect PIN attempts. Contact support to release these funds.',
                    'released_at': None}

        if str(pin_entered).strip() != str(escrow.get('completion_pin')):
            escrow['failed_pin_attempts'] = attempts + 1
            with open(BOOKINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(db, f, indent=2)
            return {'escrow_id': escrow_id, 'status': 'PIN_MISMATCH',
                    'error': 'Invalid 4-digit completion PIN. Escrow remains secured.',
                    'attempts_remaining': MAX_PIN_ATTEMPTS - (attempts + 1),
                    'released_at': None}

        released_at = datetime.now().isoformat()
        escrow['status'] = 'RELEASED_TO_KAARIGAR'
        escrow['released_at'] = released_at
        booking['status'] = 'COMPLETED'
        with open(BOOKINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(db, f, indent=2)

        return {
            'escrow_id': escrow_id,
            'booking_id': booking.get('booking_id'),
            'status': 'RELEASED_TO_KAARIGAR',
            'message': 'Funds successfully released to kaarigar wallet.',
            'payout_pkr': escrow.get('breakdown', {}).get('kaarigar_payout_pkr'),
            'released_at': released_at,
        }

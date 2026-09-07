import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from db import Booking, Escrow, LedgerEntry, get_session

PLATFORM_COMMISSION_RATE = 0.12  # 12% platform fee
MAX_PIN_ATTEMPTS = 5

_FROZEN_STATUSES = ('REFUNDED_TO_CUSTOMER', 'PARTIALLY_REFUNDED', 'FROZEN_PENDING_DISPUTE')


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
    """Persists the escrow (including its completion PIN) against the booking, so
    release can verify against server-held state."""
    session = get_session()
    try:
        if session.get(Booking, booking_id) is None:
            return False

        breakdown = escrow.get('breakdown') or {}
        session.add(Escrow(
            escrow_id=escrow['escrow_id'],
            booking_id=booking_id,
            status=escrow.get('status', 'HOLD_IN_ESCROW'),
            currency=escrow.get('currency', 'PKR'),
            total_deposit_pkr=breakdown.get('total_deposit_pkr', 0),
            platform_fee_pkr=breakdown.get('platform_fee_pkr', 0),
            kaarigar_payout_pkr=breakdown.get('kaarigar_payout_pkr', 0),
            breakdown=breakdown,
            completion_pin=str(escrow.get('completion_pin', '')),
            payment_methods_supported=escrow.get('payment_methods_supported') or [],
        ))
        session.commit()
        return True
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def apply_dispute_to_escrow(escrow: 'Escrow', resolution: dict) -> dict:
    """Reflects a dispute resolution on held funds, so a promised refund cannot also
    be released to the kaarigar. Mutates the Escrow row; the caller commits."""
    if escrow is None or escrow.status == 'RELEASED_TO_KAARIGAR':
        return escrow

    compensation = resolution.get('compensation_pkr') or 0
    deposit = escrow.total_deposit_pkr or 0

    if deposit and compensation >= deposit:
        escrow.status = 'REFUNDED_TO_CUSTOMER'
    elif compensation > 0:
        escrow.status = 'PARTIALLY_REFUNDED'
    else:
        escrow.status = 'FROZEN_PENDING_DISPUTE'

    escrow.refunded_pkr = compensation
    return escrow


def release_escrow(escrow_id: str, pin_entered: str) -> dict:
    """Releases escrow funds to the kaarigar if the entered completion PIN matches the
    one stored against the booking. The correct PIN is never accepted from the caller."""
    session = get_session()
    try:
        escrow = session.get(Escrow, escrow_id)
        if escrow is None:
            return {'escrow_id': escrow_id, 'status': 'NOT_FOUND',
                    'error': 'No escrow found for that ID.', 'released_at': None}

        if escrow.status in _FROZEN_STATUSES:
            return {'escrow_id': escrow_id, 'status': 'FROZEN_PENDING_DISPUTE',
                    'error': 'These funds are frozen by an open dispute and cannot be released.',
                    'released_at': None}

        if escrow.status == 'RELEASED_TO_KAARIGAR':
            return {'escrow_id': escrow_id, 'status': 'ALREADY_RELEASED',
                    'error': 'These funds have already been released.',
                    'released_at': escrow.released_at.isoformat() if escrow.released_at else None}

        if escrow.failed_pin_attempts >= MAX_PIN_ATTEMPTS:
            return {'escrow_id': escrow_id, 'status': 'LOCKED',
                    'error': 'Too many incorrect PIN attempts. Contact support to release these funds.',
                    'released_at': None}

        if str(pin_entered).strip() != str(escrow.completion_pin):
            escrow.failed_pin_attempts += 1
            remaining = MAX_PIN_ATTEMPTS - escrow.failed_pin_attempts
            session.commit()
            return {'escrow_id': escrow_id, 'status': 'PIN_MISMATCH',
                    'error': 'Invalid 4-digit completion PIN. Escrow remains secured.',
                    'attempts_remaining': remaining, 'released_at': None}

        released_at = datetime.now(timezone.utc)
        escrow.status = 'RELEASED_TO_KAARIGAR'
        escrow.released_at = released_at

        booking = session.get(Booking, escrow.booking_id)
        if booking is not None:
            booking.status = 'COMPLETED'

        # Money moved, so record what the platform earned and what the provider is owed.
        session.add(LedgerEntry(
            booking_id=escrow.booking_id,
            provider_id=(booking.provider_id if booking else '') or '',
            gross_pkr=escrow.total_deposit_pkr,
            commission_pkr=escrow.platform_fee_pkr,
            payout_pkr=escrow.kaarigar_payout_pkr,
            commission_rate=PLATFORM_COMMISSION_RATE,
            entry_type='ESCROW_RELEASED',
        ))
        session.commit()

        return {
            'escrow_id': escrow_id,
            'booking_id': escrow.booking_id,
            'status': 'RELEASED_TO_KAARIGAR',
            'message': 'Funds successfully released to kaarigar wallet.',
            'payout_pkr': escrow.kaarigar_payout_pkr,
            'platform_fee_pkr': escrow.platform_fee_pkr,
            'released_at': released_at.isoformat(),
        }
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

"""Seeds the database from the legacy flat-JSON stores.

Idempotent: re-running updates existing rows rather than duplicating them, so it is
safe to run after editing data/providers.json.

    python python-agents/seed_db.py
"""
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from db import Booking, Escrow, Dispute, Provider, get_session, init_db  # noqa: E402

PROVIDERS_JSON = os.path.join(os.path.dirname(__file__), '..', 'data', 'providers.json')
BOOKINGS_JSON = os.path.join(os.path.dirname(__file__), 'data', 'bookings.json')

_PROVIDER_FIELDS = (
    'name', 'service', 'lat', 'sector', 'city', 'rating', 'price_base',
    'reliability_score', 'cancellation_rate', 'specialization',
    'review_sentiment_score', 'experience_years', 'phone', 'verified',
    'service_duration_minutes',
)


def _parse_dt(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def seed_providers(session) -> tuple[int, int]:
    if not os.path.exists(PROVIDERS_JSON):
        print(f'  providers.json not found at {PROVIDERS_JSON}')
        return 0, 0

    with open(PROVIDERS_JSON, encoding='utf-8') as f:
        raw = json.load(f)

    created = updated = 0
    for p in raw:
        row = session.get(Provider, p['id'])
        if row is None:
            row = Provider(id=p['id'])
            session.add(row)
            created += 1
        else:
            updated += 1

        for field in _PROVIDER_FIELDS:
            if field in p:
                setattr(row, field, p[field])
        # providers.json uses "lng"; the column matches, but be explicit about the
        # slots list since it is JSON rather than a scalar.
        row.lng = p.get('lng', getattr(row, 'lng', 0.0))
        row.availability_slots = p.get('availability_slots', [])

    return created, updated


def seed_bookings(session) -> tuple[int, int]:
    """Carries over historical bookings, including any escrow/dispute already attached."""
    if not os.path.exists(BOOKINGS_JSON):
        print('  no legacy bookings.json - skipping')
        return 0, 0

    with open(BOOKINGS_JSON, encoding='utf-8') as f:
        db_json = json.load(f)

    booking_count = escrow_count = 0
    for b in db_json.get('bookings', []):
        bid = b.get('booking_id')
        if not bid or session.get(Booking, bid):
            continue

        provider = b.get('provider') or {}
        session.add(Booking(
            booking_id=bid,
            provider_id=provider.get('id'),
            provider_name=b.get('provider_name') or provider.get('name', ''),
            provider_snapshot=provider,
            service=b.get('service') or '',
            location=b.get('location') or '',
            time_slot=b.get('time_slot') or '',
            time_preference=b.get('time_preference') or '',
            status=b.get('status', 'CONFIRMED'),
            pricing=b.get('pricing') or {},
            confirmation_message=(b.get('confirmation_message') or '')[:400],
            notification=b.get('notification') or {},
            created_at=_parse_dt(b.get('created_at')) or datetime.utcnow(),
        ))
        booking_count += 1

        esc = b.get('escrow')
        if esc and esc.get('escrow_id') and not session.get(Escrow, esc['escrow_id']):
            breakdown = esc.get('breakdown') or {}
            session.add(Escrow(
                escrow_id=esc['escrow_id'],
                booking_id=bid,
                status=esc.get('status', 'HOLD_IN_ESCROW'),
                currency=esc.get('currency', 'PKR'),
                total_deposit_pkr=breakdown.get('total_deposit_pkr', 0),
                platform_fee_pkr=breakdown.get('platform_fee_pkr', 0),
                kaarigar_payout_pkr=breakdown.get('kaarigar_payout_pkr', 0),
                breakdown=breakdown,
                completion_pin=str(esc.get('completion_pin', '')),
                failed_pin_attempts=esc.get('failed_pin_attempts', 0),
                refunded_pkr=esc.get('refunded_pkr', 0),
                payment_methods_supported=esc.get('payment_methods_supported') or [],
                created_at=_parse_dt(esc.get('created_at')) or datetime.utcnow(),
                released_at=_parse_dt(esc.get('released_at')),
            ))
            escrow_count += 1

        dsp = b.get('dispute')
        if dsp:
            session.add(Dispute(
                booking_id=bid,
                reason=dsp.get('reason', ''),
                status=dsp.get('status', ''),
                action=(dsp.get('action') or '')[:200],
                compensation_pkr=dsp.get('compensation_pkr', 0),
                provider_flagged=bool(dsp.get('provider_flagged')),
                filed_at=_parse_dt(dsp.get('filed_at')) or datetime.utcnow(),
            ))

    return booking_count, escrow_count


def main():
    init_db()
    session = get_session()
    try:
        created, updated = seed_providers(session)
        print(f'  providers: {created} created, {updated} updated')
        bookings, escrows = seed_bookings(session)
        print(f'  bookings:  {bookings} migrated ({escrows} with escrow)')
        session.commit()
        print('Seed complete.')
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == '__main__':
    main()

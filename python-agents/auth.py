"""Phone-number OTP authentication.

Phone + one-time code is the norm for this market, so there are no passwords to
store or reset. A verified code issues a JWT that the mobile client sends as
`Authorization: Bearer <token>`.

Codes are stored hashed with a short expiry and an attempt cap. Until an SMS
provider is wired up (Phase 4) the code cannot actually be delivered, so in that
state only it is returned in the response for development — see DELIVERY_CONFIGURED.
"""
import hashlib
import hmac
import os
import random
import secrets
import sys
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select

sys.path.insert(0, os.path.dirname(__file__))
from db import OtpCode, User, get_session  # noqa: E402

JWT_ALGORITHM = 'HS256'
TOKEN_TTL_DAYS = 30
OTP_TTL_MINUTES = 5
MAX_OTP_ATTEMPTS = 5

# A generated secret means every restart invalidates existing tokens, which is fine
# for development but would sign people out constantly in production.
JWT_SECRET = os.getenv('JWT_SECRET')
if not JWT_SECRET:
    JWT_SECRET = secrets.token_urlsafe(48)
    print('[auth] WARNING: JWT_SECRET not set - generated an ephemeral one. '
          'Set JWT_SECRET in the environment so tokens survive a restart.')

# No SMS provider yet, so codes cannot be delivered to a handset.
DELIVERY_CONFIGURED = bool(os.getenv('SMS_PROVIDER_KEY') or os.getenv('WHATSAPP_TOKEN'))
if not DELIVERY_CONFIGURED:
    print('[auth] WARNING: no SMS provider configured - OTP codes are returned in the '
          'API response for development. Set SMS_PROVIDER_KEY before going live.')


def _now():
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    """SQLite hands back naive datetimes; compare them in UTC."""
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def normalise_phone(phone: str) -> str:
    """Reduce Pakistani numbers to a single canonical form: +923001234567."""
    digits = ''.join(ch for ch in (phone or '') if ch.isdigit())
    if digits.startswith('0092'):
        digits = digits[4:]
    elif digits.startswith('92'):
        digits = digits[2:]
    elif digits.startswith('0'):
        digits = digits[1:]
    if not digits:
        raise HTTPException(400, detail='A phone number is required.')
    if len(digits) < 9 or len(digits) > 11:
        raise HTTPException(400, detail='That does not look like a valid phone number.')
    return '+92' + digits


def _hash_code(phone: str, code: str) -> str:
    return hashlib.sha256(f'{JWT_SECRET}:{phone}:{code}'.encode()).hexdigest()


def create_otp(phone: str) -> str:
    """Issues a fresh code, invalidating any earlier unused ones for that number."""
    phone = normalise_phone(phone)
    code = f'{random.randint(0, 999999):06d}'

    session = get_session()
    try:
        stale = session.scalars(
            select(OtpCode).where(OtpCode.phone == phone, OtpCode.consumed.is_(False))
        )
        for row in stale:
            row.consumed = True

        session.add(OtpCode(
            phone=phone,
            code_hash=_hash_code(phone, code),
            expires_at=_now() + timedelta(minutes=OTP_TTL_MINUTES),
        ))
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    return code


def verify_otp(phone: str, code: str) -> str:
    """Checks a code and returns a signed JWT. Raises HTTPException on failure."""
    phone = normalise_phone(phone)
    session = get_session()
    try:
        otp = session.scalars(
            select(OtpCode)
            .where(OtpCode.phone == phone, OtpCode.consumed.is_(False))
            .order_by(OtpCode.created_at.desc())
        ).first()

        if otp is None:
            raise HTTPException(400, detail='No active code for that number. Request a new one.')

        if _as_utc(otp.expires_at) < _now():
            otp.consumed = True
            session.commit()
            raise HTTPException(400, detail='That code has expired. Request a new one.')

        if otp.attempts >= MAX_OTP_ATTEMPTS:
            otp.consumed = True
            session.commit()
            raise HTTPException(429, detail='Too many incorrect attempts. Request a new code.')

        # Constant-time compare so a wrong code cannot be probed by timing.
        if not hmac.compare_digest(otp.code_hash, _hash_code(phone, str(code).strip())):
            otp.attempts += 1
            remaining = MAX_OTP_ATTEMPTS - otp.attempts
            session.commit()
            raise HTTPException(400, detail=f'Incorrect code. {remaining} attempt(s) remaining.')

        otp.consumed = True

        user = session.scalars(select(User).where(User.phone == phone)).first()
        if user is None:
            user = User(phone=phone)
            session.add(user)
            session.flush()

        session.commit()
        return issue_token(user.id, phone, user.role)
    except HTTPException:
        session.rollback()
        raise
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def issue_token(user_id: int, phone: str, role: str = 'customer') -> str:
    payload = {
        'sub': str(user_id),
        'phone': phone,
        'role': role,
        'iat': int(_now().timestamp()),
        'exp': int((_now() + timedelta(days=TOKEN_TTL_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, detail='Session expired. Please sign in again.')
    except jwt.InvalidTokenError:
        raise HTTPException(401, detail='Invalid authentication token.')


def _token_from(request: Request) -> str | None:
    header = request.headers.get('Authorization') or ''
    if header.lower().startswith('bearer '):
        return header[7:].strip()
    return None


def optional_user(request: Request) -> dict | None:
    """For routes that work anonymously but personalise when signed in."""
    token = _token_from(request)
    if not token:
        return None
    try:
        return _decode(token)
    except HTTPException:
        return None


def current_user(request: Request) -> dict:
    """For routes that require a signed-in caller."""
    token = _token_from(request)
    if not token:
        raise HTTPException(401, detail='Sign in to continue.')
    return _decode(token)


def admin_user(claims: dict = Depends(current_user)) -> dict:
    if claims.get('role') != 'admin':
        raise HTTPException(403, detail='Admin access required.')
    return claims

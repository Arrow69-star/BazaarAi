"""Data layer for Khidmat AI.

SQLite by default so it runs with no infrastructure; point DATABASE_URL at Postgres
(e.g. postgresql+psycopg://user:pass@host/db) to move without touching the models.

Replaces the previous flat-JSON stores, which had no schema, no transactions, and
kept escrow separate from the booking it belonged to.
"""
import os
from datetime import datetime, timezone

from sqlalchemy import (create_engine, String, Integer, Float, Boolean, DateTime,
                        ForeignKey, JSON)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

_DEFAULT_SQLITE = 'sqlite:///' + os.path.join(os.path.dirname(__file__), 'data', 'khidmat.db')
DATABASE_URL = os.getenv('DATABASE_URL', _DEFAULT_SQLITE)

os.makedirs(os.path.join(os.path.dirname(__file__), 'data'), exist_ok=True)

# check_same_thread is SQLite-only; FastAPI serves requests across threads.
_connect_args = {'check_same_thread': False} if DATABASE_URL.startswith('sqlite') else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, future=True)


def _now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Provider(Base):
    __tablename__ = 'providers'

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    service: Mapped[str] = mapped_column(String(64), index=True)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    sector: Mapped[str] = mapped_column(String(32), index=True, default='')
    city: Mapped[str] = mapped_column(String(64), default='Islamabad')
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    availability_slots: Mapped[list] = mapped_column(JSON, default=list)
    price_base: Mapped[int] = mapped_column(Integer, default=1000)
    reliability_score: Mapped[float] = mapped_column(Float, default=0.9)
    cancellation_rate: Mapped[float] = mapped_column(Float, default=0.05)
    specialization: Mapped[str] = mapped_column(String(120), default='')
    review_sentiment_score: Mapped[float] = mapped_column(Float, default=0.0)
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    phone: Mapped[str] = mapped_column(String(32), default='')
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    service_duration_minutes: Mapped[int] = mapped_column(Integer, default=60)

    # Monetization (Phase 3): 'free' ranks normally, 'featured' is a paid placement.
    tier: Mapped[str] = mapped_column(String(16), default='free')
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    def to_dict(self) -> dict:
        """The shape the agents already expect, so ranking/pricing need no changes."""
        return {
            'id': self.id, 'name': self.name, 'service': self.service,
            'lat': self.lat, 'lng': self.lng, 'sector': self.sector, 'city': self.city,
            'rating': self.rating, 'availability_slots': self.availability_slots or [],
            'price_base': self.price_base, 'reliability_score': self.reliability_score,
            'cancellation_rate': self.cancellation_rate, 'specialization': self.specialization,
            'review_sentiment_score': self.review_sentiment_score,
            'experience_years': self.experience_years, 'phone': self.phone,
            'verified': self.verified,
            'service_duration_minutes': self.service_duration_minutes,
            'tier': self.tier,
        }


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), default='')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Booking(Base):
    __tablename__ = 'bookings'

    booking_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=True, index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey('providers.id'), nullable=True, index=True)
    provider_name: Mapped[str] = mapped_column(String(160), default='')
    provider_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)

    service: Mapped[str] = mapped_column(String(64), default='')
    location: Mapped[str] = mapped_column(String(64), default='')
    time_slot: Mapped[str] = mapped_column(String(32), default='')
    time_preference: Mapped[str] = mapped_column(String(64), default='')
    status: Mapped[str] = mapped_column(String(32), default='CONFIRMED', index=True)
    pricing: Mapped[dict] = mapped_column(JSON, default=dict)
    confirmation_message: Mapped[str] = mapped_column(String(400), default='')
    notification: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    escrow: Mapped['Escrow'] = relationship(back_populates='booking', uselist=False,
                                            cascade='all, delete-orphan')
    dispute: Mapped['Dispute'] = relationship(back_populates='booking', uselist=False,
                                              cascade='all, delete-orphan')

    def to_dict(self) -> dict:
        d = {
            'booking_id': self.booking_id,
            'status': self.status,
            'provider_name': self.provider_name,
            'provider': self.provider_snapshot or {},
            'service': self.service,
            'location': self.location,
            'time_slot': self.time_slot,
            'time_preference': self.time_preference,
            'pricing': self.pricing or {},
            'confirmation_message': self.confirmation_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if self.notification:
            d['notification'] = self.notification
        if self.escrow:
            d['escrow'] = self.escrow.to_dict()
        if self.dispute:
            d['dispute'] = self.dispute.to_dict()
        return d


class Escrow(Base):
    __tablename__ = 'escrows'

    escrow_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    booking_id: Mapped[str] = mapped_column(ForeignKey('bookings.booking_id'), index=True)
    status: Mapped[str] = mapped_column(String(32), default='HOLD_IN_ESCROW', index=True)
    currency: Mapped[str] = mapped_column(String(8), default='PKR')

    total_deposit_pkr: Mapped[int] = mapped_column(Integer, default=0)
    platform_fee_pkr: Mapped[int] = mapped_column(Integer, default=0)
    kaarigar_payout_pkr: Mapped[int] = mapped_column(Integer, default=0)
    breakdown: Mapped[dict] = mapped_column(JSON, default=dict)

    # Verified server-side only; never accepted from a client request.
    completion_pin: Mapped[str] = mapped_column(String(8), default='')
    failed_pin_attempts: Mapped[int] = mapped_column(Integer, default=0)
    refunded_pkr: Mapped[int] = mapped_column(Integer, default=0)

    payment_methods_supported: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    released_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    booking: Mapped['Booking'] = relationship(back_populates='escrow')

    def to_dict(self) -> dict:
        return {
            'escrow_id': self.escrow_id,
            'status': self.status,
            'currency': self.currency,
            'breakdown': self.breakdown or {},
            'completion_pin': self.completion_pin,
            'failed_pin_attempts': self.failed_pin_attempts,
            'payment_methods_supported': self.payment_methods_supported or [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'released_at': self.released_at.isoformat() if self.released_at else None,
        }


class Dispute(Base):
    __tablename__ = 'disputes'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[str] = mapped_column(ForeignKey('bookings.booking_id'), index=True)
    reason: Mapped[str] = mapped_column(String(64), default='')
    status: Mapped[str] = mapped_column(String(48), default='')
    action: Mapped[str] = mapped_column(String(200), default='')
    compensation_pkr: Mapped[int] = mapped_column(Integer, default=0)
    provider_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    filed_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    booking: Mapped['Booking'] = relationship(back_populates='dispute')

    def to_dict(self) -> dict:
        return {'reason': self.reason, 'status': self.status, 'action': self.action,
                'compensation_pkr': self.compensation_pkr,
                'provider_flagged': self.provider_flagged,
                'filed_at': self.filed_at.isoformat() if self.filed_at else None}


class Review(Base):
    """Only ever written from a real customer submission - never generated."""
    __tablename__ = 'reviews'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[str] = mapped_column(ForeignKey('bookings.booking_id'), index=True)
    provider_id: Mapped[str] = mapped_column(ForeignKey('providers.id'), index=True)
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(String(1000), default='')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class LedgerEntry(Base):
    """One row per money event: what the platform earned, what the provider is owed."""
    __tablename__ = 'ledger_entries'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    booking_id: Mapped[str] = mapped_column(ForeignKey('bookings.booking_id'), index=True)
    provider_id: Mapped[str] = mapped_column(String(32), index=True)
    gross_pkr: Mapped[int] = mapped_column(Integer, default=0)
    commission_pkr: Mapped[int] = mapped_column(Integer, default=0)
    payout_pkr: Mapped[int] = mapped_column(Integer, default=0)
    commission_rate: Mapped[float] = mapped_column(Float, default=0.0)
    entry_type: Mapped[str] = mapped_column(String(32), default='ESCROW_RELEASED')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


def init_db():
    """Create any missing tables. Safe to call on every startup."""
    Base.metadata.create_all(engine)


def get_session():
    return SessionLocal()

-- ═══════════════════════════════════════════════════════════════
-- BazaarAI Orchestrator — Supabase Database Schema
-- Run this in your Supabase SQL Editor at supabase.com/dashboard
-- ═══════════════════════════════════════════════════════════════

-- Clean slate (safe to re-run)
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TYPE IF EXISTS job_complexity CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS dispute_reason CASCADE;
DROP TYPE IF EXISTS dispute_status CASCADE;

-- ─── ENUMS ────────────────────────────────────────────────────
CREATE TYPE job_complexity   AS ENUM ('BASIC', 'INTERMEDIATE', 'COMPLEX');
CREATE TYPE booking_status   AS ENUM ('PENDING_MATCH','CONFIRMED','EN_ROUTE','IN_PROGRESS','COMPLETED','CANCELLED','DISPUTED');
CREATE TYPE dispute_reason   AS ENUM ('NO_SHOW','PRICE_DISAGREEMENT','QUALITY_COMPLAINT');
CREATE TYPE dispute_status   AS ENUM ('OPEN','RESOLVED_REFUND','RESOLVED_COMPENSATION','ESCALATED');

-- ─── PROVIDERS ────────────────────────────────────────────────
CREATE TABLE providers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  phone                TEXT NOT NULL,
  service_category     TEXT NOT NULL,
  specialization       TEXT[] NOT NULL DEFAULT '{}',
  latitude             DOUBLE PRECISION NOT NULL,
  longitude            DOUBLE PRECISION NOT NULL,
  rating               NUMERIC(3,2) NOT NULL DEFAULT 4.5 CHECK (rating BETWEEN 0 AND 5),
  review_recency_days  INT NOT NULL DEFAULT 7,
  on_time_score        NUMERIC(3,2) NOT NULL DEFAULT 0.90 CHECK (on_time_score BETWEEN 0 AND 1),
  cancellation_rate    NUMERIC(3,2) NOT NULL DEFAULT 0.05 CHECK (cancellation_rate BETWEEN 0 AND 1),
  base_rate_pkr        NUMERIC NOT NULL DEFAULT 1000,
  is_available         BOOLEAN NOT NULL DEFAULT TRUE,
  daily_jobs_completed INT NOT NULL DEFAULT 0,
  years_experience     INT NOT NULL DEFAULT 3,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BOOKINGS ─────────────────────────────────────────────────
CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_query          TEXT NOT NULL,
  extracted_service   TEXT,
  extracted_location  TEXT,
  extracted_time      TEXT,
  complexity          job_complexity DEFAULT 'BASIC',
  provider_id         UUID REFERENCES providers(id) ON DELETE SET NULL,
  final_quote_pkr     NUMERIC,
  status              booking_status DEFAULT 'PENDING_MATCH',
  antigravity_trace   JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score    NUMERIC(4,3),
  fallback_triggered  BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DISPUTES ─────────────────────────────────────────────────
CREATE TABLE disputes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID REFERENCES bookings(id) ON DELETE CASCADE,
  reason            dispute_reason NOT NULL,
  status            dispute_status DEFAULT 'OPEN',
  resolution_notes  TEXT,
  compensation_pkr  NUMERIC DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────
CREATE INDEX idx_providers_category    ON providers(service_category);
CREATE INDEX idx_providers_available   ON providers(is_available);
CREATE INDEX idx_bookings_status       ON bookings(status);
CREATE INDEX idx_bookings_created      ON bookings(created_at DESC);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes  ENABLE ROW LEVEL SECURITY;

-- Allow anon read for providers (public marketplace)
CREATE POLICY "Public read providers" ON providers FOR SELECT USING (true);
CREATE POLICY "Public insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read bookings"   ON bookings FOR SELECT USING (true);
CREATE POLICY "Public insert disputes" ON disputes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read disputes"   ON disputes FOR SELECT USING (true);

-- ─── SEED DATA — Islamabad/Rawalpindi Providers ───────────────
INSERT INTO providers (name, phone, service_category, specialization, latitude, longitude, rating, review_recency_days, on_time_score, cancellation_rate, base_rate_pkr, is_available, daily_jobs_completed, years_experience) VALUES

-- AC Repair Providers
('ColdBreeze AC Experts',    '+923001234567', 'AC Repair', '{"Inverter","Compressor","Gas Refill","General Cleaning"}', 33.6844, 73.0479, 4.84, 1,  0.96, 0.02, 1500, TRUE,  1, 18),
('Ali AC Services G-13',     '+923007654321', 'AC Repair', '{"Window AC","Gas Leak","Inverter"}',                       33.6750, 73.0380, 4.71, 3,  0.88, 0.05, 1200, TRUE,  2, 12),
('QuickFix HVAC',            '+923009876543', 'AC Repair', '{"General Cleaning","Window AC"}',                         33.6610, 73.0200, 4.45, 12, 0.80, 0.10, 1000, TRUE,  3,  8),
('TechCool Islamabad',       '+923003210987', 'AC Repair', '{"Inverter","Chiller","Compressor","VRF Systems"}',         33.7200, 73.0800, 4.92, 2,  0.99, 0.01, 2500, TRUE,  0, 22),
('AirPro Solutions',         '+923005678901', 'AC Repair', '{"Gas Refill","Compressor","General Cleaning"}',            33.6500, 73.0100, 4.30, 8,  0.82, 0.09, 1100, TRUE,  4,  6),

-- Plumbing Providers
('Khan Plumbing & Gas',      '+923002345678', 'Plumbing',  '{"Pipe Repair","Gas Leak","Drainage","Flush Tank"}',        33.6820, 73.0450, 4.78, 2,  0.94, 0.03, 1200, TRUE,  1, 15),
('Master Plumber Islamabad', '+923008765432', 'Plumbing',  '{"Water Pump","Pipe Fitting","Bathroom Fixtures"}',         33.6700, 73.0350, 4.50, 7,  0.87, 0.08, 1000, TRUE,  2, 10),
('SwiftFix Plumbers',        '+923004567890', 'Plumbing',  '{"Drainage","Flush Tank","Pipe Repair"}',                   33.6600, 73.0250, 4.20, 15, 0.78, 0.13, 900,  TRUE,  5,  7),

-- Electrician Providers
('Bajwa Electric Works',     '+923006789012', 'Electrician','{"Wiring","MCB Panel","Short Circuit","UPS"}',             33.6890, 73.0520, 4.88, 1,  0.97, 0.02, 1400, TRUE,  1, 20),
('SafeWire Electricians',    '+923001357924', 'Electrician','{"Fan Installation","Light Fitting","Wiring"}',            33.6720, 73.0400, 4.60, 5,  0.90, 0.06, 1100, TRUE,  2, 11),
('PowerFix Rawalpindi',      '+923009753108', 'Electrician','{"Generator","Inverter Wiring","Solar Panel"}',            33.6400, 72.9900, 4.40, 10, 0.83, 0.10, 1300, TRUE,  3,  9),

-- Carpenter Providers
('Ustad Furniture Works',    '+923002468013', 'Carpenter', '{"Door Repair","Cabinet","Sofa Repair","Polishing"}',       33.6780, 73.0430, 4.75, 3,  0.92, 0.04, 1300, TRUE,  1, 16),
('WoodCraft Islamabad',      '+923008642975', 'Carpenter', '{"Furniture Assembly","Door","Window Frames"}',             33.6630, 73.0280, 4.35, 9,  0.85, 0.08, 1000, TRUE,  2,  8);

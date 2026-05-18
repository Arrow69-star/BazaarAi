/**
 * BazaarAI Backend — Express.js Server
 * REST API for the mobile app
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Import routes ───────────────────────────────────────────────
const { orchestrate } = require('../agents/orchestrator');
const LOGS_DIR = path.join(__dirname, '..', 'logs');
const DATA_DIR = path.join(__dirname, '..', 'data');
const BOOKINGS_FILE = path.join(LOGS_DIR, 'bookings_db.json');

// ─── Request Logger Middleware ────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'BazaarAI Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    agents: 15,
    providers_loaded: JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'providers.json'), 'utf-8')).length
  });
});

// ─── MAIN: Full Pipeline ───────────────────────────────────────────
app.post('/api/request', async (req, res) => {
  const { text, simulate_cancellation, simulate_price_dispute } = req.body;

  if (!text || text.trim().length < 3) {
    return res.status(400).json({
      error: 'Input text too short',
      hint: 'Example: "Mujhe kal subah G-13 mein AC technician chahiye, budget kam hai"'
    });
  }

  try {
    const result = await orchestrate(text, {
      simulateCancellation: simulate_cancellation || false,
      simulatePriceDispute: simulate_price_dispute || false
    });
    res.json({ success: true, result });
  } catch (err) {
    console.error('[API ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Providers List ────────────────────────────────────────────────
app.get('/api/providers', (req, res) => {
  try {
    const providers = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'providers.json'), 'utf-8'));
    const { service, sector } = req.query;

    let filtered = providers;
    if (service) filtered = filtered.filter(p => p.service.toLowerCase().includes(service.toLowerCase()));
    if (sector) filtered = filtered.filter(p => p.sector?.toLowerCase() === sector.toLowerCase());

    res.json({ count: filtered.length, providers: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Booking by ID ─────────────────────────────────────────────────
app.get('/api/bookings/:id', (req, res) => {
  try {
    if (!fs.existsSync(BOOKINGS_FILE)) return res.status(404).json({ error: 'No bookings found' });
    const db = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
    const booking = db.bookings.find(b => b.booking_id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── All Bookings ─────────────────────────────────────────────────
app.get('/api/bookings', (req, res) => {
  try {
    if (!fs.existsSync(BOOKINGS_FILE)) return res.json({ bookings: [] });
    const db = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
    res.json(db);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Session Log ──────────────────────────────────────────────────
app.get('/api/logs/:sessionId', (req, res) => {
  const logPath = path.join(LOGS_DIR, `${req.params.sessionId}.json`);
  if (!fs.existsSync(logPath)) return res.status(404).json({ error: 'Log not found' });
  try {
    const log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Export All Logs as ZIP ───────────────────────────────────────
app.get('/api/logs/export/zip', (req, res) => {
  if (!fs.existsSync(LOGS_DIR)) return res.status(404).json({ error: 'No logs directory' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="bazaarai_logs_${Date.now()}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(LOGS_DIR, 'logs');
  archive.finalize();
});

// ─── Dispute Endpoint ─────────────────────────────────────────────
app.post('/api/dispute', async (req, res) => {
  const { booking_id, dispute_type, additional_info } = req.body;

  if (!booking_id || !dispute_type) {
    return res.status(400).json({ error: 'booking_id and dispute_type are required' });
  }

  try {
    if (!fs.existsSync(BOOKINGS_FILE)) return res.status(404).json({ error: 'No bookings found' });
    const db = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
    const booking = db.bookings.find(b => b.booking_id === booking_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const { runDisputeAgent } = require('../agents/13_disputeAgent');
    const LoggingAgent = require('../agents/15_loggingAgent');
    const logger = new LoggingAgent(`dispute_${Date.now()}`);

    const resolution = runDisputeAgent(
      { booking_id, confirmed: true, booking },
      dispute_type,
      additional_info || {},
      { top3: [] },
      logger
    );

    res.json({ success: true, resolution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Demo Edge Cases ──────────────────────────────────────────────
app.post('/api/demo/cancel-rebook', async (req, res) => {
  const { text } = req.body;
  const result = await orchestrate(text || 'Mujhe kal subah G-13 mein AC technician chahiye', {
    simulateCancellation: true
  });
  res.json({ success: true, demo: 'CANCEL_AND_REBOOK', result });
});

app.post('/api/demo/price-dispute', async (req, res) => {
  const { text } = req.body;
  const result = await orchestrate(text || 'AC repair G-13 kal', {
    simulatePriceDispute: true
  });
  res.json({ success: true, demo: 'PRICE_DISPUTE', result });
});

// ─── Start Server ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  🧠 BazaarAI Backend running on port ${PORT}        ║`);
  console.log(`║  API: http://localhost:${PORT}/api/health           ║`);
  console.log('╚══════════════════════════════════════════════════╝\n');
});

module.exports = app;

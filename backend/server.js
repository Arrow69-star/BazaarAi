/**
 * Khidmat AI — Node service.
 *
 * This used to host a second, independent copy of the booking pipeline that the
 * mobile app silently fell back to. That duplicate has been retired to
 * legacy/agents/ and the Python service (python-agents/) is now the single
 * canonical backend.
 *
 * What remains here is the skeleton for the worker role: Socket.IO live tracking
 * and real SMS/WhatsApp notification delivery (Phase 4). Until those land, this
 * process only reports health.
 *
 * Deliberately removed along with the pipeline:
 *   - POST /api/request, /api/dispute, /api/demo/*  — superseded by the Python API
 *   - GET  /api/bookings, /api/bookings/:id         — served customer PII to any caller
 *   - GET  /api/logs/:id, /api/logs/export/zip      — served internal reasoning logs
 *                                                     and a zip of everything, unauthenticated
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Only browser origins need CORS; the mobile clients are native.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:8081,http://localhost:19006,http://127.0.0.1:8081,http://127.0.0.1:19006')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Khidmat AI Node worker',
    role: 'realtime-and-notifications (not yet implemented)',
    canonical_api: 'python-agents (FastAPI, port 8000)',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Anything else that used to live here now belongs to the Python API.
app.use('/api', (req, res) => {
  res.status(410).json({
    error: 'Endpoint retired',
    detail: 'The Node pipeline has been retired. Use the Python API for booking, providers, disputes and traces.',
  });
});

app.listen(PORT, () => {
  console.log(`\n  Khidmat AI Node worker on port ${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log('  Canonical API is the Python service on port 8000.\n');
});

module.exports = app;

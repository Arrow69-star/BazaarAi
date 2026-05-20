import axios from 'axios';

const PYTHON_API  = process.env.EXPO_PUBLIC_PYTHON_API_URL  || 'http://192.168.1.100:8000';
const NODE_API    = process.env.EXPO_PUBLIC_NODE_API_URL    || 'http://192.168.1.100:3000';
const MAPS_KEY    = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';

export { MAPS_KEY };

// Increased timeout to 20s — Python AI pipeline with Gemini can take ~10-15s
const pythonApi = axios.create({
  baseURL: PYTHON_API,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});
const nodeApi = axios.create({
  baseURL: NODE_API,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Core Request ─────────────────────────────────────────────────────────────
export const submitRequest = async (text, options = {}) => {
  // Try Python backend first (Gemini-powered), fall back to Node.js
  try {
    const res = await pythonApi.post('/api/request', {
      text,
      simulate_cancellation: options.simulateCancellation || false,
      force_mode: options.forceMode || null,
    });
    return { ...res.data, source: 'python' };
  } catch (pyErr) {
    console.warn('[API] Python backend unavailable, trying Node.js...', pyErr.message);
    try {
      const res = await nodeApi.post('/api/request', {
        text,
        simulate_cancellation: options.simulateCancellation || false,
        simulate_price_dispute: options.simulatePriceDispute || false,
      });
      return { ...res.data, source: 'node' };
    } catch (nodeErr) {
      console.error('[API] Both backends unavailable');
      throw new Error('Service temporarily unavailable — running in demo mode');
    }
  }
};

// ── Providers ─────────────────────────────────────────────────────────────────
export const getProviders = async (filters = {}) => {
  try {
    const res = await pythonApi.get('/api/providers', { params: filters });
    return res.data;
  } catch {
    try {
      const res = await nodeApi.get('/api/providers', { params: filters });
      return res.data;
    } catch {
      return { count: 0, providers: [] };
    }
  }
};

// ── Bookings ──────────────────────────────────────────────────────────────────
export const getAllBookings = async () => {
  try {
    // Python backend stores bookings in python-agents/data/bookings.json
    const res = await pythonApi.get('/api/bookings');
    return res.data;
  } catch {
    try {
      const res = await nodeApi.get('/api/bookings');
      return res.data;
    } catch {
      return { bookings: [] };
    }
  }
};

export const getBooking = async (bookingId) => {
  try {
    const res = await pythonApi.get(`/api/bookings/${bookingId}`);
    return res.data;
  } catch {
    const res = await nodeApi.get(`/api/bookings/${bookingId}`);
    return res.data;
  }
};

// ── Dispute ───────────────────────────────────────────────────────────────────
export const submitDispute = async (bookingId, reason) => {
  try {
    const res = await pythonApi.post('/api/dispute', { booking_id: bookingId, dispute_type: reason });
    return res.data;
  } catch {
    const res = await nodeApi.post('/api/dispute', { booking_id: bookingId, dispute_type: reason });
    return res.data;
  }
};

// ── Agent Trace ───────────────────────────────────────────────────────────────
export const getTrace = async (limit = 50) => {
  try {
    const res = await pythonApi.get('/api/trace', { params: { limit } });
    return res.data;
  } catch {
    return { entries: [] };
  }
};

// ── Demo Scenarios ────────────────────────────────────────────────────────────
export const demoCancelRebook = async (text) => {
  try {
    const res = await nodeApi.post('/api/demo/cancel-rebook', { text });
    return res.data;
  } catch {
    throw new Error('Demo endpoint unavailable');
  }
};

export const demoLowConfidence = async () => {
  try {
    const res = await nodeApi.post('/api/demo/low-confidence');
    return res.data;
  } catch {
    throw new Error('Demo endpoint unavailable');
  }
};

// ── Health Check ──────────────────────────────────────────────────────────────
export const healthCheck = async () => {
  try {
    const res = await pythonApi.get('/health');
    return { ...res.data, backend: 'python' };
  } catch {
    try {
      const res = await nodeApi.get('/api/health');
      return { ...res.data, backend: 'node' };
    } catch {
      return { status: 'offline', backend: 'none' };
    }
  }
};

export default pythonApi;

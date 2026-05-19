import axios from 'axios';

// Python FastAPI backend (port 8000) — primary
// Node.js backend (port 3000) — fallback
const PYTHON_API  = process.env.EXPO_PUBLIC_PYTHON_API_URL  || 'http://localhost:8000';
const NODE_API    = process.env.EXPO_PUBLIC_NODE_API_URL    || 'http://localhost:3000';
const MAPS_KEY    = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';

export { MAPS_KEY };

const pythonApi = axios.create({ baseURL: PYTHON_API, timeout: 30000, headers: { 'Content-Type': 'application/json' } });
const nodeApi   = axios.create({ baseURL: NODE_API,   timeout: 30000, headers: { 'Content-Type': 'application/json' } });

// ── Primary: Python FastAPI ──────────────────────────────────────
export const submitRequest = async (text, options = {}) => {
  try {
    const res = await pythonApi.post('/api/request', {
      text,
      simulate_cancellation: options.simulateCancellation || false,
      force_mode: options.forceMode || null,
    });
    return { ...res.data, source: 'python' };
  } catch (pyErr) {
    // Fallback to Node.js backend
    try {
      const res = await nodeApi.post('/api/request', {
        text,
        simulate_cancellation: options.simulateCancellation || false,
        simulate_price_dispute: options.simulatePriceDispute || false,
      });
      return { ...res.data, source: 'node' };
    } catch {
      throw pyErr; // throw original error
    }
  }
};

export const getProviders = async (filters = {}) => {
  try {
    const res = await pythonApi.get('/api/providers', { params: filters });
    return res.data;
  } catch {
    const res = await nodeApi.get('/api/providers', { params: filters });
    return res.data;
  }
};

export const getAllBookings = async () => {
  try {
    const res = await pythonApi.get('/api/bookings');
    return res.data;
  } catch {
    const res = await nodeApi.get('/api/bookings');
    return res.data;
  }
};

export const getBooking = async (bookingId) => {
  const res = await pythonApi.get(`/api/bookings/${bookingId}`);
  return res.data;
};

export const submitDispute = async (bookingId, reason) => {
  const res = await pythonApi.post('/api/dispute', { booking_id: bookingId, reason });
  return res.data;
};

export const getTrace = async (limit = 50) => {
  const res = await pythonApi.get('/api/trace', { params: { limit } });
  return res.data;
};

export const demoCancelRebook = async (text) => {
  const res = await pythonApi.post('/api/demo/cancel-rebook', { text });
  return res.data;
};

export const demoLowConfidence = async () => {
  const res = await pythonApi.post('/api/demo/low-confidence');
  return res.data;
};

export const healthCheck = async () => {
  try {
    const res = await pythonApi.get('/health');
    return { ...res.data, backend: 'python' };
  } catch {
    const res = await nodeApi.get('/api/health');
    return { ...res.data, backend: 'node' };
  }
};

export default pythonApi;

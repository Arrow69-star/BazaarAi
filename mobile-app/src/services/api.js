import axios from 'axios';

const PYTHON_API  = process.env.EXPO_PUBLIC_PYTHON_API_URL  || 'http://192.168.1.100:8000';
const NODE_API    = process.env.EXPO_PUBLIC_NODE_API_URL    || 'http://192.168.1.100:3000';
const MAPS_KEY    = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';

export { MAPS_KEY };

// The Gemini pipeline itself takes ~10-15s. On a free-tier host the container also
// sleeps when idle and needs ~30-60s to wake, so the pipeline call gets a much longer
// budget than ordinary reads (see PIPELINE_TIMEOUT below).
const pythonApi = axios.create({
  baseURL: PYTHON_API,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});
const PIPELINE_TIMEOUT = 90000;

// Reserved for the Node worker (live tracking + notifications, Phase 4). The booking
// pipeline no longer falls back to it — the Python service is canonical.
const nodeApi = axios.create({
  baseURL: NODE_API,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Fire-and-forget ping so a sleeping backend starts waking while the user is still
// typing. Failure is expected and ignored.
export const warmUp = () => {
  pythonApi.get('/health', { timeout: 5000 }).catch(() => {});
};

// ── Core Request ─────────────────────────────────────────────────────────────
export const submitRequest = async (text, options = {}) => {
  try {
    const res = await pythonApi.post('/api/request', {
      text,
      simulate_cancellation: options.simulateCancellation || false,
      force_mode: options.forceMode || null,
    }, { timeout: PIPELINE_TIMEOUT });
    return { ...res.data, source: 'python' };
  } catch (err) {
    console.error('[API] Backend unavailable:', err.message);
    throw new Error('Service temporarily unavailable — running in demo mode');
  }
};

// ── Providers ─────────────────────────────────────────────────────────────────
export const getProviders = async (filters = {}) => {
  try {
    const res = await pythonApi.get('/api/providers', { params: filters });
    return res.data;
  } catch {
    return { count: 0, providers: [] };
  }
};

// ── Bookings ──────────────────────────────────────────────────────────────────
export const getAllBookings = async () => {
  try {
    const res = await pythonApi.get('/api/bookings');
    return res.data;
  } catch {
    return { bookings: [] };
  }
};

export const getBooking = async (bookingId) => {
  const res = await pythonApi.get(`/api/bookings/${bookingId}`);
  return res.data;
};

// ── Dispute ───────────────────────────────────────────────────────────────────
export const submitDispute = async (bookingId, reason) => {
  const res = await pythonApi.post('/api/dispute', { booking_id: bookingId, dispute_type: reason });
  return res.data;
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
    const res = await pythonApi.post('/api/demo/cancel-rebook', { text }, { timeout: PIPELINE_TIMEOUT });
    return res.data;
  } catch {
    throw new Error('Demo endpoint unavailable');
  }
};

export const demoLowConfidence = async () => {
  try {
    const res = await pythonApi.post('/api/demo/low-confidence', {}, { timeout: PIPELINE_TIMEOUT });
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
    return { status: 'offline', backend: 'none' };
  }
};

// ── Advanced Commercial & Diagnostic API ─────────────────────────────────────
export const diagnoseRepair = async (text, imageBase64 = null) => {
  try {
    const res = await pythonApi.post('/api/diagnose', { text, image_base64: imageBase64 },
      { timeout: PIPELINE_TIMEOUT });
    return res.data;
  } catch (e) {
    return {
      success: false,
      diagnostic_report: {
        diagnosis_title: 'Standard Repair Assessment',
        category: 'Home Service',
        severity: 'MODERATE',
        root_cause_analysis: 'Automated diagnostic fallback for: ' + text,
        safety_precautions: ['Ensure power/water is safely isolated before work begins'],
        recommended_parts: [{ part_name: 'Standard replacement parts', est_price_pkr: 500 }],
        estimated_labor_pkr: { min: 1000, max: 2500 },
        estimated_total_pkr: { min: 1500, max: 3000 },
        estimated_duration_minutes: 45,
        source: 'offline_fallback',
        offline: true
      }
    };
  }
};

// The correct PIN is verified server-side against the stored booking — never sent by the client.
export const releaseEscrow = async (escrowId, pinEntered) => {
  try {
    const res = await pythonApi.post('/api/escrow/release', {
      escrow_id: escrowId,
      pin_entered: pinEntered,
    });
    return res.data;
  } catch (e) {
    return { success: false, error: e.response?.data?.detail || e.message };
  }
};

export const getMarketStats = async () => {
  try {
    const res = await pythonApi.get('/api/market/stats');
    return res.data;
  } catch {
    return {
      platform: 'Khidmat AI Commercial Engine',
      active_kaarigars: 35,
      escrow_protection_rate: '100%',
      customer_satisfaction: 4.88,
      platform_take_rate: '12%'
    };
  }
};

export default pythonApi;

import axios from 'axios';

// 🔧 UPDATE THIS URL after deploying backend to Vercel:
// e.g. 'https://bazaarai-backend.vercel.app'
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export const submitRequest = async (text, options = {}) => {
  const response = await api.post('/api/request', {
    text,
    simulate_cancellation: options.simulateCancellation || false,
    simulate_price_dispute: options.simulatePriceDispute || false,
  });
  return response.data;
};

export const getProviders = async (filters = {}) => {
  const response = await api.get('/api/providers', { params: filters });
  return response.data;
};

export const getBooking = async (bookingId) => {
  const response = await api.get(`/api/bookings/${bookingId}`);
  return response.data;
};

export const submitDispute = async (bookingId, disputeType, additionalInfo = {}) => {
  const response = await api.post('/api/dispute', {
    booking_id: bookingId,
    dispute_type: disputeType,
    additional_info: additionalInfo,
  });
  return response.data;
};

export const demoCancelRebook = async (text) => {
  const response = await api.post('/api/demo/cancel-rebook', { text });
  return response.data;
};

export const demoPriceDispute = async (text) => {
  const response = await api.post('/api/demo/price-dispute', { text });
  return response.data;
};

export const healthCheck = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export default api;

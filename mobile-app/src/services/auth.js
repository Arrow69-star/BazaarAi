import AsyncStorage from '@react-native-async-storage/async-storage';
import { pythonApi } from './api';

const TOKEN_KEY = 'khidmat_auth_token';
const PROFILE_KEY = 'khidmat_auth_profile';

let cachedToken = null;

/** Reads the stored token, keeping it in memory so the interceptor stays synchronous. */
export const loadToken = async () => {
  try {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    cachedToken = null;
  }
  return cachedToken;
};

export const getToken = () => cachedToken;

const setToken = async (token) => {
  cachedToken = token;
  try {
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // A failed write only costs the user a re-login next launch.
  }
};

export const getProfile = async () => {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Asks the backend to send a login code. */
export const requestOtp = async (phone) => {
  const res = await pythonApi.post('/api/auth/request-otp', { phone });
  return res.data;
};

/** Exchanges the code for a token and stores it. */
export const verifyOtp = async (phone, code) => {
  const res = await pythonApi.post('/api/auth/verify-otp', { phone, code });
  const token = res.data?.token;
  if (!token) throw new Error('No token returned');
  await setToken(token);

  try {
    const me = await pythonApi.get('/api/auth/me');
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(me.data));
    return me.data;
  } catch {
    return { phone };
  }
};

export const signOut = async () => {
  await setToken(null);
  try {
    await AsyncStorage.removeItem(PROFILE_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
};

export const isSignedIn = () => Boolean(cachedToken);

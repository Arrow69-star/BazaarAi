/**
 * BazaarAI — Firebase Initialization
 * Connects to Firestore for persistent bookings & logs
 * Falls back gracefully to local JSON if no credentials
 */

import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY      || "YOUR_API_KEY",
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN  || "YOUR_PROJECT.firebaseapp.com",
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID   || "YOUR_PROJECT_ID",
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_BUCKET        || "YOUR_PROJECT.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID    || "YOUR_SENDER_ID",
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID        || "YOUR_APP_ID",
};

// Prevent duplicate initialization in hot-reload
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
} catch (e) {
  console.warn("[Firebase] Init failed:", e.message);
}

export const db      = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app)   : null;
export const auth    = app ? getAuth(app)       : null;
export default app;

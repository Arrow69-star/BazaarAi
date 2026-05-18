/**
 * Firebase Admin SDK initialization
 * Falls back gracefully if credentials not provided
 */

let db = null;

try {
  const admin = require('firebase-admin');

  if (process.env.FIREBASE_PROJECT_ID && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    db = admin.firestore();
    console.log('[Firebase] ✅ Connected to Firestore');
  } else {
    console.log('[Firebase] ⚠️  No credentials — using local JSON fallback');
  }
} catch (err) {
  console.log('[Firebase] ⚠️  Init failed:', err.message, '— using local fallback');
}

async function writeBooking(booking) {
  if (db) {
    try {
      await db.collection('bookings').doc(booking.booking_id).set(booking);
      return { success: true, source: 'firebase' };
    } catch (err) {
      console.error('[Firebase] Write error:', err.message);
    }
  }
  return { success: false, source: 'local_fallback' };
}

async function readBooking(bookingId) {
  if (db) {
    try {
      const doc = await db.collection('bookings').doc(bookingId).get();
      if (doc.exists) return { data: doc.data(), source: 'firebase' };
    } catch (err) {
      console.error('[Firebase] Read error:', err.message);
    }
  }
  return null;
}

module.exports = { db, writeBooking, readBooking };

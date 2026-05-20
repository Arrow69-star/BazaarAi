

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOGS_DIR = path.join(__dirname, '..', 'logs');
const BOOKINGS_FILE = path.join(LOGS_DIR, 'bookings_db.json');

function generateBookingId() {
  const prefix = 'BAZ';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function loadBookingsDb() {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf-8'));
    }
  } catch (e) {  }
  return { bookings: [] };
}

function saveBookingsDb(db) {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(db, null, 2));
}

function runBookingAgent(schedulingOutput, decisionOutput, pricingOutput, intentOutput, sessionId, logger) {
  logger.logAgentStart('BookingAgent', {
    provider: decisionOutput.selected_provider?.name,
    slot: schedulingOutput.display_time,
    total_price: pricingOutput.total_price
  });

  const reasoning = [];
  const provider = decisionOutput.selected_provider;

  if (!provider || !schedulingOutput.scheduled) {
    const result = { confirmed: false, reason: 'Scheduling failed — cannot book' };
    logger.logAgentComplete('BookingAgent', result, 'Booking aborted: no valid schedule');
    return result;
  }

  const bookingId = generateBookingId();
  const now = new Date().toISOString();

  const booking = {
    booking_id: bookingId,
    session_id: sessionId,
    status: 'CONFIRMED',
    created_at: now,

    
    user_request: intentOutput.issue_description,
    service_type: intentOutput.service_type,
    location: intentOutput.location,

    
    provider: {
      id: provider.id,
      name: provider.name,
      phone: provider.phone,
      specialization: provider.specialization,
      rating: provider.rating
    },

    
    schedule: {
      slot_start: schedulingOutput.slot_start,
      slot_end: schedulingOutput.slot_end,
      display: schedulingOutput.display_time,
      duration_min: schedulingOutput.duration_min
    },

    
    pricing: {
      total: pricingOutput.total_price,
      currency: 'PKR',
      breakdown: pricingOutput.breakdown
    },

    
    cancellation_policy: 'Free cancellation up to 2 hours before appointment',
    confirmation_code: bookingId,
    receipt_url: `/api/bookings/${bookingId}/receipt`
  };

  
  const db = loadBookingsDb();
  db.bookings.push(booking);
  saveBookingsDb(db);
  reasoning.push(`Booking saved to local DB: ${bookingId}`);

  
  let firebaseStatus = 'SIMULATED';
  try {
    const firebaseModule = require('../backend/firebase');
    if (firebaseModule && firebaseModule.db) {
      
      firebaseStatus = 'FIREBASE_CONNECTED';
    }
  } catch (e) {
    reasoning.push('Firebase not connected — using local DB fallback');
    logger.logFallback('Firebase unavailable', 'Booking saved to local JSON store');
  }

  reasoning.push(`Booking ID generated: ${bookingId}`);
  reasoning.push(`Status: CONFIRMED`);
  reasoning.push(`Provider assigned: ${provider.name} | Slot: ${schedulingOutput.display_time}`);
  reasoning.push(`Total amount: PKR ${pricingOutput.total_price}`);
  reasoning.push(`Storage: ${firebaseStatus}`);

  const receipt = generateReceipt(booking);

  const output = {
    confirmed: true,
    booking_id: bookingId,
    booking,
    receipt,
    firebase_status: firebaseStatus,
    booking_reasoning: reasoning
  };

  logger.logToolCall('BookingAgent.writeDB', { booking_id: bookingId }, `Saved to ${BOOKINGS_FILE}`);
  logger.logAgentComplete('BookingAgent', { booking_id: bookingId, status: 'CONFIRMED' }, reasoning.join(' | '));

  return output;
}

function generateReceipt(booking) {
  const lines = [
    '═══════════════════════════════════════',
    '         🛠️  BAZAARAI BOOKING RECEIPT        ',
    '═══════════════════════════════════════',
    `📋 Booking ID  : ${booking.booking_id}`,
    `📅 Date/Time   : ${booking.schedule.display}`,
    `🔧 Service     : ${booking.service_type}`,
    `📍 Location    : ${booking.location?.sector || 'N/A'}, ${booking.location?.city || ''}`,
    '───────────────────────────────────────',
    `👨‍🔧 Provider    : ${booking.provider.name}`,
    `⭐ Rating       : ${booking.provider.rating}/5.0`,
    `📱 Contact     : ${booking.provider.phone}`,
    '───────────────────────────────────────',
    `💰 Total Amount: PKR ${booking.pricing.total}`,
    `💳 Payment     : Cash on delivery`,
    '───────────────────────────────────────',
    `📋 Cancellation: ${booking.cancellation_policy}`,
    '═══════════════════════════════════════',
    `✅ STATUS: CONFIRMED`,
    '═══════════════════════════════════════'
  ];

  return {
    text: lines.join('\n'),
    booking_id: booking.booking_id,
    provider_name: booking.provider.name,
    provider_phone: booking.provider.phone,
    total_amount: booking.pricing.total,
    slot_display: booking.schedule.display,
    service_type: booking.service_type,
    location_display: `${booking.location?.sector}, ${booking.location?.city}`
  };
}

module.exports = { runBookingAgent };



const fs = require('fs');
const path = require('path');

const FEEDBACK_FILE = path.join(__dirname, '..', 'logs', 'feedback_db.json');
const PROVIDERS_PATH = path.join(__dirname, '..', 'data', 'providers.json');

function loadFeedbackDb() {
  try { return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8')); }
  catch (e) { return { feedbacks: [] }; }
}

function saveFeedbackDb(db) {
  const dir = path.dirname(FEEDBACK_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(db, null, 2));
}

function runFeedbackAgent(bookingOutput, userRating, userReview, logger) {
  logger.logAgentStart('FeedbackAgent', {
    booking_id: bookingOutput.booking_id,
    rating: userRating
  });

  
  const rating = userRating || (Math.random() > 0.3 ? (4 + Math.random()).toFixed(1) : (3 + Math.random()).toFixed(1));
  const review = userReview || generateSimulatedReview(bookingOutput.booking?.service_type, parseFloat(rating));

  const feedback = {
    feedback_id: `FB-${Date.now()}`,
    booking_id: bookingOutput.booking_id,
    provider_id: bookingOutput.booking?.provider?.id,
    provider_name: bookingOutput.booking?.provider?.name,
    rating: parseFloat(rating),
    review,
    timestamp: new Date().toISOString(),
    service_type: bookingOutput.booking?.service_type,
    sentiment: parseFloat(rating) >= 4 ? 'POSITIVE' : parseFloat(rating) >= 3 ? 'NEUTRAL' : 'NEGATIVE'
  };

  
  const db = loadFeedbackDb();
  db.feedbacks.push(feedback);
  saveFeedbackDb(db);

  
  const ratingUpdate = updateProviderRating(feedback.provider_id, feedback.rating);

  const output = {
    feedback_recorded: true,
    feedback,
    provider_rating_updated: ratingUpdate,
    thank_you_message: parseFloat(rating) >= 4
      ? `Shukriya! Aap ka feedback ${feedback.provider_name} ke liye bohut mufeed hai. 🌟`
      : `Feedback ke liye shukriya. Hum service improve karne ki koshish karen ge.`
  };

  logger.logAgentComplete('FeedbackAgent', {
    rating: feedback.rating,
    sentiment: feedback.sentiment,
    provider_updated: !!ratingUpdate
  }, `Feedback recorded: ${feedback.rating}★ — ${feedback.sentiment}`);

  return output;
}

function generateSimulatedReview(serviceType, rating) {
  const positiveReviews = [
    'Bohut acha kaam kiya! Waqt par aaye aur professional the.',
    'Excellent service! AC bilkul theek ho gaya. Highly recommend.',
    'Very professional, quick work. Price bhi reasonable tha.',
    'Bahut khush hun service se. Zaroor dobara bulayenge!'
  ];
  const neutralReviews = [
    'Kaam theek tha, lekin thodi der se aaye.',
    'Service average thi, but kaam ho gaya.',
    'Price thoda zyada laga, baki theek.'
  ];
  const negativeReviews = [
    'Late aaye aur kaam bhi puri tarah nahi kiya.',
    'Service se khush nahi, price zyada charge kiya.'
  ];

  if (rating >= 4.2) return positiveReviews[Math.floor(Math.random() * positiveReviews.length)];
  if (rating >= 3) return neutralReviews[Math.floor(Math.random() * neutralReviews.length)];
  return negativeReviews[Math.floor(Math.random() * negativeReviews.length)];
}

function updateProviderRating(providerId, newRating) {
  try {
    const providers = JSON.parse(fs.readFileSync(PROVIDERS_PATH, 'utf-8'));
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return null;

    const oldRating = provider.rating;
    
    provider.rating = parseFloat(((oldRating * 50 + newRating) / 51).toFixed(2));
    fs.writeFileSync(PROVIDERS_PATH, JSON.stringify(providers, null, 2));

    return { provider_id: providerId, old_rating: oldRating, new_rating: provider.rating };
  } catch (e) {
    return null;
  }
}

module.exports = { runFeedbackAgent };

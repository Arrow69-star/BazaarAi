/**
 * BazaarAI — Agent 14: Fallback Handling Agent
 * Handles: no providers, API failure, unclear input, all edge cases
 */

function runFallbackAgent(stage, error, context, logger) {
  logger.logAgentStart('FallbackAgent', { stage, error: error?.message || error });

  const reasoning = [];
  reasoning.push(`Fallback triggered at stage: ${stage}`);
  reasoning.push(`Reason: ${error?.message || error || 'Unknown'}`);

  let resolution = null;

  switch (stage) {
    case 'NO_PROVIDERS':
      resolution = {
        type: 'AREA_EXPANSION',
        message: `Koi bhi ${context?.service_type || 'service'} provider aap ke area mein available nahi.\n` +
          `💡 Suggestion: F-10 ya G-11 mein providers available hain (5-8km door).\n` +
          `Kya aap extended search chahte hain?`,
        actions: ['EXPAND_SEARCH_RADIUS', 'SUGGEST_NEARBY_AREA', 'SCHEDULE_FOR_LATER'],
        nearby_areas: ['F-10', 'G-11', 'G-14'],
        estimated_wait: '2-3 hours for nearest provider to travel'
      };
      break;

    case 'API_FAILURE':
      resolution = {
        type: 'MOCK_DATA_FALLBACK',
        message: 'API connection failed. Using cached provider data.',
        fallback_used: 'local_mock_dataset',
        data_freshness: 'Last updated: 1 hour ago',
        impact: 'Minimal — provider data is relatively stable'
      };
      break;

    case 'UNCLEAR_INPUT':
      resolution = {
        type: 'CLARIFICATION_REQUEST',
        message: 'Aap ki request samajh nahi aai. Mujhe batayein:',
        clarification_questions: [
          context?.missing_service ? '🔧 Aap kaunsi service chahte hain? (AC repair, plumber, electrician, carpenter?)' : null,
          context?.missing_location ? '📍 Aap ka sector kya hai? (G-13, F-10, I-8, etc.)' : null,
          context?.missing_time ? '⏰ Kab chahiye? (Aaj, kal, subah, sham?)' : null,
          '💰 Budget ki koi preference? (Sasta chahiye ya quality)'
        ].filter(Boolean),
        example: '"Mujhe kal subah G-13 mein AC technician chahiye, budget kam hai"'
      };
      break;

    case 'PROVIDER_CANCELLED':
      resolution = {
        type: 'AUTO_REBOOKING_FALLBACK',
        message: '⚡ Provider ne cancel kar diya. Automatic re-booking ho rahi hai...',
        action: 'Assigning next best available provider',
        eta: '2 minutes'
      };
      break;

    case 'BOOKING_FAILED':
      resolution = {
        type: 'RETRY_WITH_FALLBACK',
        message: 'Booking process mein masla aaya. Dobara koshish ho rahi hai...',
        retry_count: 1,
        fallback: 'Using local booking store instead of Firebase'
      };
      break;

    case 'PAYMENT_FAILED':
      resolution = {
        type: 'CASH_FALLBACK',
        message: 'Online payment available nahi. Cash on delivery option use karo.',
        payment_method: 'CASH_ON_DELIVERY'
      };
      break;

    default:
      resolution = {
        type: 'GENERAL_ERROR',
        message: `System mein masla aaya: ${error?.message || 'Unknown error'}. Please dobara koshish karein.`,
        support: 'help@bazaarai.pk'
      };
  }

  reasoning.push(`Resolution: ${resolution.type}`);

  const output = {
    fallback_id: `FB-${stage}-${Date.now()}`,
    stage,
    error: error?.message || String(error),
    resolution,
    handled: true,
    fallback_reasoning: reasoning
  };

  logger.logFallback(`Stage: ${stage}`, resolution.type);
  logger.logAgentComplete('FallbackAgent', { type: resolution.type, handled: true }, reasoning.join(' | '));

  return output;
}

module.exports = { runFallbackAgent };

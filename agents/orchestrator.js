/**
 * BazaarAI — Master Orchestrator
 * Chains all 15 agents in strict execution order
 * Every step is logged via LoggingAgent
 */

const { randomUUID } = require('crypto');

const LoggingAgent       = require('./15_loggingAgent');
const { runIntentAgent }           = require('./01_intentAgent');
const { runContextAgent }          = require('./02_contextAgent');
const { classifyComplexity }       = require('./03_complexityAgent');
const { runProviderDiscoveryAgent }= require('./04_providerDiscoveryAgent');
const { runMatchingEngine }        = require('./05_matchingEngine');
const { runSmartDecisionAgent }    = require('./06_smartDecisionAgent');
const { runPricingAgent }          = require('./07_pricingAgent');
const { runSchedulingAgent }       = require('./08_schedulingAgent');
const { runBookingAgent }          = require('./09_bookingAgent');
const { runNotificationAgent }     = require('./10_notificationAgent');
const { runLiveSimulationAgent }   = require('./11_liveSimulationAgent');
const { runFeedbackAgent }         = require('./12_feedbackAgent');
const { runDisputeAgent }          = require('./13_disputeAgent');
const { runFallbackAgent }         = require('./14_fallbackAgent');

async function orchestrate(rawUserText, options = {}) {
  const sessionId = `session_${randomUUID().replace(/-/g, '').substring(0, 12)}`;
  const logger = new LoggingAgent(sessionId);

  logger.setPlan(
    `BazaarAI Orchestration Plan:\n` +
    `Input: "${rawUserText}"\n` +
    `Steps: Intent → Context → Complexity → Discovery → Matching → Decision → Pricing → Scheduling → Booking → Notify → Simulate → [Feedback/Dispute]\n` +
    `Fallback: Active at every step`
  );

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           🧠 BazaarAI Orchestrator Starting             ║');
  console.log(`║  Session: ${sessionId}  ║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const result = {
    session_id: sessionId,
    raw_input: rawUserText,
    stages: {},
    final_output: null,
    log_path: logger.getLogPath()
  };

  try {
    // ═══ STEP 1: INTENT ═══
    console.log('▶ STEP 1: Intent Agent');
    const intent = runIntentAgent(rawUserText, logger);
    result.stages.intent = intent;

    if (intent.needs_clarification) {
      const fallback = runFallbackAgent('UNCLEAR_INPUT', new Error('Low confidence'), {
        missing_service: !intent.service_type,
        missing_location: !intent.location,
        missing_time: !intent.time?.raw?.trim()
      }, logger);
      result.stages.fallback_clarification = fallback;
      result.final_output = { needs_clarification: true, questions: intent.clarification_questions, fallback };
      logger.setFinalOutcome('Clarification required from user', 'pending_clarification');
      return result;
    }

    // ═══ STEP 2: CONTEXT ═══
    console.log('▶ STEP 2: Context Agent');
    const context = runContextAgent(intent, logger);
    result.stages.context = context;

    // ═══ STEP 3: COMPLEXITY ═══
    console.log('▶ STEP 3: Complexity Classifier');
    const complexity = classifyComplexity(intent.service_type, rawUserText, logger);
    result.stages.complexity = complexity;

    // ═══ STEP 4: PROVIDER DISCOVERY ═══
    console.log('▶ STEP 4: Provider Discovery');
    const discovery = runProviderDiscoveryAgent(context, logger);
    result.stages.discovery = discovery;

    if (discovery.no_providers_available) {
      const fallback = runFallbackAgent('NO_PROVIDERS', new Error('Zero providers found'), context, logger);
      result.stages.fallback_no_providers = fallback;
      result.final_output = { no_providers: true, fallback };
      logger.setFinalOutcome('No providers available', 'failed');
      return result;
    }

    // ═══ STEP 5: MATCHING ENGINE ═══
    console.log('▶ STEP 5: Matching Engine');
    const matching = runMatchingEngine(discovery, context, complexity, logger);
    result.stages.matching = matching;

    // Attach top3 to context for pricing reference
    context._top3_providers = matching.top3;

    // ═══ STEP 6: SMART DECISION ═══
    console.log('▶ STEP 6: Smart Decision Agent');
    const decision = runSmartDecisionAgent(matching, context, complexity, logger);
    result.stages.decision = decision;

    // ═══ STEP 7: PRICING ═══
    console.log('▶ STEP 7: Pricing Agent');
    const pricing = runPricingAgent(decision, context, complexity, logger);
    result.stages.pricing = pricing;

    // ═══ STEP 8: SCHEDULING ═══
    console.log('▶ STEP 8: Scheduling Agent');
    const scheduling = runSchedulingAgent(decision, context, complexity, logger);
    result.stages.scheduling = scheduling;

    // ═══ STEP 9: BOOKING ═══
    console.log('▶ STEP 9: Booking Agent');
    const booking = runBookingAgent(scheduling, decision, pricing, intent, sessionId, logger);
    result.stages.booking = booking;

    if (!booking.confirmed) {
      const fallback = runFallbackAgent('BOOKING_FAILED', new Error('Booking not confirmed'), {}, logger);
      result.stages.fallback_booking = fallback;
    }

    // ═══ STEP 10: NOTIFICATIONS ═══
    console.log('▶ STEP 10: Notification Agent');
    const notifications = runNotificationAgent(booking, logger);
    result.stages.notifications = notifications;

    // ═══ STEP 11: LIVE SIMULATION ═══
    console.log('▶ STEP 11: Live Service Simulation');
    const simulation = runLiveSimulationAgent(booking, logger);
    result.stages.simulation = simulation;

    // ═══ STEP 12: FEEDBACK (Simulated) ═══
    console.log('▶ STEP 12: Feedback Agent (Simulated)');
    const feedback = runFeedbackAgent(booking, null, null, logger);
    result.stages.feedback = feedback;

    // ═══ AUTOMATIC 20% CANCELLATION (FAILURE INJECTION ENGINE) ═══
    const cancelTriggered = Math.random() < 0.20 || options.simulateCancellation;
    if (cancelTriggered && matching.top3?.length > 1) {
      console.log('▶ ⚡ FAILURE INJECTION: Provider Cancelled (20% trigger)');
      logger.logFallback('Provider cancellation injected', 'Auto-rebooking to runner-up');
      const dispute = runDisputeAgent(booking, 'CANCELLATION', {}, matching, logger);
      result.stages.dispute_cancellation = dispute;
      result.failure_simulation = {
        triggered: true,
        type: 'PROVIDER_CANCELLATION',
        original_provider: decision.selected_provider?.name,
        new_provider: dispute.resolution?.new_provider || matching.top3[1]?.name,
        message: '⚡ Provider cancelled — system auto-rebooking in <2 seconds'
      };
    }

    if (options.simulatePriceDispute) {
      const priceDispute = runDisputeAgent(booking, 'PRICE_DISPUTE', {}, matching, logger);
      result.stages.dispute_price = priceDispute;
    }

    // ═══ WHATSAPP SIMULATION ═══
    const finalName = result.failure_simulation?.new_provider || decision.selected_provider?.name;
    result.stages.whatsapp_simulation = buildWhatsAppSim(finalName, booking, scheduling, pricing);

    // ═══ CONFIDENCE BREAKDOWN ═══
    result.confidence_breakdown = {
      intent: Math.round(intent.confidence_score * 100),
      location: intent.location ? 90 : 20,
      time: intent.time?.raw?.trim() ? 88 : 50,
      service_match: Math.min(100, Math.round(intent.confidence_score * 110)),
      overall: Math.round((intent.confidence_score * 0.4 + (intent.location ? 0.9 : 0.2) * 0.3 + 0.88 * 0.3) * 100)
    };

    // ═══ REJECTED PROVIDERS (WHY NOT OTHERS) ═══
    result.rejected_providers = (matching.ranked_providers || []).slice(1, 4).map(p => ({
      name: p.name,
      score: parseFloat((p.score?.total * 100).toFixed(1)),
      rejection_reason: buildRejectionReason(p, matching.ranked_providers[0])
    }));

    const finalProviderName = result.failure_simulation?.new_provider || decision.selected_provider?.name;

    // ═══ FINAL OUTPUT ═══
    result.final_output = {
      service_request: {
        service: intent.service_type,
        location: intent.location?.sector + ', ' + intent.location?.city,
        time: intent.time?.display,
        urgency: intent.urgency,
        language: intent.language_detected
      },
      recommended_provider: {
        name: finalProviderName,
        rating: decision.selected_provider?.rating,
        distance: decision.selected_provider?.distance_km + 'km',
        specialization: decision.selected_provider?.specialization,
        phone: decision.selected_provider?.phone
      },
      reasoning: decision.explanation?.detailed_reasons,
      rejected_providers: result.rejected_providers,
      confidence_breakdown: result.confidence_breakdown,
      pricing_breakdown: pricing.breakdown,
      total_price: `PKR ${pricing.total_price}`,
      booking_confirmation: {
        booking_id: booking.booking_id,
        slot: scheduling.display_time,
        status: booking.confirmed ? 'CONFIRMED ✅' : 'FAILED ❌'
      },
      failure_simulation: result.failure_simulation || null,
      whatsapp_messages: result.stages.whatsapp_simulation,
      follow_up_plan: simulation.stages?.map(s => ({ stage: s.stage, time: s.timestamp, message: s.message })),
      job_log_path: logger.getLogPath()
    };

    logger.setFinalOutcome(
      `Booking ${booking.booking_id} confirmed for ${decision.selected_provider?.name} at PKR ${pricing.total_price}`,
      'confirmed'
    );

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ BazaarAI Orchestration COMPLETE                     ║');
    console.log(`║  Booking: ${booking.booking_id}                   ║`);
    console.log(`║  Provider: ${decision.selected_provider?.name?.padEnd(28)}║`);
    console.log(`║  Total: PKR ${String(pricing.total_price).padEnd(25)}║`);
    console.log('╚══════════════════════════════════════════════════════════╝\n');

  } catch (err) {
    console.error('[ORCHESTRATOR ERROR]', err.message);
    logger.logAgentError('Orchestrator', err);
    const fallback = runFallbackAgent('SYSTEM_ERROR', err, {}, logger);
    result.stages.fallback_system = fallback;
    result.final_output = { error: err.message, fallback };
    logger.setFinalOutcome(`System error: ${err.message}`, 'error');
  }

  return result;
}

module.exports = { orchestrate };

function buildWhatsAppSim(providerName, booking, scheduling, pricing) {
  const t = (min) => {
    const d = new Date(Date.now() + min * 60000);
    return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  return [
    { from: 'BazaarAI', time: t(0), message: `New booking request received\nService: ${booking.booking?.service_type || 'AC Repair'}\nLocation: ${booking.booking?.location?.sector || 'G-13'}\nSlot: ${scheduling?.display_time || 'Tomorrow 9AM'}` },
    { from: providerName, time: t(2), message: `Slot confirmed ✅\nI will arrive at ${(scheduling?.display_time || '09:00 AM').split('–')[0].trim()}\nMy rate: PKR ${pricing?.total_price || 1200}` },
    { from: 'BazaarAI', time: t(3), message: `Booking ID: ${booking.booking_id}\nProvider ${providerName} assigned.\nTracking link: bazaarai.pk/track/${booking.booking_id}` },
    { from: 'BazaarAI', time: t(14 * 60), message: `⏰ Reminder: Job starts tomorrow at 9:00 AM\nProvider: ${providerName}\nAmount: PKR ${pricing?.total_price || 1200}` },
    { from: providerName, time: t(15 * 60), message: `On my way! 🚗 ETA 15 minutes` },
    { from: 'BazaarAI', time: t(16 * 60), message: `✅ Service completed!\nPlease rate your experience: bazaarai.pk/rate/${booking.booking_id}` }
  ];
}

function buildRejectionReason(provider, winner) {
  const reasons = [];
  if (winner.score?.total - provider.score?.total > 0.05) reasons.push(`Lower match score (${(provider.score?.total * 100).toFixed(0)}% vs ${(winner.score?.total * 100).toFixed(0)}%)`);
  if (provider.reliability_score < winner.reliability_score) reasons.push(`Lower reliability (${(provider.reliability_score * 100).toFixed(0)}% vs ${(winner.reliability_score * 100).toFixed(0)}%)`);
  if (provider.cancellation_rate > winner.cancellation_rate) reasons.push(`Higher cancellation risk (${(provider.cancellation_rate * 100).toFixed(0)}%)`);
  if (provider.rating < winner.rating) reasons.push(`Lower rating (⭐${provider.rating} vs ${winner.rating})`);
  if (provider.availability_status === 'BUSY') reasons.push('Not available at requested time');
  return reasons.length > 0 ? reasons.join('. ') : 'Slightly lower composite score';
}

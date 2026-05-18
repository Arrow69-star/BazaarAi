/**
 * BazaarAI — Agent 13: Dispute Agent 🔥 WINNING EDGE
 * Handles: late arrival, overpricing, bad service, cancellation, no-show
 * Simulates: refund, auto-rebooking, escalation
 */

const DISPUTE_TYPES = {
  CANCELLATION: 'Provider cancelled booking',
  NO_SHOW: 'Provider did not arrive',
  LATE_ARRIVAL: 'Provider arrived more than 30 min late',
  OVERPRICING: 'Provider charged more than quoted',
  BAD_SERVICE: 'Service quality was unsatisfactory',
  PRICE_DISPUTE: 'User disputes the quoted price'
};

const RESOLUTION_POLICIES = {
  CANCELLATION: {
    action: 'AUTO_REBOOKING',
    compensation: 'Priority rebooking with next available provider',
    refund_percent: 0,
    sla_hours: 1
  },
  NO_SHOW: {
    action: 'FULL_REFUND_AND_REBOOKING',
    compensation: 'Full refund + PKR 200 credit',
    refund_percent: 100,
    sla_hours: 2
  },
  LATE_ARRIVAL: {
    action: 'PARTIAL_REFUND',
    compensation: '15% discount on final bill',
    refund_percent: 15,
    sla_hours: 24
  },
  OVERPRICING: {
    action: 'PRICE_REVIEW_AND_REFUND',
    compensation: 'Refund of overcharged amount',
    refund_percent: 0, // calculated based on overcharge
    sla_hours: 48
  },
  BAD_SERVICE: {
    action: 'REASSIGNMENT_OR_REFUND',
    compensation: '50% refund or free re-service',
    refund_percent: 50,
    sla_hours: 24
  },
  PRICE_DISPUTE: {
    action: 'OFFER_DISCOUNT_OR_ALTERNATIVE',
    compensation: 'PKR 150 discount or budget provider substitution',
    refund_percent: 0,
    sla_hours: 0.5
  }
};

function runDisputeAgent(bookingOutput, disputeType, additionalInfo, matchingOutput, logger) {
  logger.logAgentStart('DisputeAgent', {
    booking_id: bookingOutput.booking_id,
    dispute_type: disputeType
  });

  const reasoning = [];
  const policy = RESOLUTION_POLICIES[disputeType];

  if (!policy) {
    const result = { resolved: false, reason: `Unknown dispute type: ${disputeType}` };
    logger.logAgentComplete('DisputeAgent', result, 'Unknown dispute type');
    return result;
  }

  reasoning.push(`Dispute received: ${DISPUTE_TYPES[disputeType]}`);
  reasoning.push(`Policy action: ${policy.action}`);
  reasoning.push(`Compensation: ${policy.compensation}`);
  reasoning.push(`Resolution SLA: ${policy.sla_hours}h`);

  let resolution = null;

  switch (policy.action) {
    case 'AUTO_REBOOKING': {
      const runnerUp = matchingOutput?.top3?.[1];
      if (runnerUp) {
        resolution = {
          type: 'REBOOKING',
          message: `⚡ Auto-rebooking triggered!\n` +
            `Original provider cancelled. Next best provider: ${runnerUp.name}\n` +
            `Rating: ${runnerUp.rating}⭐ | Distance: ${runnerUp.distance_km}km\n` +
            `New booking being created automatically...`,
          new_provider: runnerUp.name,
          new_provider_phone: runnerUp.phone,
          rebooking_status: 'INITIATED'
        };
        reasoning.push(`Auto-rebooking to runner-up: ${runnerUp.name}`);
      } else {
        resolution = { type: 'REFUND', message: 'No alternative provider available. Full refund processed.', refund: '100%' };
        reasoning.push('No runner-up available → full refund');
      }
      break;
    }

    case 'FULL_REFUND_AND_REBOOKING': {
      const refundAmount = bookingOutput.booking?.pricing?.total || 0;
      resolution = {
        type: 'FULL_REFUND',
        message: `No-show detected. Full refund of PKR ${refundAmount} processed.\nPKR 200 credit added to your BazaarAI account.`,
        refund_amount: refundAmount,
        credit_added: 200,
        refund_status: 'PROCESSED'
      };
      break;
    }

    case 'PARTIAL_REFUND': {
      const total = bookingOutput.booking?.pricing?.total || 0;
      const refund = Math.round(total * (policy.refund_percent / 100));
      resolution = {
        type: 'PARTIAL_REFUND',
        message: `Late arrival confirmed. ${policy.refund_percent}% discount applied: PKR ${refund} refunded.`,
        refund_amount: refund,
        refund_percent: policy.refund_percent,
        refund_status: 'PROCESSED'
      };
      break;
    }

    case 'PRICE_REVIEW_AND_REFUND': {
      const quoted = bookingOutput.booking?.pricing?.total || 0;
      const charged = additionalInfo?.amount_charged || quoted;
      const overcharge = Math.max(0, charged - quoted);
      resolution = {
        type: 'OVERCHARGE_REFUND',
        message: `Price dispute reviewed. Quoted: PKR ${quoted}, Charged: PKR ${charged}.\n` +
          `Overcharge of PKR ${overcharge} will be refunded within 48 hours.`,
        quoted_amount: quoted,
        charged_amount: charged,
        refund_amount: overcharge,
        refund_status: overcharge > 0 ? 'INITIATED' : 'NO_OVERCHARGE_FOUND'
      };
      break;
    }

    case 'REASSIGNMENT_OR_REFUND': {
      const total = bookingOutput.booking?.pricing?.total || 0;
      const refund = Math.round(total * 0.5);
      resolution = {
        type: 'BAD_SERVICE_RESOLUTION',
        options: [
          { option: 'A', label: '50% Refund', amount: refund, action: 'REFUND' },
          { option: 'B', label: 'Free Re-service', amount: 0, action: 'REASSIGN' }
        ],
        default_action: 'REASSIGN',
        message: `Poor service reported. Options: (A) PKR ${refund} refund OR (B) Free re-service by a new provider.`
      };
      break;
    }

    case 'OFFER_DISCOUNT_OR_ALTERNATIVE': {
      const total = bookingOutput.booking?.pricing?.total || 0;
      const discounted = Math.round(total * 0.85);
      const alt = matchingOutput?.top3?.[2];
      resolution = {
        type: 'PRICE_NEGOTIATION',
        message: `Price dispute acknowledged. Options:\n` +
          `1️⃣  Accept with PKR 150 discount: PKR ${discounted}\n` +
          `2️⃣  Switch to budget provider: ${alt ? alt.name + ' (~PKR ' + alt.price_base + ')' : 'No alt available'}`,
        discounted_price: discounted,
        savings: total - discounted,
        budget_alternative: alt ? { name: alt.name, price: alt.price_base } : null
      };
      break;
    }

    default:
      resolution = { type: 'ESCALATION', message: 'Issue escalated to BazaarAI support team. Response within 2 hours.' };
  }

  const output = {
    dispute_id: `DISP-${Date.now()}`,
    booking_id: bookingOutput.booking_id,
    dispute_type: disputeType,
    dispute_description: DISPUTE_TYPES[disputeType],
    policy_applied: policy,
    resolution,
    resolved: true,
    resolution_timestamp: new Date().toISOString(),
    escalated: false,
    dispute_reasoning: reasoning
  };

  logger.logDecision('DisputeResolution', reasoning.join(' | '), policy.action, []);
  logger.logAgentComplete('DisputeAgent', { type: resolution.type, resolved: true }, reasoning.join(' | '));

  return output;
}

module.exports = { runDisputeAgent, DISPUTE_TYPES };

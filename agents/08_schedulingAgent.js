/**
 * BazaarAI — Agent 08: Scheduling Agent
 * Prevents double booking, adds travel buffer, suggests alternatives
 */

const BOOKING_REGISTRY = new Map(); // In-memory mock booking store

const TRAVEL_BUFFER_MIN = 30;
const SLOT_DURATION_MIN = 120;

function addMinutes(isoTime, minutes) {
  const d = new Date(isoTime);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function formatSlot(isoTime) {
  const d = new Date(isoTime);
  return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function isSlotConflict(providerId, requestedStart, durationMin) {
  const existing = BOOKING_REGISTRY.get(providerId) || [];
  const reqStart = new Date(requestedStart).getTime();
  const reqEnd = reqStart + durationMin * 60000;

  for (const booking of existing) {
    const bStart = new Date(booking.start).getTime();
    const bEnd = new Date(booking.end).getTime();
    // Overlap check + travel buffer
    const bufferEnd = bEnd + TRAVEL_BUFFER_MIN * 60000;
    if (reqStart < bufferEnd && reqEnd > bStart) return true;
  }
  return false;
}

function reserveSlot(providerId, start, end, bookingId) {
  if (!BOOKING_REGISTRY.has(providerId)) {
    BOOKING_REGISTRY.set(providerId, []);
  }
  BOOKING_REGISTRY.get(providerId).push({ bookingId, start, end });
}

function generateAlternativeSlots(requestedTime, provider, count = 3) {
  const slots = [];
  const baseTime = new Date(requestedTime);

  for (let i = 1; i <= count; i++) {
    const altTime = new Date(baseTime);
    altTime.setHours(altTime.getHours() + i * 2);
    // Keep within reasonable hours (8am - 7pm)
    if (altTime.getHours() >= 8 && altTime.getHours() <= 19) {
      slots.push({
        slot_start: altTime.toISOString(),
        slot_end: addMinutes(altTime.toISOString(), SLOT_DURATION_MIN),
        display: formatSlot(altTime.toISOString()),
        available: !isSlotConflict(provider.id, altTime.toISOString(), SLOT_DURATION_MIN)
      });
    }
  }
  return slots.filter(s => s.available);
}

function runSchedulingAgent(decisionOutput, contextOutput, complexityOutput, logger) {
  logger.logAgentStart('SchedulingAgent', {
    provider: decisionOutput.selected_provider?.name,
    requested_time: contextOutput.time?.timestamp
  });

  const provider = decisionOutput.selected_provider;
  const requestedTime = contextOutput.time?.timestamp || new Date().toISOString();
  const durationMin = complexityOutput.estimated_duration_min || 90;
  const reasoning = [];

  if (!provider) {
    return { error: 'No provider to schedule', scheduled: false };
  }

  reasoning.push(`Requested slot: ${formatSlot(requestedTime)}`);
  reasoning.push(`Estimated job duration: ${durationMin} min + ${TRAVEL_BUFFER_MIN} min travel buffer`);

  // Check conflict
  const hasConflict = isSlotConflict(provider.id, requestedTime, durationMin);

  let scheduledStart = requestedTime;
  let scheduledEnd = addMinutes(requestedTime, durationMin);
  let conflictResolved = false;

  if (hasConflict) {
    reasoning.push(`⚠️  Slot conflict detected at ${formatSlot(requestedTime)} for provider ${provider.name}`);
    // Find next available slot
    const alternatives = generateAlternativeSlots(requestedTime, provider, 5);

    if (alternatives.length > 0) {
      scheduledStart = alternatives[0].slot_start;
      scheduledEnd = alternatives[0].slot_end;
      conflictResolved = true;
      reasoning.push(`Auto-resolved: Next available slot → ${formatSlot(scheduledStart)}`);
    } else {
      reasoning.push('No alternative slots available for this provider');
    }
  } else {
    reasoning.push(`No conflict — slot available at ${formatSlot(scheduledStart)}`);
  }

  // Reserve the slot
  reserveSlot(provider.id, scheduledStart, scheduledEnd, `TEMP_${Date.now()}`);
  reasoning.push(`Slot reserved: ${formatSlot(scheduledStart)} → ${formatSlot(scheduledEnd)}`);

  const output = {
    provider_id: provider.id,
    provider_name: provider.name,
    scheduled: true,
    had_conflict: hasConflict,
    conflict_resolved: conflictResolved,
    slot_start: scheduledStart,
    slot_end: scheduledEnd,
    duration_min: durationMin,
    travel_buffer_min: TRAVEL_BUFFER_MIN,
    display_time: `${formatSlot(scheduledStart)} – ${formatSlot(scheduledEnd)}`,
    alternative_slots: hasConflict ? generateAlternativeSlots(requestedTime, provider, 3) : [],
    scheduling_reasoning: reasoning
  };

  logger.logAgentComplete('SchedulingAgent', {
    slot: output.display_time,
    had_conflict: hasConflict,
    conflict_resolved: conflictResolved
  }, reasoning.join(' | '));

  return output;
}

module.exports = { runSchedulingAgent, reserveSlot, BOOKING_REGISTRY };

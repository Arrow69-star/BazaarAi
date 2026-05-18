/**
 * BazaarAI — Agent 04: Provider Discovery Agent
 * Fetches & filters providers from mock dataset using Haversine distance
 */

const fs = require('fs');
const path = require('path');

const PROVIDERS_PATH = path.join(__dirname, '..', 'data', 'providers.json');

// Haversine formula — returns distance in km between two lat/lng points
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isProviderAvailable(provider, requestedTime) {
  if (!requestedTime) return provider.availability_slots.length > 0;
  const reqHour = new Date(requestedTime).getHours();
  return provider.availability_slots.some(slot => {
    const slotHour = parseInt(slot.split(':')[0], 10);
    return Math.abs(slotHour - reqHour) <= 2; // within 2-hour window
  });
}

function runProviderDiscoveryAgent(contextOutput, logger) {
  logger.logAgentStart('ProviderDiscoveryAgent', {
    service: contextOutput.service_type,
    location: contextOutput.location?.sector
  });

  const reasoning = [];
  let allProviders;

  // Load mock dataset
  try {
    allProviders = JSON.parse(fs.readFileSync(PROVIDERS_PATH, 'utf-8'));
    logger.logToolCall('fs.readFile', { path: 'data/providers.json' }, `Loaded ${allProviders.length} providers`);
    reasoning.push(`Loaded ${allProviders.length} providers from mock dataset`);
  } catch (err) {
    logger.logAgentError('ProviderDiscoveryAgent', err);
    logger.logFallback('Dataset read failed', 'Returning empty provider list');
    return { providers: [], discovery_error: err.message };
  }

  const { service_type, location, time } = contextOutput;
  const userLat = location?.lat || 33.6844;
  const userLng = location?.lng || 73.0479;

  // Step 1: Filter by service type
  let filtered = allProviders.filter(p =>
    p.service.toLowerCase() === service_type?.toLowerCase()
  );
  reasoning.push(`Filtered by service "${service_type}": ${filtered.length} providers found`);

  // Step 2: Calculate distance for each
  filtered = filtered.map(p => ({
    ...p,
    distance_km: parseFloat(haversineDistance(userLat, userLng, p.lat, p.lng).toFixed(2))
  }));

  // Step 3: Filter by max distance (15km radius)
  const MAX_DISTANCE_KM = 15;
  const withinRange = filtered.filter(p => p.distance_km <= MAX_DISTANCE_KM);
  reasoning.push(`Within ${MAX_DISTANCE_KM}km radius: ${withinRange.length} providers`);

  // Step 4: Check availability
  const available = withinRange.map(p => ({
    ...p,
    is_available: isProviderAvailable(p, time?.timestamp),
    availability_status: isProviderAvailable(p, time?.timestamp) ? 'AVAILABLE' : 'BUSY'
  }));

  const availableCount = available.filter(p => p.is_available).length;
  reasoning.push(`Available at requested time: ${availableCount} providers`);

  // Step 5: Sort by distance initially
  available.sort((a, b) => a.distance_km - b.distance_km);

  // Fallback: if no providers in range, expand to 30km
  let finalList = available;
  if (withinRange.length === 0) {
    logger.logFallback(`No providers within ${MAX_DISTANCE_KM}km`, 'Expanding search to 30km');
    finalList = filtered
      .filter(p => p.distance_km <= 30)
      .map(p => ({
        ...p,
        is_available: isProviderAvailable(p, time?.timestamp),
        availability_status: isProviderAvailable(p, time?.timestamp) ? 'AVAILABLE' : 'BUSY',
        note: 'Extended search area'
      }));
    reasoning.push(`⚠️  FALLBACK: Expanded to 30km — found ${finalList.length} providers`);
  }

  const output = {
    providers: finalList,
    total_found: finalList.length,
    available_count: finalList.filter(p => p.is_available).length,
    service_type,
    search_location: { lat: userLat, lng: userLng, sector: location?.sector },
    discovery_reasoning: reasoning
  };

  if (finalList.length === 0) {
    logger.logFallback('No providers found in any range', 'Will suggest alternative service areas');
    output.no_providers_available = true;
    output.suggestion = `No ${service_type} providers found near ${location?.sector}. Try F-10 or G-11 area.`;
  }

  logger.logAgentComplete('ProviderDiscoveryAgent', output, reasoning.join(' | '));
  return output;
}

module.exports = { runProviderDiscoveryAgent };

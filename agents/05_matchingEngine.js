/**
 * BazaarAI — Agent 05: Matching Engine
 * Weighted multi-factor scoring — NOT just closest provider
 * score = distance(20%) + availability(20%) + rating(15%) +
 *         reliability(15%) + specialization(10%) + price_fit(10%) + low_cancellation(10%)
 */

function normalizeDistance(distanceKm, maxKm = 15) {
  // Closer = higher score (invert and normalize 0–1)
  return Math.max(0, 1 - distanceKm / maxKm);
}

function normalizeRating(rating, maxRating = 5) {
  return (rating - 3) / (maxRating - 3); // 3.0 = 0, 5.0 = 1
}

function normalizePrice(priceBase, userBudget, maxPrice = 2000) {
  if (userBudget === 'LOW') {
    // Penalize expensive providers heavily
    return Math.max(0, 1 - priceBase / maxPrice);
  } else if (userBudget === 'HIGH') {
    // Slightly prefer mid-high price (quality signal)
    return priceBase / maxPrice;
  }
  // Neutral: moderate price is best
  const ideal = 900;
  return 1 - Math.abs(priceBase - ideal) / maxPrice;
}

function scoreSpecialization(provider, serviceType, complexityLevel) {
  const spec = provider.specialization?.toLowerCase() || '';
  const service = serviceType?.toLowerCase() || '';

  // Exact specialist match
  if (spec.includes('specialist') && spec.includes(service.split(' ')[0])) return 1.0;
  // AC specialist for AC repair
  if (service.includes('ac') && spec.includes('ac')) return 1.0;
  // General technician
  if (spec.includes('general')) return 0.5;
  // Complex job needs specialist
  if (complexityLevel === 'complex' && !spec.includes('specialist')) return 0.2;

  return 0.6; // partial match
}

function calculateWeightedScore(provider, contextOutput, complexityLevel) {
  const { budget_preference, demand } = contextOutput;

  const distanceScore = normalizeDistance(provider.distance_km);
  const availabilityScore = provider.is_available ? 1.0 : 0.1;
  const ratingScore = normalizeRating(provider.rating);
  const reliabilityScore = provider.reliability_score;
  const specializationScore = scoreSpecialization(provider, contextOutput.service_type, complexityLevel);
  const priceScore = normalizePrice(provider.price_base, budget_preference);
  const cancellationScore = 1 - provider.cancellation_rate; // lower rate = higher score

  const weights = {
    distance: 0.20,
    availability: 0.20,
    rating: 0.15,
    reliability: 0.15,
    specialization: 0.10,
    price_fit: 0.10,
    cancellation: 0.10
  };

  const totalScore =
    distanceScore * weights.distance +
    availabilityScore * weights.availability +
    ratingScore * weights.rating +
    reliabilityScore * weights.reliability +
    specializationScore * weights.specialization +
    priceScore * weights.price_fit +
    cancellationScore * weights.cancellation;

  return {
    total: parseFloat(totalScore.toFixed(4)),
    breakdown: {
      distance: { raw: `${provider.distance_km}km`, score: parseFloat(distanceScore.toFixed(3)), weight: '20%' },
      availability: { raw: provider.availability_status, score: availabilityScore, weight: '20%' },
      rating: { raw: provider.rating, score: parseFloat(ratingScore.toFixed(3)), weight: '15%' },
      reliability: { raw: provider.reliability_score, score: reliabilityScore, weight: '15%' },
      specialization: { raw: provider.specialization, score: parseFloat(specializationScore.toFixed(3)), weight: '10%' },
      price_fit: { raw: `PKR ${provider.price_base}`, score: parseFloat(priceScore.toFixed(3)), weight: '10%' },
      cancellation_risk: { raw: `${(provider.cancellation_rate * 100).toFixed(0)}%`, score: parseFloat(cancellationScore.toFixed(3)), weight: '10%' }
    }
  };
}

function runMatchingEngine(discoveryOutput, contextOutput, complexityOutput, logger) {
  logger.logAgentStart('MatchingEngine', {
    providers_to_rank: discoveryOutput.providers?.length,
    budget: contextOutput.budget_preference,
    complexity: complexityOutput.level
  });

  const reasoning = [];
  const providers = discoveryOutput.providers || [];

  if (providers.length === 0) {
    logger.logAgentComplete('MatchingEngine', { top3: [] }, 'No providers to rank');
    return { top3: [], ranked_providers: [], ranking_reasoning: [] };
  }

  // Score every provider
  const scored = providers.map(p => {
    const scoreResult = calculateWeightedScore(p, contextOutput, complexityOutput.level);
    return { ...p, score: scoreResult };
  });

  // Sort by total score descending
  scored.sort((a, b) => b.score.total - a.score.total);

  reasoning.push(`Ranked ${scored.length} providers by weighted score`);
  reasoning.push(`Top scorer: ${scored[0].name} (score: ${scored[0].score.total})`);

  // Compare top vs closest — key differentiator
  const closestProvider = [...providers].sort((a, b) => a.distance_km - b.distance_km)[0];
  const topProvider = scored[0];

  if (topProvider.id !== closestProvider.id) {
    reasoning.push(
      `⚡ SMART MATCH: Selected "${topProvider.name}" (${topProvider.distance_km}km) ` +
      `OVER closest "${closestProvider.name}" (${closestProvider.distance_km}km) ` +
      `because: rating=${topProvider.rating} vs ${closestProvider.rating}, ` +
      `reliability=${topProvider.reliability_score} vs ${closestProvider.reliability_score}, ` +
      `cancellation=${(topProvider.cancellation_rate*100).toFixed(0)}% vs ${(closestProvider.cancellation_rate*100).toFixed(0)}%`
    );
  }

  const top3 = scored.slice(0, 3).map((p, idx) => ({
    rank: idx + 1,
    ...p,
    rank_reason: generateRankReason(p, idx, scored, contextOutput)
  }));

  logger.logRankingLogic(
    providers.map(p => p.name),
    scored.map(p => ({ name: p.name, score: p.score.total, distance: p.distance_km }))
  );

  const output = {
    top3,
    ranked_providers: scored,
    total_evaluated: scored.length,
    smart_match_applied: topProvider.id !== closestProvider.id,
    closest_provider: closestProvider.name,
    selected_provider: topProvider.name,
    ranking_reasoning: reasoning
  };

  logger.logAgentComplete('MatchingEngine', { top3: top3.map(p => ({ name: p.name, score: p.score.total })) }, reasoning.join(' | '));
  return output;
}

function generateRankReason(provider, rank, allScored, contextOutput) {
  const reasons = [];

  if (rank === 0) {
    reasons.push('Highest overall weighted score');
    if (provider.reliability_score >= 0.90) reasons.push(`Excellent reliability (${(provider.reliability_score*100).toFixed(0)}%)`);
    if (provider.cancellation_rate <= 0.05) reasons.push(`Very low cancellation risk (${(provider.cancellation_rate*100).toFixed(0)}%)`);
    if (provider.rating >= 4.6) reasons.push(`Top-rated provider (⭐${provider.rating})`);
    if (contextOutput.budget_preference === 'LOW' && provider.price_base < 900) reasons.push('Budget-friendly price');
  } else if (rank === 1) {
    reasons.push('Strong balance of proximity and quality');
    if (provider.distance_km < allScored[0].distance_km) reasons.push(`Closer to you (${provider.distance_km}km vs ${allScored[0].distance_km}km)`);
    if (provider.price_base < allScored[0].price_base) reasons.push(`Lower base price (PKR ${provider.price_base})`);
  } else {
    reasons.push('Budget-friendly alternative');
    reasons.push(`Lower cost option (PKR ${provider.price_base})`);
  }

  return reasons.join('. ');
}

module.exports = { runMatchingEngine };

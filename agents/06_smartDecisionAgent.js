

function runSmartDecisionAgent(matchingOutput, contextOutput, complexityOutput, logger) {
  logger.logAgentStart('SmartDecisionAgent', {
    top3_count: matchingOutput.top3?.length,
    smart_match_applied: matchingOutput.smart_match_applied
  });

  const reasoning = [];
  const { top3, closest_provider, selected_provider, smart_match_applied } = matchingOutput;

  if (!top3 || top3.length === 0) {
    const noResult = { selected: null, explanation: 'No providers available for this request.' };
    logger.logAgentComplete('SmartDecisionAgent', noResult, 'No providers to decide from');
    return noResult;
  }

  const winner = top3[0];
  const runner_up = top3[1] || null;

  
  const explanation = buildExplanation(winner, runner_up, closest_provider, smart_match_applied, contextOutput, complexityOutput);
  reasoning.push(`Selected: ${winner.name} with score ${winner.score.total}`);
  reasoning.push(explanation.short_reason);

  
  const risk = assessRisk(winner);
  reasoning.push(`Risk assessment: ${risk.level} — ${risk.notes.join(', ')}`);

  
  const decisionConfidence = computeDecisionConfidence(top3);
  reasoning.push(`Decision confidence: ${(decisionConfidence * 100).toFixed(0)}%`);

  const output = {
    selected_provider: winner,
    runner_up: runner_up,
    explanation: explanation,
    risk_assessment: risk,
    decision_confidence: decisionConfidence,
    decision_reasoning: reasoning
  };

  logger.logDecision(
    'Provider Selection',
    explanation.short_reason,
    winner.name,
    top3.slice(1).map(p => p.name)
  );

  logger.logAgentComplete('SmartDecisionAgent', {
    selected: winner.name,
    score: winner.score.total,
    confidence: decisionConfidence
  }, reasoning.join(' | '));

  return output;
}

function buildExplanation(winner, runnerUp, closestName, smartMatch, context, complexity) {
  const scoreGap = runnerUp ? (winner.score.total - runnerUp.score.total).toFixed(3) : 'N/A';

  let shortReason = `${winner.name} selected for best weighted score (${(winner.score.total * 100).toFixed(1)}%)`;

  const detailedReasons = [];

  
  if (smartMatch && closestName !== winner.name) {
    detailedReasons.push(
      `🎯 NOT choosing closest provider "${closestName}" — ${winner.name} is ${winner.distance_km}km away ` +
      `but has superior reliability (${(winner.reliability_score * 100).toFixed(0)}% vs lower) ` +
      `and much lower cancellation risk (${(winner.cancellation_rate * 100).toFixed(0)}%)`
    );
  }

  
  if (winner.rating >= 4.6) {
    detailedReasons.push(
      `⭐ Top-rated: ${winner.rating}/5.0 from verified customer reviews ` +
      `(sentiment score: ${(winner.review_sentiment_score * 100).toFixed(0)}%)`
    );
  }

  
  if (context.budget_preference === 'LOW' && winner.price_base <= 900) {
    detailedReasons.push(`💰 Budget-friendly: PKR ${winner.price_base} base fee (within low budget preference)`);
  }

  
  if (winner.specialization?.toLowerCase().includes('specialist')) {
    detailedReasons.push(`🔧 Specialist technician: "${winner.specialization}" — ideal for ${complexity.level} complexity job`);
  }

  
  if (winner.reliability_score >= 0.90) {
    detailedReasons.push(`✅ High reliability: ${(winner.reliability_score * 100).toFixed(0)}% success rate with ${winner.experience_years} years experience`);
  }

  
  if (runnerUp) {
    detailedReasons.push(
      `📊 Score gap over runner-up "${runnerUp.name}": +${scoreGap} points ` +
      `(${winner.name}: ${(winner.score.total*100).toFixed(1)}% vs ${runnerUp.name}: ${(runnerUp.score.total*100).toFixed(1)}%)`
    );
  }

  return {
    short_reason: shortReason,
    detailed_reasons: detailedReasons,
    summary: detailedReasons.join('\n')
  };
}

function assessRisk(provider) {
  const risks = [];
  const notes = [];
  let level = 'LOW';

  if (provider.cancellation_rate > 0.10) {
    risks.push('HIGH_CANCELLATION');
    notes.push(`Cancellation rate ${(provider.cancellation_rate*100).toFixed(0)}% is above threshold`);
    level = 'MEDIUM';
  }
  if (provider.reliability_score < 0.85) {
    risks.push('LOW_RELIABILITY');
    notes.push(`Reliability ${(provider.reliability_score*100).toFixed(0)}% is below ideal`);
    level = 'MEDIUM';
  }
  if (provider.distance_km > 8) {
    risks.push('LONG_DISTANCE');
    notes.push(`Distance ${provider.distance_km}km may cause delays`);
  }

  if (risks.length === 0) notes.push('Provider meets all quality thresholds');

  return { level, risks, notes };
}

function computeDecisionConfidence(top3) {
  if (top3.length < 2) return 0.95;
  const gap = top3[0].score.total - top3[1].score.total;
  
  return Math.min(0.99, 0.7 + gap * 2);
}

module.exports = { runSmartDecisionAgent };

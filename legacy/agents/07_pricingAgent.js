

const DISTANCE_RATE_PER_KM = 15; 

const URGENCY_FEES = {
  HIGH: { fee: 300, label: 'Emergency/Urgent Fee' },
  NORMAL: { fee: 0, label: null }
};

const DEMAND_SURGE_RATES = {
  VERY_HIGH: 1.3,
  HIGH: 1.15,
  NORMAL: 1.0,
  LOW: 0.9
};

const BUDGET_DISCOUNTS = {
  LOW: 0.10,   
  NEUTRAL: 0,
  HIGH: 0      
};

function runPricingAgent(decisionOutput, contextOutput, complexityOutput, logger) {
  logger.logAgentStart('PricingAgent', {
    provider: decisionOutput.selected_provider?.name,
    complexity: complexityOutput.level,
    urgency: contextOutput.urgency,
    demand: contextOutput.demand?.level
  });

  const provider = decisionOutput.selected_provider;
  const reasoning = [];

  if (!provider) {
    logger.logAgentComplete('PricingAgent', { error: 'No provider selected' }, 'Cannot price without a provider');
    return { error: 'No provider for pricing' };
  }

  
  const baseFee = provider.price_base;
  reasoning.push(`Base fee: PKR ${baseFee} (from provider's listed rate)`);

  
  const complexityMultiplier = complexityOutput.price_multiplier || 1.0;
  const complexityCost = Math.round((baseFee * complexityMultiplier) - baseFee);
  reasoning.push(`Complexity (${complexityOutput.level}): +PKR ${complexityCost} (×${complexityMultiplier})`);

  
  const distanceCost = Math.round(provider.distance_km * DISTANCE_RATE_PER_KM);
  reasoning.push(`Distance cost: ${provider.distance_km}km × PKR ${DISTANCE_RATE_PER_KM} = PKR ${distanceCost}`);

  
  const urgencyConfig = URGENCY_FEES[contextOutput.urgency] || URGENCY_FEES.NORMAL;
  const urgencyFee = urgencyConfig.fee;
  if (urgencyFee > 0) reasoning.push(`Urgency fee: +PKR ${urgencyFee} (${contextOutput.urgency} urgency)`);

  
  const surgeRate = DEMAND_SURGE_RATES[contextOutput.demand?.level] || 1.0;
  const surgeAmount = Math.round((baseFee + complexityCost + distanceCost) * (surgeRate - 1));
  if (surgeAmount > 0) reasoning.push(`Demand surge (${contextOutput.demand?.level}): +PKR ${surgeAmount} (×${surgeRate})`);

  
  const subtotal = baseFee + complexityCost + distanceCost + urgencyFee + surgeAmount;

  
  const discountRate = BUDGET_DISCOUNTS[contextOutput.budget_preference] || 0;
  const discountAmount = Math.round(subtotal * discountRate);
  if (discountAmount > 0) reasoning.push(`Budget discount (${(discountRate * 100).toFixed(0)}%): -PKR ${discountAmount}`);

  
  const total = subtotal - discountAmount;
  reasoning.push(`TOTAL: PKR ${total}`);

  
  const allTop3 = contextOutput._top3_providers || [];
  const budgetAlt = findBudgetAlternative(allTop3, provider, total);

  const output = {
    provider_name: provider.name,
    breakdown: {
      base_fee: { amount: baseFee, label: 'Visit + Service Fee' },
      complexity_cost: { amount: complexityCost, label: `Complexity (${complexityOutput.level})` },
      distance_cost: { amount: distanceCost, label: `Travel (${provider.distance_km}km)` },
      urgency_fee: { amount: urgencyFee, label: urgencyConfig.label || 'Standard' },
      demand_surge: { amount: surgeAmount, label: `Demand Surge (${contextOutput.demand?.level || 'NORMAL'})` },
      discount: { amount: -discountAmount, label: discountAmount > 0 ? 'Budget Discount' : 'No Discount' },
    },
    subtotal,
    discount_applied: discountAmount,
    total_price: total,
    currency: 'PKR',
    estimated_duration_min: complexityOutput.estimated_duration_min,
    budget_alternative: budgetAlt,
    pricing_reasoning: reasoning
  };

  logger.logAgentComplete('PricingAgent', {
    total: total,
    breakdown_keys: Object.keys(output.breakdown)
  }, reasoning.join(' | '));

  return output;
}

function findBudgetAlternative(top3, selectedProvider, currentTotal) {
  
  const others = top3.filter(p => p.id !== selectedProvider.id);
  if (others.length === 0) return null;

  const cheapest = others.sort((a, b) => a.price_base - b.price_base)[0];
  if (!cheapest) return null;

  const altTotal = Math.round(cheapest.price_base * 0.85); 
  const savings = currentTotal - altTotal;

  return {
    provider_name: cheapest.name,
    estimated_total: altTotal,
    savings: savings > 0 ? savings : 0,
    trade_off: `Saves PKR ${savings > 0 ? savings : 0} but rating is ${cheapest.rating} vs ${selectedProvider.rating}`,
    specialization: cheapest.specialization
  };
}

module.exports = { runPricingAgent };

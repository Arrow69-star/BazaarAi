

const DEMAND_CALENDAR = {
  'AC Repair': {
    peak_months: [4, 5, 6, 7, 8], 
    peak_multiplier: 1.4,
    off_multiplier: 0.8
  },
  'Plumbing': {
    peak_months: [7, 8, 9], 
    peak_multiplier: 1.3,
    off_multiplier: 0.9
  },
  'Electrician': {
    peak_months: [6, 7, 8], 
    peak_multiplier: 1.2,
    off_multiplier: 1.0
  },
  'Painter': {
    peak_months: [10, 11, 3, 4], 
    peak_multiplier: 1.2,
    off_multiplier: 0.9
  },
  'Cleaning': {
    peak_months: [3, 4], 
    peak_multiplier: 1.1,
    off_multiplier: 1.0
  }
};

const SECTOR_DENSITY = {
  'G-13': { density: 'HIGH', population_density: 8500, avg_income: 'MIDDLE' },
  'G-14': { density: 'HIGH', population_density: 7800, avg_income: 'MIDDLE' },
  'F-10': { density: 'MEDIUM', population_density: 5500, avg_income: 'UPPER_MIDDLE' },
  'F-11': { density: 'MEDIUM', population_density: 5200, avg_income: 'UPPER_MIDDLE' },
  'G-10': { density: 'MEDIUM', population_density: 6200, avg_income: 'MIDDLE' },
  'G-11': { density: 'HIGH', population_density: 7500, avg_income: 'MIDDLE' },
  'I-8':  { density: 'HIGH', population_density: 9000, avg_income: 'LOWER_MIDDLE' },
  'I-9':  { density: 'HIGH', population_density: 8700, avg_income: 'LOWER_MIDDLE' }
};

function estimateDemandLevel(serviceType, requestedTime) {
  const now = new Date(requestedTime || new Date());
  const month = now.getMonth() + 1;
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  const serviceCalendar = DEMAND_CALENDAR[serviceType] || {
    peak_months: [],
    peak_multiplier: 1.0,
    off_multiplier: 1.0
  };

  let demandScore = 1.0;
  if (serviceCalendar.peak_months.includes(month)) {
    demandScore = serviceCalendar.peak_multiplier;
  } else {
    demandScore = serviceCalendar.off_multiplier;
  }

  
  if (hour >= 9 && hour <= 11) demandScore *= 1.2; 
  if (hour >= 15 && hour <= 17) demandScore *= 1.15; 

  
  if (dayOfWeek === 5 || dayOfWeek === 6) demandScore *= 1.1; 

  let level = 'NORMAL';
  if (demandScore > 1.3) level = 'VERY_HIGH';
  else if (demandScore > 1.1) level = 'HIGH';
  else if (demandScore < 0.9) level = 'LOW';

  return {
    level,
    surge_multiplier: parseFloat(demandScore.toFixed(2)),
    reason: `${serviceType} demand in month ${month} (${level})`
  };
}

function assessTravelFeasibility(location, requestedTime) {
  if (!location) return { feasible: false, reason: 'Location unknown' };

  const hour = new Date(requestedTime || new Date()).getHours();
  const isRushHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);

  return {
    feasible: true,
    estimated_travel_time_min: isRushHour ? 25 : 15,
    traffic_level: isRushHour ? 'HIGH' : 'NORMAL',
    buffer_required_min: isRushHour ? 30 : 15,
    recommended_provider_sectors: getNearby(location?.sector)
  };
}

function getNearby(sector) {
  const adjacency = {
    'G-13': ['G-14', 'G-11', 'I-8'],
    'G-14': ['G-13', 'F-10', 'G-11'],
    'F-10': ['F-11', 'G-14', 'G-10'],
    'F-11': ['F-10', 'G-10'],
    'G-10': ['G-11', 'G-13', 'F-10'],
    'G-11': ['G-10', 'G-13', 'G-14'],
    'I-8':  ['G-13', 'I-9'],
    'I-9':  ['I-8', 'G-11']
  };
  return adjacency[sector] || [];
}

function runContextAgent(intentOutput, logger) {
  logger.logAgentStart('ContextAgent', intentOutput);
  const reasoning = [];

  const { location, time, service_type } = intentOutput;

  
  let enrichedLocation = location;
  if (location) {
    const density = SECTOR_DENSITY[location.sector] || { density: 'MEDIUM', avg_income: 'MIDDLE' };
    enrichedLocation = {
      ...location,
      area_density: density.density,
      avg_income_level: density.avg_income,
      nearby_sectors: getNearby(location.sector)
    };
    reasoning.push(`Location enriched: ${location.sector} → density=${density.density}, income=${density.avg_income}`);
  }

  
  const demand = estimateDemandLevel(service_type, time?.timestamp);
  reasoning.push(`Demand level for "${service_type}": ${demand.level} (surge: ${demand.surge_multiplier}x) — ${demand.reason}`);

  
  const travelFeasibility = assessTravelFeasibility(location, time?.timestamp);
  reasoning.push(`Travel feasibility: ${travelFeasibility.feasible ? 'YES' : 'NO'}, estimated ${travelFeasibility.estimated_travel_time_min} min`);

  
  const month = new Date(time?.timestamp || Date.now()).getMonth() + 1;
  const weatherImpact = {
    season: month >= 4 && month <= 8 ? 'SUMMER' : month >= 7 && month <= 9 ? 'MONSOON' : 'WINTER',
    temperature_estimate: month >= 4 && month <= 8 ? '38-42°C' : '15-25°C',
    ac_demand_boost: month >= 4 && month <= 8,
    note: month >= 4 && month <= 8 ? '🔥 Peak summer — AC technicians in very high demand' : null
  };
  reasoning.push(`Weather: ${weatherImpact.season}, ${weatherImpact.temperature_estimate}`);

  const output = {
    ...intentOutput,
    location: enrichedLocation,
    demand,
    travel_feasibility: travelFeasibility,
    weather_impact: weatherImpact,
    context_enriched: true
  };

  logger.logAgentComplete('ContextAgent', output, reasoning.join(' | '));
  return output;
}

module.exports = { runContextAgent };

import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

const MOCK_PROVIDERS = [
  { id:'p1', name:'ColdBreeze AC Experts', phone:'+923001234567', service_category:'AC Repair', specialization:['Inverter','Compressor','Gas Refill'], latitude:33.6844, longitude:73.0479, rating:4.84, on_time_score:0.96, cancellation_rate:0.02, base_rate_pkr:1500, is_available:true, daily_jobs_completed:1, years_experience:18, review_recency_days:1 },
  { id:'p2', name:'Ali AC Services',       phone:'+923007654321', service_category:'AC Repair', specialization:['Window AC','Gas Leak','Inverter'],    latitude:33.6750, longitude:73.0380, rating:4.71, on_time_score:0.88, cancellation_rate:0.05, base_rate_pkr:1200, is_available:true, daily_jobs_completed:2, years_experience:12, review_recency_days:3 },
  { id:'p3', name:'QuickFix HVAC',         phone:'+923009876543', service_category:'AC Repair', specialization:['General Cleaning','Window AC'],       latitude:33.6610, longitude:73.0200, rating:4.45, on_time_score:0.80, cancellation_rate:0.10, base_rate_pkr:1000, is_available:true, daily_jobs_completed:3, years_experience:8,  review_recency_days:12 },
  { id:'p4', name:'TechCool Islamabad',    phone:'+923003210987', service_category:'AC Repair', specialization:['Inverter','Chiller','Compressor'],    latitude:33.7200, longitude:73.0800, rating:4.92, on_time_score:0.99, cancellation_rate:0.01, base_rate_pkr:2500, is_available:true, daily_jobs_completed:0, years_experience:22, review_recency_days:2 },
  { id:'p5', name:'Khan Plumbing & Gas',   phone:'+923002345678', service_category:'Plumbing',  specialization:['Pipe Repair','Gas Leak','Drainage'],  latitude:33.6820, longitude:73.0450, rating:4.78, on_time_score:0.94, cancellation_rate:0.03, base_rate_pkr:1200, is_available:true, daily_jobs_completed:1, years_experience:15, review_recency_days:2 },
  { id:'p6', name:'Bajwa Electric Works',  phone:'+923006789012', service_category:'Electrician',specialization:['Wiring','MCB Panel','Short Circuit'], latitude:33.6890, longitude:73.0520, rating:4.88, on_time_score:0.97, cancellation_rate:0.02, base_rate_pkr:1400, is_available:true, daily_jobs_completed:1, years_experience:20, review_recency_days:1 },
];

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const LOCATION_COORDS = {
  'G-13': { lat:33.6844, lon:73.0479 }, 'G-14': { lat:33.6900, lon:73.0550 },
  'F-10': { lat:33.7050, lon:73.0700 }, 'F-11': { lat:33.6950, lon:73.0600 },
  'G-10': { lat:33.6730, lon:73.0400 }, 'G-11': { lat:33.6780, lon:73.0420 },
  'I-8':  { lat:33.6600, lon:73.0300 }, 'I-9':  { lat:33.6680, lon:73.0380 },
  'H-9':  { lat:33.6700, lon:73.0350 }, 'Bahria':{ lat:33.5300, lon:73.1400 },
  'DHA':  { lat:33.5800, lon:73.0800 },
};

export const AntigravityOrchestrator = {

  intentRecognitionNode(userQuery) {
    const traces = [];
    traces.push({ step:'Intent Recognition Node', status:'RUNNING', message:'Parsing NLP stream...' });

    const q = userQuery.toLowerCase().trim();
    let serviceType = null;
    let location    = null;
    let urgency     = 'NORMAL';
    let timeSlot    = 'Tomorrow morning (9:00 AM)';
    let confidence  = 1.0;

    const svcMap = {
      'AC Repair':    ['ac','air condition','cooling','thanda','compressor','gas fill','ac kharab','bilkul kaam nahi','technician','hvac'],
      'Plumbing':     ['plumber','pipe','paani','water','drain','leak','nali','nalka','toilet','flush','drainage'],
      'Electrician':  ['bijli','electric','wiring','fan','light','socket','switch','mcb','short circuit','fuse'],
      'Carpenter':    ['carpenter','darwaza','door','furniture','almari','wardrobe','lakri','polish'],
      'Cleaning':     ['clean','safai','dust','sweep','ghar saaf','washing'],
    };
    for (const [svc, kws] of Object.entries(svcMap)) {
      if (kws.some(k => q.includes(k))) { serviceType = svc; break; }
    }

    for (const loc of Object.keys(LOCATION_COORDS)) {
      if (q.includes(loc.toLowerCase())) { location = loc; break; }
    }
    if (!location && (q.includes('islamabad')||q.includes('isb'))) location = 'G-13';
    if (!location && (q.includes('rawalpindi')||q.includes('pindi'))) location = 'I-8';

    if (q.includes('abhi')||q.includes('now')||q.includes('urgent')||q.includes('emergency')||q.includes('jaldi')) {
      urgency = 'CRITICAL'; timeSlot = 'As soon as possible';
    } else if (q.includes('aaj')||q.includes('today')) {
      timeSlot = 'Today';
    } else if (q.includes('kal')||q.includes('tomorrow')) {
      timeSlot = q.includes('sham')||q.includes('evening') ? 'Tomorrow evening (4:00 PM)' : 'Tomorrow morning (9:00 AM)';
    }

    let budget = 'MEDIUM';
    if (q.includes('sasta')||q.includes('budget kam')||q.includes('cheap')||q.includes('affordable')) budget = 'LOW';
    if (q.includes('best')||q.includes('quality')||q.includes('premium')) budget = 'HIGH';

    let complexity = 'BASIC';
    if (q.includes('kaam nahi kar')||q.includes('compressor')||q.includes('chiller')||q.includes('complete wiring')) complexity = 'COMPLEX';
    else if (q.includes('service')||q.includes('cleaning')||q.includes('check')) complexity = 'INTERMEDIATE';

    let confScore = 0;
    if (serviceType) confScore += 0.50;
    if (location)    confScore += 0.35;
    if (timeSlot)    confScore += 0.15;
    confidence = confScore;

    if (!serviceType || !location) {
      traces.push({ step:'Intent Recognition Node', status:'WARNING', message:`Low confidence (${(confidence*100).toFixed(0)}%). Missing: ${!serviceType?'service type ':''} ${!location?'location':''}` });
      return { confidence, traces, needsClarification: true, budget, complexity };
    }

    traces.push({ step:'Intent Recognition Node', status:'DONE', message:`Service: ${serviceType}, Loc: ${location}, Conf: ${(confidence*100).toFixed(0)}%` });
    return { serviceType, location, urgency, timeSlot, budget, complexity, confidence, needsClarification: false, traces };
  },

  async contextAndDiscoveryNode(intent) {
    const traces = [];
    traces.push({ step:'Context & Discovery Node', status:'RUNNING', message:`Geo-spatial query for ${intent.serviceType}...` });
    
    let providers = [];
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from('providers').select('*').eq('service_category', intent.serviceType).eq('is_available', true);
      providers = data || [];
    }
    if (providers.length === 0) {
      providers = MOCK_PROVIDERS.filter(p => p.service_category === intent.serviceType && p.is_available);
    }
    traces.push({ step:'Context & Discovery Node', status:'DONE', message:`Discovered ${providers.length} available providers.` });
    return { providers, traces };
  },

  optimizationNode(providers, intent, userQuery) {
    const traces = [];
    traces.push({ step:'Optimization Node', status:'RUNNING', message:`Applying 6-factor mathematical ranking...` });

    const coords = LOCATION_COORDS[intent.location] || { lat:33.6844, lon:73.0479 };

    const ranked = providers.map(p => {
      const dist = haversine(coords.lat, coords.lon, p.latitude, p.longitude);

      const wDistance  = 0.25;
      const wRating    = 0.25;
      const wOnTime    = 0.20;
      const wCancel    = 0.15;
      const wWorkload  = 0.10;
      const wRecency   = 0.05;

      const normDist     = Math.max(0, 1 - dist / 15);
      const normRating   = p.rating / 5;
      const normOnTime   = Number(p.on_time_score);
      const normCancel   = Math.max(0, 1 - Number(p.cancellation_rate));
      const normWorkload = p.daily_jobs_completed > 3 ? 0.2 : 1.0;
      const normRecency  = Math.max(0, 1 - p.review_recency_days / 30);

      let budgetFit = 1.0;
      if (intent.budget === 'LOW'  && p.base_rate_pkr > 1500) budgetFit = 0.75;
      if (intent.budget === 'HIGH' && p.base_rate_pkr < 1200) budgetFit = 0.85;

      const score = (
        wDistance * normDist + wRating * normRating + wOnTime * normOnTime +
        wCancel * normCancel + wWorkload * normWorkload + wRecency * normRecency
      ) * budgetFit;

      const specMatch = p.specialization.some(s => userQuery.toLowerCase().includes(s.toLowerCase()));
      const whySelected = [
        `Rating: ${p.rating}/5`,
        `Distance: ${dist.toFixed(1)}km`,
        `Reliability: ${(p.on_time_score*100).toFixed(0)}%`,
        `Cancellation risk: ${(p.cancellation_rate*100).toFixed(0)}%`,
        `Workload: ${p.daily_jobs_completed} jobs today`,
      ];

      return { ...p, distanceKms: dist, matchScore: score, specMatch, whySelected };
    }).sort((a, b) => b.matchScore - a.matchScore);

    const winner = ranked[0];
    const rejected = ranked.slice(1).map(p => ({
      name: p.name, score: p.matchScore,
      reason: p.rating < winner.rating
        ? `Lower rating (${p.rating} vs ${winner.rating})`
        : p.cancellation_rate > winner.cancellation_rate
        ? `Higher cancellation risk (${(p.cancellation_rate*100).toFixed(0)}%)`
        : `Lower overall score (${(p.matchScore*100).toFixed(1)}% vs ${(winner.matchScore*100).toFixed(1)}%)`,
    }));

    traces.push({ step:'Optimization Node', status:'DONE', message:`Optimum match: ${winner.name} (${(winner.matchScore*100).toFixed(1)}%)` });
    return { ranked, rejected, traces };
  },

  async actionExecutionNode(intent, provider, allTraces, userQuery) {
    const traces = [];
    traces.push({ step:'Action Execution Node', status:'RUNNING', message:'Finalizing booking and generating receipt...' });

    const base      = Number(provider.base_rate_pkr);
    const urgency   = intent.urgency === 'CRITICAL' ? 1.30 : 1.0;
    const complex   = intent.complexity === 'COMPLEX' ? 1.40 : intent.complexity === 'INTERMEDIATE' ? 1.15 : 1.0;
    const distCost  = Math.round(provider.distanceKms * 40);
    const budgetDisc= intent.budget === 'LOW' ? 0.90 : 1.0;
    const total     = Math.round(base * urgency * complex * budgetDisc + distCost);

    const pricing = {
      base, urgencySurge: Math.round(base*(urgency-1)),
      complexitySurge: Math.round(base*urgency*(complex-1)),
      distanceFee: distCost, budgetDiscount: Math.round(base*(1-budgetDisc)),
      total,
    };

    const bookingData = {
      user_query: userQuery, extracted_service: intent.serviceType,
      extracted_location: intent.location, extracted_time: intent.timeSlot,
      complexity: intent.complexity, provider_id: provider.id || null,
      final_quote_pkr: pricing.total, status: 'CONFIRMED',
      antigravity_trace: allTraces, confidence_score: intent.confidence,
    };

    let bookingId = 'BAZ-' + Math.random().toString(36).slice(2,10).toUpperCase();

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('bookings').insert(bookingData).select().single();
      if (!error && data) {
        bookingId = data.id;
      }
    }

    traces.push({ step:'Action Execution Node', status:'DONE', message:`Booking ID ${bookingId} confirmed.` });
    return { bookingId, pricing, traces };
  },

  handleCancellation(ranked, currentProvider) {
    const traces = [];
    traces.push({ step:'Incident Node', status:'ALERT', message:`Cancellation by ${currentProvider.name}. Initiating failover...` });
    const backup = ranked.find(p => p.id !== currentProvider.id && p.is_available);
    if (!backup) {
      traces.push({ step:'Incident Node', status:'ERROR', message:'Failover exhausted.' });
      return { success: false, traces };
    }
    traces.push({ step:'Incident Node', status:'DONE', message:`Failover successful to ${backup.name}.` });
    return { success: true, provider: backup, traces };
  },

  async executeWorkflow(userQuery, forceMode = null) {
    let allTraces = [];
    allTraces.push({ step:'Pipeline Manager', status:'RUNNING', message:'Initializing Antigravity linear pipeline...' });

    if (forceMode === 'LOW_CONFIDENCE') {
      const intent = this.intentRecognitionNode('kuch kaam hai');
      allTraces.push(...intent.traces);
      return { success: false, mode: 'CLARIFY', message: 'I need more details. What service and sector?\n(e.g., "G-13 mein AC repair kal subah")', traces: allTraces };
    }

    const intent = this.intentRecognitionNode(userQuery);
    allTraces.push(...intent.traces);
    if (intent.needsClarification) {
      return { success: false, mode: 'CLARIFY', message: 'Please clarify your service and location.\n(e.g., "G-13 AC repair kal subah")', traces: allTraces };
    }

    const discovery = await this.contextAndDiscoveryNode(intent);
    allTraces.push(...discovery.traces);

    const optimization = this.optimizationNode(discovery.providers, intent, userQuery);
    allTraces.push(...optimization.traces);

    let selectedProvider = optimization.ranked[0];

    if (forceMode === 'PROVIDER_CANCELLATION') {
      const recovery = this.handleCancellation(optimization.ranked, selectedProvider);
      allTraces.push(...recovery.traces);
      if (recovery.success) selectedProvider = recovery.provider;
    }

    const execution = await this.actionExecutionNode(intent, selectedProvider, allTraces, userQuery);
    allTraces.push(...execution.traces);

    allTraces.push({ step:'Pipeline Manager', status:'DONE', message:`Pipeline execution complete.` });

    return {
      success: true, mode: 'SUCCESS', bookingId: execution.bookingId,
      intent, provider: selectedProvider, pricing: execution.pricing,
      rejected: optimization.rejected, traces: allTraces,
      fallbackTriggered: forceMode === 'PROVIDER_CANCELLATION',
    };
  },

  async executeDisputeResolution(bookingId, reason) {
    const traces = [];
    traces.push({ step:'Dispute Node', status:'RUNNING', message:`Evaluating dispute: ${reason}...` });

    let notes = '', compensation = 0;
    if (reason === 'PRICE_DISAGREEMENT') { notes = '15% refund applied.'; compensation = 0.15; }
    else if (reason === 'NO_SHOW')       { notes = 'Full refund + PKR 200 voucher.'; compensation = 1.0; }
    else                                  { notes = '10% compensation issued.'; compensation = 0.10; }

    if (isSupabaseConfigured() && bookingId.length > 12) {
      const { data: booking } = await supabase.from('bookings').select('final_quote_pkr').eq('id', bookingId).single();
      const price = booking?.final_quote_pkr || 1000;
      await supabase.from('disputes').insert({ booking_id: bookingId, reason, status: 'RESOLVED_COMPENSATION', resolution_notes: notes, compensation_pkr: Math.round(price * compensation) });
    }

    traces.push({ step:'Dispute Node', status:'DONE', message: notes });
    return { traces, notes };
  },
};

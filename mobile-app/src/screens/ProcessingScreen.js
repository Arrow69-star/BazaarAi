import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AgentStepCard from '../components/AgentStepCard';
import { COLORS, RADIUS, SPACING, SIZES } from '../constants/theme';
import { submitRequest } from '../services/api';

const AGENT_SEQUENCE = [
  { name: 'IntentAgent',              label: 'Parsing your request...',        delay: 300  },
  { name: 'ContextAgent',             label: 'Enriching location & time...',   delay: 900  },
  { name: 'ComplexityClassifier',     label: 'Classifying job complexity...',  delay: 1500 },
  { name: 'ProviderDiscoveryAgent',   label: 'Searching providers nearby...',  delay: 2100 },
  { name: 'MatchingEngine',           label: 'Running weighted scoring...',     delay: 2700 },
  { name: 'SmartDecisionAgent',       label: 'Selecting best provider...',     delay: 3300 },
  { name: 'PricingAgent',             label: 'Calculating dynamic price...',   delay: 3900 },
  { name: 'SchedulingAgent',          label: 'Checking availability...',       delay: 4500 },
  { name: 'BookingAgent',             label: 'Confirming booking...',          delay: 5100 },
  { name: 'NotificationAgent',        label: 'Sending confirmations...',       delay: 5700 },
  { name: 'LiveSimulationAgent',      label: 'Simulating service lifecycle...',delay: 6300 },
];

export default function ProcessingScreen({ navigation, route }) {
  const { userText, simulateCancellation, simulatePriceDispute, forceMode } = route.params || {};
  const [agentStatuses, setAgentStatuses] = useState(
    AGENT_SEQUENCE.reduce((acc, a) => ({ ...acc, [a.name]: 'pending' }), {})
  );
  const [agentOutputs, setAgentOutputs] = useState({});
  const [phase, setPhase] = useState('Initializing agents...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    runPipeline();
  }, []);

  const setStatus = (name, status, output = null) => {
    setAgentStatuses(prev => ({ ...prev, [name]: status }));
    if (output) setAgentOutputs(prev => ({ ...prev, [name]: output }));
  };

  const animateProgress = (value) => {
    Animated.timing(progressAnim, {
      toValue: value, duration: 400, useNativeDriver: false,
    }).start();
    setProgress(value);
  };

  const runPipeline = async () => {
    for (let i = 0; i < AGENT_SEQUENCE.length; i++) {
      const agent = AGENT_SEQUENCE[i];
      await delay(550);
      setStatus(agent.name, 'running');
      setPhase(agent.label);
      animateProgress(Math.round(((i + 0.5) / AGENT_SEQUENCE.length) * 100));
    }

    try {
      setPhase('Calling Khidmat AI Backend...');
      const response = await submitRequest(userText, {
        simulateCancellation,
        simulatePriceDispute,
        forceMode
      });

      const raw = response?.result || {};
      const adapted = adaptPythonResponse(raw, userText);

      const outputMap = {
        IntentAgent:            `Service: ${raw.intent?.service_type || '?'} | Conf: ${Math.round((raw.intent?.confidence || 0) * 100)}%`,
        ContextAgent:           'Location enriched | Demand scored',
        ComplexityClassifier:   'Job complexity: basic',
        ProviderDiscoveryAgent: `Found ${raw.discovery?.total_found || raw.top3_providers?.length || 0} providers`,
        MatchingEngine:         `Top pick: ${raw.top3_providers?.[0]?.name || 'Best match'} (score ${raw.top3_providers?.[0]?.score || '—'})`,
        SmartDecisionAgent:     raw.top3_providers?.[0]?.why_selected || 'Best reliability & proximity',
        PricingAgent:           `Total: PKR ${raw.receipt?.pricing?.total_pkr || '—'}`,
        SchedulingAgent:        `Slot: ${raw.receipt?.time_slot || '09:00'}`,
        BookingAgent:           `ID: ${raw.receipt?.booking_id || adapted.final_output?.booking_confirmation?.booking_id}`,
        NotificationAgent:      'SMS & WhatsApp confirmation sent',
        LiveSimulationAgent:    'Service lifecycle scheduled',
      };
      for (const agent of AGENT_SEQUENCE) {
        setStatus(agent.name, 'done', outputMap[agent.name] || 'Done');
      }
      animateProgress(100);
      setPhase('Orchestration Complete!');
      setTimeout(() => navigation.navigate('Results', { result: adapted }), 800);

    } catch (err) {
      setError(err.message || 'Connection failed');
      setPhase('Backend offline — Demo mode active');
      for (const agent of AGENT_SEQUENCE) {
        setStatus(agent.name, 'done', 'Demo mode');
      }
      animateProgress(100);
      setTimeout(() => navigation.navigate('Results', { result: buildDemoResult(userText) }), 1200);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0A0E1A', '#111827']} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <Text style={styles.title}>🧠 AI Processing</Text>
        <Text style={styles.query} numberOfLines={2}>"{userText}"</Text>

        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
            <LinearGradient colors={['#6C63FF', '#22D3EE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>

        <View style={styles.phaseRow}>
          <View style={styles.pulseDot} />
          <Text style={styles.phaseText}>{phase}</Text>
          <Text style={styles.progressPct}>{progress}%</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error} — Running Demo Mode</Text>
          </View>
        )}
      </Animated.View>

      <ScrollView style={styles.stepsScroll} contentContainerStyle={styles.stepsContent}>
        <Text style={styles.stepsLabel}>🔄 Agent Pipeline</Text>
        {AGENT_SEQUENCE.map((agent, i) => (
          <AgentStepCard
            key={agent.name}
            agentName={agent.name}
            status={agentStatuses[agent.name]}
            output={agentOutputs[agent.name]}
            index={i}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function adaptPythonResponse(raw, userText) {
  if (!raw) return buildDemoResult(userText);
  if (raw.source === 'node') return raw;
  
  const intent = raw.intent || {};
  const discovery = raw.discovery || {};
  const top3 = raw.top3_providers || [];
  const rejected = raw.rejected_providers || [];
  const receipt = raw.receipt || {};
  const failure = raw.fallback_triggered || false;
  
  const mappedTop3 = top3.map((p, i) => ({
    id: p.id,
    rank: i + 1,
    name: p.name,
    rating: p.rating,
    distance_km: p.distance_km,
    score: { total: p.score },
    specialization: p.specialization,
    sector: p.sector,
    phone: p.phone,
    availability_status: 'AVAILABLE',
    reliability_score: p.reliability_score || 0.9,
    cancellation_rate: p.cancellation_rate || 0.05,
    price_base: p.price_base || 1000,
    rank_reason: p.why_selected || p.why_not || 'Ranked via Super Prompt formula',
  }));

  const pricingBreakdown = {
    base_fee: { amount: receipt.pricing?.base_fee || 1000, label: 'Base Service Fee' },
    distance_cost: { amount: receipt.pricing?.distance_fee || 0, label: 'Distance Fee' },
    urgency_fee: { amount: receipt.pricing?.urgency_fee || 0, label: 'Urgency Fee' },
    demand_surge: { amount: Math.round((receipt.pricing?.surge_multiplier - 1) * 100) || 0, label: 'Surge' }
  };

  return {
    session_id: raw.session_id,
    raw_input: userText,
    confidence_breakdown: { overall: Math.round((intent.confidence || 0.9) * 100) },
    stages: {
      intent: intent,
      matching: { top3: mappedTop3 },
      pricing: {
        total_price: receipt.pricing?.total_pkr || 1000,
        breakdown: pricingBreakdown
      },
      decision: {
        risk_assessment: { level: top3[0]?.cancellation_rate > 0.1 ? 'MEDIUM' : 'LOW', notes: ['Verified local provider', 'High rating'] }
      },
      whatsapp_simulation: [
        { sender: 'Khidmat AI', text: `Hi ${mappedTop3[0]?.name}, new ${intent.service_type} job in ${intent.location}. Accept?`, time: 'Now' },
        { sender: 'Provider', text: `Yes, accepting.`, time: 'Now' }
      ]
    },
    final_output: {
      service_request: {
        service: intent.service_type || 'Unknown Service',
        location: intent.location || 'Unknown Location',
        time: intent.time_preference || 'ASAP',
        urgency: intent.urgency_level || 'normal',
        language: intent.language_detected || 'English'
      },
      recommended_provider: mappedTop3[0] || null,
      reasoning: [
        mappedTop3[0]?.rank_reason || 'Highest score',
        `Distance: ${mappedTop3[0]?.distance_km}km`,
        `Rating: ⭐${mappedTop3[0]?.rating}`
      ],
      rejected_providers: rejected.map(p => ({
        name: p.name, score: p.score, rejection_reason: p.why_not
      })),
      total_price: `PKR ${receipt.pricing?.total_pkr || 1000}`,
      booking_confirmation: {
        booking_id: receipt.booking_id,
        slot: receipt.time_slot,
        status: receipt.status || 'CONFIRMED ✅'
      },
      failure_simulation: failure ? {
        triggered: true,
        original_provider: 'A cancelled provider',
        message: 'Provider cancelled immediately after booking.',
        new_provider: mappedTop3[0]?.name
      } : { triggered: false }
    }
  };
}

function buildDemoResult(text) {
  return {
    session_id: 'demo_session',
    raw_input: text,
    final_output: {
      service_request: { service: 'AC Repair', location: 'G-13, Islamabad', time: 'Tomorrow morning (9:00 AM)', urgency: 'NORMAL', language: 'roman_urdu' },
      recommended_provider: { name: 'ColdBreeze AC Experts', rating: 4.9, distance: '1.1km', specialization: 'AC Specialist', phone: '+92-319-0123456' },
      reasoning: ['Highest overall weighted score (93%)', 'Excellent reliability (96%)', 'Very low cancellation risk (2%)', 'Top-rated provider ⭐4.9'],
      pricing_breakdown: {
        base_fee: { amount: 1100, label: 'Visit + Service Fee' },
        complexity_cost: { amount: 0, label: 'Basic Service' },
        distance_cost: { amount: 17, label: 'Travel (1.1km)' },
        urgency_fee: { amount: 0, label: 'Standard' },
        demand_surge: { amount: 165, label: 'Demand Surge (HIGH)' },
        discount: { amount: -128, label: 'Budget Discount' },
      },
      total_price: 'PKR 1,154',
      booking_confirmation: { booking_id: 'BAZ-DEMO-001', slot: '9:00 AM – 11:00 AM', status: 'CONFIRMED ✅' },
    },
    stages: {
      booking: { confirmed: true, booking_id: 'BAZ-DEMO-001', receipt: { booking_id: 'BAZ-DEMO-001', service_type: 'AC Repair', location_display: 'G-13, Islamabad', slot_display: '9:00 AM – 11:00 AM', provider_name: 'ColdBreeze AC Experts', provider_phone: '+92-319-0123456', total_amount: 1154, text: 'DEMO RECEIPT' }, booking: { provider: { rating: 4.9 }, pricing: { total: 1154 }, schedule: { display: '9:00 AM – 11:00 AM' } } },
      pricing: { total_price: 1154, breakdown: { base_fee: { amount: 1100, label: 'Visit + Service Fee' }, distance_cost: { amount: 17, label: 'Travel' }, demand_surge: { amount: 165, label: 'Demand Surge' }, discount: { amount: -128, label: 'Budget Discount' } } },
      matching: { top3: [{ rank: 1, name: 'ColdBreeze AC Experts', rating: 4.9, distance_km: 1.1, score: { total: 0.93 }, specialization: 'AC Specialist', sector: 'G-13', availability_status: 'AVAILABLE', reliability_score: 0.96, cancellation_rate: 0.02, price_base: 1100, rank_reason: 'Highest overall score. Excellent reliability (96%). Very low cancellation (2%).' }, { rank: 2, name: 'Ali AC Services', rating: 4.7, distance_km: 0.5, score: { total: 0.84 }, specialization: 'AC Specialist', sector: 'G-13', availability_status: 'AVAILABLE', reliability_score: 0.92, cancellation_rate: 0.05, price_base: 1000, rank_reason: 'Closer but lower reliability score.' }, { rank: 3, name: 'Ahmed AC Solutions', rating: 4.1, distance_km: 0.4, score: { total: 0.72 }, specialization: 'Budget AC Repair', sector: 'G-11', availability_status: 'AVAILABLE', reliability_score: 0.78, cancellation_rate: 0.18, price_base: 700, rank_reason: 'Budget-friendly alternative. Lower rating and high cancellation risk.' }] },
      simulation: { stages: [{ stage: 'PROVIDER_ASSIGNED', message: 'ColdBreeze AC Experts has accepted your booking', timestamp: new Date().toISOString() }, { stage: 'EN_ROUTE', message: 'Provider is on the way — ETA 15 min', timestamp: new Date(Date.now() + 15 * 60000).toISOString() }, { stage: 'ARRIVED', message: 'Provider has arrived at G-13', timestamp: new Date(Date.now() + 30 * 60000).toISOString() }, { stage: 'JOB_STARTED', message: 'AC Repair service started', timestamp: new Date(Date.now() + 35 * 60000).toISOString() }, { stage: 'JOB_COMPLETED', message: 'Service completed successfully!', timestamp: new Date(Date.now() + 90 * 60000).toISOString() }] },
    }
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: SPACING.base,
    paddingTop: 50,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { color: COLORS.textPrimary, fontSize: SIZES.xl, fontWeight: '800', marginBottom: SPACING.xs },
  query: { color: COLORS.accent, fontSize: SIZES.sm, fontStyle: 'italic', marginBottom: SPACING.md },
  progressBar: {
    height: 8, backgroundColor: COLORS.border,
    borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.sm,
  },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  phaseText: { color: COLORS.textSecondary, fontSize: SIZES.xs, flex: 1 },
  progressPct: { color: COLORS.primary, fontSize: SIZES.xs, fontWeight: '700' },
  errorBanner: { marginTop: SPACING.sm, backgroundColor: COLORS.warningGlow, borderRadius: RADIUS.sm, padding: SPACING.sm },
  errorText: { color: COLORS.warning, fontSize: SIZES.xs },
  stepsScroll: { flex: 1 },
  stepsContent: { padding: SPACING.base, paddingTop: SPACING.md },
  stepsLabel: { color: COLORS.textSecondary, fontSize: SIZES.sm, fontWeight: '600', marginBottom: SPACING.md },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AgentStepCard from '../components/AgentStepCard';
import { COLORS, RADIUS, SPACING, SIZES } from '../constants/theme';
import { submitRequest } from '../services/api';

const AGENT_SEQUENCE = [
  { name: 'IntentAgent',              label: 'Parsing your request…',        delay: 300  },
  { name: 'ContextAgent',             label: 'Enriching location & time…',   delay: 900  },
  { name: 'ComplexityClassifier',     label: 'Classifying job complexity…',  delay: 1500 },
  { name: 'ProviderDiscoveryAgent',   label: 'Searching providers nearby…',  delay: 2100 },
  { name: 'MatchingEngine',           label: 'Running weighted scoring…',     delay: 2700 },
  { name: 'SmartDecisionAgent',       label: 'Selecting best provider…',     delay: 3300 },
  { name: 'PricingAgent',             label: 'Calculating dynamic price…',   delay: 3900 },
  { name: 'SchedulingAgent',          label: 'Checking availability…',       delay: 4500 },
  { name: 'BookingAgent',             label: 'Confirming booking…',          delay: 5100 },
  { name: 'NotificationAgent',        label: 'Sending confirmations…',       delay: 5700 },
  { name: 'LiveSimulationAgent',      label: 'Simulating service lifecycle…',delay: 6300 },
];

export default function ProcessingScreen({ navigation, route }) {
  const { userText, simulateCancellation, simulatePriceDispute } = route.params || {};
  const [agentStatuses, setAgentStatuses] = useState(
    AGENT_SEQUENCE.reduce((acc, a) => ({ ...acc, [a.name]: 'pending' }), {})
  );
  const [agentOutputs, setAgentOutputs] = useState({});
  const [phase, setPhase] = useState('Initializing agents…');
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
    // Animate each agent card with fake step-by-step reveal
    for (let i = 0; i < AGENT_SEQUENCE.length; i++) {
      const agent = AGENT_SEQUENCE[i];
      await delay(600);
      setStatus(agent.name, 'running');
      setPhase(agent.label);
      animateProgress(Math.round(((i + 0.5) / AGENT_SEQUENCE.length) * 100));
    }

    // Call real backend
    try {
      setPhase('🔗 Calling BazaarAI Backend…');
      const response = await submitRequest(userText, {
        simulateCancellation,
        simulatePriceDispute,
      });

      // Mark all complete
      const stages = response?.result?.stages || {};
      for (const agent of AGENT_SEQUENCE) {
        const stageKey = getStageKey(agent.name);
        setStatus(agent.name, 'done', summarize(stages[stageKey]));
      }
      animateProgress(100);
      setPhase('✅ Orchestration Complete!');

      setTimeout(() => {
        navigation.navigate('Results', { result: response.result });
      }, 800);

    } catch (err) {
      setError(err.message || 'Connection failed');
      setPhase('❌ Backend connection failed — showing demo mode');

      // Demo mode: mark all done anyway
      for (const agent of AGENT_SEQUENCE) {
        setStatus(agent.name, 'done', 'Demo output (backend offline)');
      }
      animateProgress(100);

      setTimeout(() => {
        navigation.navigate('Results', { result: buildDemoResult(userText) });
      }, 1200);
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

      {/* Header */}
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

      {/* Agent Steps — THE WINNING SCREEN */}
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

function getStageKey(agentName) {
  const map = {
    IntentAgent: 'intent',
    ContextAgent: 'context',
    ComplexityClassifier: 'complexity',
    ProviderDiscoveryAgent: 'discovery',
    MatchingEngine: 'matching',
    SmartDecisionAgent: 'decision',
    PricingAgent: 'pricing',
    SchedulingAgent: 'scheduling',
    BookingAgent: 'booking',
    NotificationAgent: 'notifications',
    LiveSimulationAgent: 'simulation',
  };
  return map[agentName] || agentName.toLowerCase();
}

function summarize(stageData) {
  if (!stageData) return 'Completed';
  if (stageData.service_type) return `Service: ${stageData.service_type} | Conf: ${Math.round((stageData.confidence_score||0)*100)}%`;
  if (stageData.total_found !== undefined) return `Found ${stageData.total_found} providers`;
  if (stageData.selected_provider) return `Selected: ${stageData.selected_provider.name}`;
  if (stageData.total_price) return `Total: PKR ${stageData.total_price}`;
  if (stageData.booking_id) return `ID: ${stageData.booking_id}`;
  if (stageData.display_time) return `Slot: ${stageData.display_time}`;
  return 'Done';
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

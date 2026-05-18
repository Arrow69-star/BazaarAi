import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ProviderCard from '../components/ProviderCard';
import PricingBreakdown from '../components/PricingBreakdown';
import WhatsAppSim from '../components/WhatsAppSim';
import ConfidenceCard from '../components/ConfidenceCard';
import { COLORS, RADIUS, SPACING, SIZES, SHADOWS } from '../constants/theme';

const TABS = ['Intent', 'Providers', 'Pricing', 'Decision', 'WhatsApp', 'Logs'];

export default function ResultsScreen({ navigation, route }) {
  const { result } = route.params || {};
  const [activeTab, setActiveTab] = useState('Intent');
  const [selectedProvider, setSelectedProvider] = useState(null);

  const final = result?.final_output || {};
  const stages = result?.stages || {};
  const top3 = stages.matching?.top3 || [];
  const pricing = stages.pricing || {};
  const decision = stages.decision || {};
  const failureSim = final.failure_simulation;
  const rejectedProviders = final.rejected_providers || [];
  const confidence = final.confidence_breakdown || result?.confidence_breakdown;
  const whatsappMsgs = final.whatsapp_messages || stages.whatsapp_simulation;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0A0E1A', '#111827']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📊 Results</Text>
          {failureSim?.triggered && (
            <Text style={styles.failureBadgeText}>⚡ Auto-Rebooking Active</Text>
          )}
        </View>
        {final.booking_confirmation?.booking_id && (
          <View style={styles.successBadge}>
            <Text style={styles.successText}>✅ Confirmed</Text>
          </View>
        )}
      </View>

      {/* Failure Story Banner */}
      {failureSim?.triggered && (
        <View style={styles.failureBanner}>
          <Text style={styles.failureTitle}>⚠️ Provider Cancelled — Failure Simulation Active</Text>
          <Text style={styles.failureText}>
            Original: {failureSim.original_provider} → {failureSim.message}
          </Text>
          <Text style={[styles.failureText, { color: COLORS.success, marginTop: 4 }]}>
            ✅ Auto-assigned: {failureSim.new_provider}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={styles.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: SPACING.base }}>

        {/* ─── INTENT TAB ─── */}
        {activeTab === 'Intent' && (
          <View>
            <SectionCard title="🧠 Extracted Intent">
              <InfoRow label="Service" value={final.service_request?.service} highlight />
              <InfoRow label="Location" value={final.service_request?.location} />
              <InfoRow label="Time" value={final.service_request?.time} />
              <InfoRow label="Urgency" value={final.service_request?.urgency} />
              <InfoRow label="Language" value={final.service_request?.language?.toUpperCase()} />
            </SectionCard>

            <ConfidenceCard confidence={confidence} />

            {stages.context && (
              <SectionCard title="🌍 Context">
                <InfoRow label="Demand" value={stages.context.demand?.level}
                  color={stages.context.demand?.level === 'HIGH' ? COLORS.warning : COLORS.success} />
                <InfoRow label="Surge" value={`${stages.context.demand?.surge_multiplier}x`} />
                <InfoRow label="Season" value={stages.context.weather_impact?.season} />
              </SectionCard>
            )}

            {stages.complexity && (
              <SectionCard title="⚙️ Complexity">
                <View style={[styles.complexityBadge, {
                  backgroundColor: stages.complexity.level === 'complex' ? COLORS.errorGlow :
                    stages.complexity.level === 'intermediate' ? COLORS.warningGlow : COLORS.successGlow
                }]}>
                  <Text style={{ color: stages.complexity.level === 'complex' ? COLORS.error :
                    stages.complexity.level === 'intermediate' ? COLORS.warning : COLORS.success,
                    fontWeight: '800', fontSize: SIZES.lg }}>
                    {stages.complexity.level?.toUpperCase()}
                  </Text>
                </View>
                <InfoRow label="Duration" value={`~${stages.complexity.estimated_duration_min} min`} />
                <InfoRow label="Price Multiplier" value={`${stages.complexity.price_multiplier}x`} />
              </SectionCard>
            )}
          </View>
        )}

        {/* ─── PROVIDERS TAB ─── */}
        {activeTab === 'Providers' && (
          <View>
            <View style={styles.matchInsight}>
              <Text style={styles.matchInsightText}>
                🎯 Selected <Text style={{ color: COLORS.accent, fontWeight: '700' }}>
                  {final.recommended_provider?.name}
                </Text> — NOT the closest. See Decision tab for why.
              </Text>
            </View>

            {top3.map((p, i) => (
              <ProviderCard
                key={p.id || i} provider={p} rank={i + 1}
                selected={selectedProvider?.id === p.id || (!selectedProvider && i === 0)}
                onSelect={setSelectedProvider}
              />
            ))}

            {/* Why NOT others */}
            {rejectedProviders.length > 0 && (
              <SectionCard title="❌ Why NOT Other Providers?">
                {rejectedProviders.map((p, i) => (
                  <View key={i} style={styles.rejectedRow}>
                    <View style={styles.rejectedLeft}>
                      <Text style={styles.rejectedName}>#{i + 2} {p.name}</Text>
                      <Text style={styles.rejectedScore}>Score: {p.score}%</Text>
                    </View>
                    <Text style={styles.rejectedReason}>{p.rejection_reason}</Text>
                  </View>
                ))}
              </SectionCard>
            )}
          </View>
        )}

        {/* ─── PRICING TAB ─── */}
        {activeTab === 'Pricing' && (
          <View>
            <PricingBreakdown pricing={pricing} />
            {final.total_price && (
              <View style={[styles.totalCard, SHADOWS.accent]}>
                <Text style={styles.totalCardLabel}>💰 You Pay</Text>
                <Text style={styles.totalCardValue}>{final.total_price}</Text>
                <Text style={styles.totalCardSub}>Cash on delivery • No hidden charges</Text>
              </View>
            )}
          </View>
        )}

        {/* ─── DECISION TAB ─── */}
        {activeTab === 'Decision' && (
          <View>
            <SectionCard title="💡 Why This Provider?">
              {(final.reasoning || []).map((r, i) => (
                <View key={i} style={styles.reasonRow}>
                  <Text style={styles.reasonBullet}>→</Text>
                  <Text style={styles.reasonText}>{r}</Text>
                </View>
              ))}
            </SectionCard>

            {decision.risk_assessment && (
              <SectionCard title="⚠️ Risk Assessment">
                <View style={[styles.riskBadge, {
                  backgroundColor: decision.risk_assessment.level === 'LOW' ? COLORS.successGlow : COLORS.warningGlow
                }]}>
                  <Text style={{ color: decision.risk_assessment.level === 'LOW' ? COLORS.success : COLORS.warning, fontWeight: '700' }}>
                    Risk: {decision.risk_assessment.level}
                  </Text>
                </View>
                {(decision.risk_assessment.notes || []).map((n, i) => (
                  <Text key={i} style={styles.riskNote}>• {n}</Text>
                ))}
              </SectionCard>
            )}

            {/* Failure Story */}
            {failureSim?.triggered && (
              <SectionCard title="🔁 Failure Story Mode">
                <View style={styles.storyStep}>
                  <Text style={styles.storyIcon}>⚠️</Text>
                  <Text style={styles.storyText}>{failureSim.original_provider} cancelled after booking</Text>
                </View>
                <View style={styles.storyStep}>
                  <Text style={styles.storyIcon}>🔁</Text>
                  <Text style={styles.storyText}>Auto-reassigning best alternative...</Text>
                </View>
                <View style={styles.storyStep}>
                  <Text style={styles.storyIcon}>✅</Text>
                  <Text style={[styles.storyText, { color: COLORS.success }]}>
                    {failureSim.new_provider} assigned successfully
                  </Text>
                </View>
              </SectionCard>
            )}
          </View>
        )}

        {/* ─── WHATSAPP TAB ─── */}
        {activeTab === 'WhatsApp' && (
          <View>
            <View style={styles.waInfo}>
              <Text style={styles.waInfoText}>
                📲 Simulating real WhatsApp communication between BazaarAI and provider — matching Pakistan informal economy workflow
              </Text>
            </View>
            <WhatsAppSim messages={whatsappMsgs} />
          </View>
        )}

        {/* ─── LOGS TAB ─── */}
        {activeTab === 'Logs' && (
          <View>
            <SectionCard title="📋 Antigravity Log Trace">
              <InfoRow label="Session ID" value={result?.session_id} />
              <InfoRow label="Booking Status" value={final.booking_confirmation?.status} />
              <InfoRow label="Fallback Used" value={result?.stages?.fallback_clarification ? 'YES' : 'NO'} />
              <InfoRow label="Cancellation Sim" value={failureSim?.triggered ? 'TRIGGERED' : 'No'} />
              <InfoRow label="Log Path" value="logs/session_xxx.json" />
            </SectionCard>

            <SectionCard title="🔍 Agent Trace">
              {['Intent', 'Context', 'Complexity', 'Discovery', 'Matching', 'Decision', 'Pricing', 'Scheduling', 'Booking', 'Notifications', 'Simulation', 'Feedback'].map((a, i) => (
                <View key={i} style={styles.traceRow}>
                  <Text style={styles.traceStep}>{i + 1}.</Text>
                  <Text style={styles.traceName}>{a} Agent</Text>
                  <Text style={styles.traceDone}>✅</Text>
                </View>
              ))}
            </SectionCard>

            <View style={styles.logJsonCard}>
              <Text style={styles.logJsonTitle}>📄 Sample Log JSON</Text>
              <Text style={styles.logJson}>{JSON.stringify({
                plan: 'User requested AC repair in G-13',
                agents_used: ['IntentAgent', 'MatchingEngine', 'BookingAgent'],
                reasoning: ['Detected AC repair', 'Ranked 8 providers', 'Selected best reliability'],
                fallback: failureSim?.triggered || false,
                booking_status: 'confirmed',
                confidence: confidence?.overall ? confidence.overall / 100 : 0.91
              }, null, 2)}</Text>
            </View>
          </View>
        )}

        {/* Book Now CTA */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Booking', { result })}
          activeOpacity={0.9}
        >
          <LinearGradient colors={['#6C63FF', '#4F46E5']} style={styles.bookBtn}>
            <Text style={styles.bookBtnText}>📋  Confirm Booking →</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value, highlight, color }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && { color: COLORS.accent }, color && { color }]}>
        {value || '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: SPACING.base, paddingTop: 50,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderBottomWidth: 1,
    borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  title: { color: COLORS.textPrimary, fontSize: SIZES.xl, fontWeight: '800' },
  failureBadgeText: { color: COLORS.warning, fontSize: SIZES.xs, fontWeight: '600', marginTop: 2 },
  successBadge: { backgroundColor: COLORS.successGlow, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  successText: { color: COLORS.success, fontSize: SIZES.xs, fontWeight: '600' },
  failureBanner: {
    backgroundColor: COLORS.warningGlow, padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.warning + '33',
  },
  failureTitle: { color: COLORS.warning, fontSize: SIZES.sm, fontWeight: '700', marginBottom: 4 },
  failureText: { color: COLORS.textSecondary, fontSize: SIZES.xs, lineHeight: 18 },
  tabsScroll: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 44 },
  tabs: { flexDirection: 'row' },
  tab: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textMuted, fontSize: SIZES.xs, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  scroll: { flex: 1 },
  sectionCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md },
  sectionTitle: { color: COLORS.textPrimary, fontSize: SIZES.base, fontWeight: '700', marginBottom: SPACING.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  infoLabel: { color: COLORS.textSecondary, fontSize: SIZES.sm },
  infoValue: { color: COLORS.textPrimary, fontSize: SIZES.sm, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  complexityBadge: { borderRadius: RADIUS.sm, padding: SPACING.sm, alignItems: 'center', marginBottom: SPACING.sm },
  matchInsight: { backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.primary + '33' },
  matchInsightText: { color: COLORS.textSecondary, fontSize: SIZES.xs, lineHeight: 18 },
  rejectedRow: { paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rejectedLeft: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rejectedName: { color: COLORS.error, fontSize: SIZES.sm, fontWeight: '600' },
  rejectedScore: { color: COLORS.textMuted, fontSize: SIZES.xs },
  rejectedReason: { color: COLORS.textSecondary, fontSize: SIZES.xs, lineHeight: 16 },
  totalCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent + '33' },
  totalCardLabel: { color: COLORS.textSecondary, fontSize: SIZES.sm, marginBottom: SPACING.xs },
  totalCardValue: { color: COLORS.accent, fontSize: 40, fontWeight: '800' },
  totalCardSub: { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: SPACING.xs },
  reasonRow: { flexDirection: 'row', gap: SPACING.sm, paddingVertical: 5 },
  reasonBullet: { color: COLORS.primary, fontSize: SIZES.base, fontWeight: '700' },
  reasonText: { color: COLORS.textSecondary, fontSize: SIZES.sm, flex: 1, lineHeight: 20 },
  riskBadge: { borderRadius: RADIUS.sm, padding: SPACING.sm, alignItems: 'center', marginBottom: SPACING.sm },
  riskNote: { color: COLORS.textMuted, fontSize: SIZES.xs, paddingVertical: 3 },
  storyStep: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  storyIcon: { fontSize: 20 },
  storyText: { color: COLORS.textSecondary, fontSize: SIZES.sm, flex: 1 },
  waInfo: { backgroundColor: COLORS.successGlow, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  waInfoText: { color: COLORS.success, fontSize: SIZES.xs, lineHeight: 18 },
  traceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: SPACING.sm },
  traceStep: { color: COLORS.textMuted, fontSize: SIZES.xs, width: 20 },
  traceName: { color: COLORS.textSecondary, fontSize: SIZES.xs, flex: 1 },
  traceDone: { fontSize: 12 },
  logJsonCard: { backgroundColor: '#0D1117', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  logJsonTitle: { color: COLORS.accent, fontSize: SIZES.sm, fontWeight: '600', marginBottom: SPACING.sm },
  logJson: { color: '#58A6FF', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
  bookBtn: { borderRadius: RADIUS.lg, padding: SPACING.base + 2, alignItems: 'center', marginTop: SPACING.md, marginBottom: 20 },
  bookBtnText: { color: '#fff', fontSize: SIZES.base, fontWeight: '800' },
});

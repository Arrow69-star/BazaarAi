import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getTrace } from '../services/api';
import { COLORS, RADIUS, SPACING, SIZES } from '../constants/theme';

const STATUS_COLOR = {
  success: '#10B981', error: '#EF4444', cancelled: '#EF4444',
  running: '#F59E0B', clarification_needed: '#F97316',
};

export default function AgentTraceScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const FILTERS = ['ALL', 'booking', 'followup', 'session'];

  useEffect(() => {
    fetchTrace();
  }, []);

  const fetchTrace = async () => {
    try {
      const data = await getTrace(100);
      setEntries(data.entries || []);
    } catch {
      setEntries(DEMO_TRACE);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'ALL' ? entries : entries.filter(e => e.type === filter || (e.agents_used && filter === 'session'));

  const renderItem = ({ item, index }) => {
    const isExp = expanded === index;
    const agentList = item.agents_used || (item.agent ? [item.agent] : []);
    const statusColor = STATUS_COLOR[item.booking_status || item.status] || '#6366F1';
    return (
      <TouchableOpacity style={styles.entry} onPress={() => setExpanded(isExp ? null : index)}>
        <View style={styles.entryHeader}>
          <View style={[styles.typeBadge, { borderColor: statusColor + '60', backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.typeText, { color: statusColor }]}>{item.type || 'session'}</Text>
          </View>
          <View style={styles.entryMeta}>
            {item.session_id && <Text style={styles.sessionId}>ID: {item.session_id}</Text>}
            {item.booking_id && <Text style={styles.sessionId}>BK: {item.booking_id}</Text>}
            <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
          </View>
        </View>
        {agentList.length > 0 && (
          <View style={styles.agentPills}>
            {agentList.map((a, i) => (
              <View key={i} style={styles.agentPill}>
                <Text style={styles.agentPillText}>{a}</Text>
              </View>
            ))}
          </View>
        )}
        {item.final_decision && <Text style={styles.decision} numberOfLines={isExp ? undefined : 1}>→ {item.final_decision}</Text>}
        {isExp && item.reasoning_steps && (
          <View style={styles.stepsContainer}>
            <Text style={styles.stepsLabel}>Reasoning Steps:</Text>
            {item.reasoning_steps.map((step, i) => (
              <View key={i} style={styles.step}>
                <Text style={styles.stepNum}>{i + 1}.</Text>
                <Text style={styles.stepText}>{typeof step === 'string' ? step : step.message || JSON.stringify(step)}</Text>
              </View>
            ))}
          </View>
        )}
        {isExp && item.event && (
          <Text style={styles.eventText}>Event: {item.event} ({item.trigger})</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />
      <LinearGradient colors={['#0D1117', '#111827']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <Text style={styles.title}>🔬 Agent Trace Viewer</Text>
        <Text style={styles.sub}>{entries.length} entries</Text>
      </View>

      {/* DEV MODE badge */}
      <View style={styles.devBadge}>
        <View style={styles.devDot} />
        <Text style={styles.devText}>DEV MODE — Live agent_trace.jsonl</Text>
      </View>

      {/* Filter row */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6366F1" size="large" />
          <Text style={styles.loadingText}>Reading trace file…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No trace entries yet</Text>
              <Text style={styles.emptySub}>Submit a request to generate traces</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const DEMO_TRACE = [
  { type: 'session', session_id: 'demo_01', agents_used: ['IntentAgent','DiscoveryAgent','RankingAgent','BookingAgent','FollowupAgent'], final_decision: 'Booking BK-20260519-DEMO confirmed for ColdBreeze AC Experts at PKR 1154', booking_status: 'success', timestamp: new Date().toISOString(), reasoning_steps: ['IntentAgent: Detected AC Repair in G-13 with 85% confidence','DiscoveryAgent: Found 4 providers within 10km','RankingAgent: Scored 4 providers using 4-factor formula','BookingAgent: Reserved slot 09:00 for ColdBreeze AC Experts','FollowupAgent: Scheduled 4 notification events'] },
];

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#0D1117' },
  header:       { padding: SPACING.base, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#21262D' },
  title:        { color: '#E2E8F0', fontSize: SIZES.xl, fontWeight: '800' },
  sub:          { color: '#6E7681', fontSize: SIZES.sm },
  devBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.base, paddingVertical: 6, backgroundColor: '#161B22', borderBottomWidth: 1, borderBottomColor: '#21262D' },
  devDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  devText:      { color: '#58A6FF', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  filterRow:    { flexDirection: 'row', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, gap: SPACING.sm, backgroundColor: '#161B22', borderBottomWidth: 1, borderBottomColor: '#21262D' },
  filterBtn:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: '#21262D' },
  filterBtnActive:{ backgroundColor: '#6366F1' },
  filterText:   { color: '#6E7681', fontSize: SIZES.xs, fontWeight: '600' },
  filterTextActive:{ color: '#FFF' },
  list:         { padding: SPACING.base, paddingBottom: 40 },
  entry:        { backgroundColor: '#161B22', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: '#21262D' },
  entryHeader:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  typeBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1 },
  typeText:     { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  entryMeta:    { flex: 1 },
  sessionId:    { color: '#3FB950', fontSize: 10, fontFamily: 'monospace' },
  timestamp:    { color: '#6E7681', fontSize: 10 },
  agentPills:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: SPACING.xs },
  agentPill:    { backgroundColor: '#21262D', borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2 },
  agentPillText:{ color: '#8B949E', fontSize: 9 },
  decision:     { color: '#C9D1D9', fontSize: SIZES.xs, lineHeight: 16 },
  stepsContainer:{ marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: '#21262D' },
  stepsLabel:   { color: '#6E7681', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  step:         { flexDirection: 'row', gap: 6, marginBottom: 4 },
  stepNum:      { color: '#6E7681', fontSize: 10, width: 16 },
  stepText:     { color: '#8B949E', fontSize: 10, flex: 1, lineHeight: 14 },
  eventText:    { color: '#F59E0B', fontSize: 10, marginTop: SPACING.xs },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText:  { color: '#6E7681', fontSize: SIZES.sm, marginTop: SPACING.sm },
  emptyText:    { color: '#E2E8F0', fontSize: SIZES.base, fontWeight: '700' },
  emptySub:     { color: '#6E7681', fontSize: SIZES.sm, marginTop: SPACING.xs },
});

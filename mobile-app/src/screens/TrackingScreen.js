import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, SIZES } from '../constants/theme';

const STAGE_ICONS = {
  PROVIDER_ASSIGNED: '✅',
  EN_ROUTE: '🚗',
  ARRIVED: '📍',
  JOB_STARTED: '🔧',
  JOB_COMPLETED: '🎉',
};

export default function TrackingScreen({ navigation, route }) {
  const { result } = route.params || {};
  const stages = result?.stages || {};
  const simStages = stages.simulation?.stages || [];
  const dispute = stages.dispute_cancellation || stages.dispute_price || null;
  const [activeStage, setActiveStage] = useState(0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0A0E1A', '#111827']} style={StyleSheet.absoluteFill} />

      {}
      <View style={styles.header}>
        <Text style={styles.title}>📡 Live Tracking</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {}
        {dispute && (
          <View style={styles.disputeCard}>
            <Text style={styles.disputeTitle}>⚖️ Dispute Resolution Active</Text>
            {dispute.resolution && (
              <Text style={styles.disputeMsg}>{dispute.resolution.message}</Text>
            )}
            {dispute.resolution?.new_provider && (
              <View style={styles.rebookCard}>
                <Text style={styles.rebookTitle}>⚡ Auto-Rebooking</Text>
                <Text style={styles.rebookText}>New Provider: {dispute.resolution.new_provider}</Text>
              </View>
            )}
            {dispute.resolution?.discounted_price && (
              <View style={styles.rebookCard}>
                <Text style={styles.rebookTitle}>💰 Price Negotiation</Text>
                <Text style={styles.rebookText}>Discounted: PKR {dispute.resolution.discounted_price}</Text>
                <Text style={styles.rebookText}>Savings: PKR {dispute.resolution.savings}</Text>
              </View>
            )}
          </View>
        )}

        {}
        <View style={styles.mapBox}>
          <LinearGradient colors={['#1E2A3B', '#162032']} style={styles.mapGradient}>
            <Text style={styles.mapEmoji}>🗺️</Text>
            <Text style={styles.mapTitle}>Provider Location Tracking</Text>
            <Text style={styles.mapSub}>G-13, Islamabad</Text>
            <View style={styles.pinRow}>
              <View style={[styles.pin, { backgroundColor: COLORS.primaryGlow }]}>
                <Text style={styles.pinIcon}>📍</Text>
                <Text style={[styles.pinText, { color: COLORS.primaryLight }]}>Your Location</Text>
              </View>
              <View style={[styles.pin, { backgroundColor: COLORS.accentGlow }]}>
                <Text style={styles.pinIcon}>🚗</Text>
                <Text style={[styles.pinText, { color: COLORS.accent }]}>Provider</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>📋 Service Timeline</Text>
          {simStages.length === 0 && (
            <Text style={styles.emptyText}>No tracking data available.</Text>
          )}
          {simStages.map((stage, i) => {
            const isActive = i === activeStage;
            const isDone = i < activeStage;
            return (
              <TouchableOpacity key={i} onPress={() => setActiveStage(i)}>
                <View style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.dot,
                      isDone && { backgroundColor: COLORS.success },
                      isActive && { backgroundColor: COLORS.accent, width: 14, height: 14, borderRadius: 7 },
                    ]} />
                    {i < simStages.length - 1 && (
                      <View style={[styles.line, isDone && { backgroundColor: COLORS.success }]} />
                    )}
                  </View>
                  <View style={[styles.timelineContent, isActive && styles.timelineActive]}>
                    <View style={styles.stageHeader}>
                      <Text style={styles.stageIcon}>{STAGE_ICONS[stage.stage] || '⬜'}</Text>
                      <Text style={[styles.stageName, isActive && { color: COLORS.accent }]}>
                        {stage.stage.replace(/_/g, ' ')}
                      </Text>
                    </View>
                    <Text style={styles.stageMsg}>{stage.message}</Text>
                    <Text style={styles.stageTime}>
                      {new Date(stage.timestamp).toLocaleTimeString('en-PK', {
                        hour: '2-digit', minute: '2-digit', hour12: true
                      })}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {}
        <View style={styles.edgeCard}>
          <Text style={styles.edgeTitle}>🧪 Simulate Edge Cases</Text>
          <View style={styles.edgeRow}>
            <TouchableOpacity
              style={[styles.edgeBtn, { borderColor: COLORS.error + '55' }]}
              onPress={() => navigation.navigate('Feedback', { result })}
            >
              <Text style={styles.edgeBtnIcon}>⚡</Text>
              <Text style={[styles.edgeBtnText, { color: COLORS.error }]}>Provider Cancelled</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.edgeBtn, { borderColor: COLORS.warning + '55' }]}
              onPress={() => navigation.navigate('Feedback', { result })}
            >
              <Text style={styles.edgeBtnIcon}>⚖️</Text>
              <Text style={[styles.edgeBtnText, { color: COLORS.warning }]}>Price Dispute</Text>
            </TouchableOpacity>
          </View>
        </View>

        {}
        <TouchableOpacity onPress={() => navigation.navigate('Feedback', { result })} activeOpacity={0.9}>
          <LinearGradient colors={['#6C63FF', '#4F46E5']} style={styles.rateBtn}>
            <Text style={styles.rateBtnText}>⭐  Rate Your Service →</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: SPACING.base,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  title: { color: COLORS.textPrimary, fontSize: SIZES.xl, fontWeight: '800' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.errorGlow, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.error },
  liveText: { color: COLORS.error, fontSize: SIZES.xs, fontWeight: '800' },
  scroll: { padding: SPACING.base, paddingBottom: 40 },
  disputeCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.base, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.warning + '44',
  },
  disputeTitle: { color: COLORS.warning, fontSize: SIZES.base, fontWeight: '700', marginBottom: SPACING.sm },
  disputeMsg: { color: COLORS.textSecondary, fontSize: SIZES.sm, lineHeight: 20 },
  rebookCard: {
    marginTop: SPACING.sm, backgroundColor: COLORS.successGlow,
    borderRadius: RADIUS.sm, padding: SPACING.sm,
  },
  rebookTitle: { color: COLORS.success, fontWeight: '700', fontSize: SIZES.sm },
  rebookText: { color: COLORS.textSecondary, fontSize: SIZES.xs, marginTop: 3 },
  mapBox: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.md, height: 180 },
  mapGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  mapEmoji: { fontSize: 36 },
  mapTitle: { color: COLORS.textPrimary, fontSize: SIZES.base, fontWeight: '700' },
  mapSub: { color: COLORS.textMuted, fontSize: SIZES.xs },
  pinRow: { flexDirection: 'row', gap: SPACING.sm },
  pin: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3,
  },
  pinIcon: { fontSize: 12 },
  pinText: { fontSize: SIZES.xs, fontWeight: '600' },
  timelineCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.base, marginBottom: SPACING.md,
  },
  timelineTitle: { color: COLORS.textPrimary, fontSize: SIZES.base, fontWeight: '700', marginBottom: SPACING.md },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.sm, textAlign: 'center', padding: SPACING.md },
  timelineRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  timelineLeft: { alignItems: 'center', marginRight: SPACING.md, width: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.textMuted },
  line: { flex: 1, width: 2, backgroundColor: COLORS.border, marginVertical: 3 },
  timelineContent: { flex: 1, paddingBottom: SPACING.sm },
  timelineActive: {
    backgroundColor: COLORS.accentGlow, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginBottom: SPACING.xs,
  },
  stageHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 3 },
  stageIcon: { fontSize: 14 },
  stageName: { color: COLORS.textPrimary, fontSize: SIZES.xs, fontWeight: '700' },
  stageMsg: { color: COLORS.textSecondary, fontSize: SIZES.xs, lineHeight: 16 },
  stageTime: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  edgeCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.base, marginBottom: SPACING.md,
  },
  edgeTitle: { color: COLORS.textSecondary, fontSize: SIZES.sm, fontWeight: '600', marginBottom: SPACING.sm },
  edgeRow: { flexDirection: 'row', gap: SPACING.sm },
  edgeBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.sm, alignItems: 'center', borderWidth: 1,
  },
  edgeBtnIcon: { fontSize: 20, marginBottom: 4 },
  edgeBtnText: { fontSize: SIZES.xs, fontWeight: '600', textAlign: 'center' },
  rateBtn: { borderRadius: RADIUS.lg, padding: SPACING.base + 2, alignItems: 'center', marginBottom: 20 },
  rateBtnText: { color: '#fff', fontSize: SIZES.base, fontWeight: '800' },
});

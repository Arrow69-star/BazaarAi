import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, SIZES, SHADOWS } from '../constants/theme';

export default function ProviderCard({ provider, rank, onSelect, selected }) {
  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const rankColor = rankColors[rank - 1] || COLORS.primary;
  const scorePercent = Math.round((provider.score?.total || 0) * 100);

  return (
    <TouchableOpacity
      style={[styles.wrapper, selected && styles.selectedWrapper]}
      onPress={() => onSelect?.(provider)}
      activeOpacity={0.85}
    >
      <View style={styles.card}>
        {/* Rank Badge */}
        <View style={[styles.rankBadge, { backgroundColor: rankColor + '22', borderColor: rankColor }]}>
          <Text style={[styles.rankText, { color: rankColor }]}>#{rank}</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{provider.name}</Text>
            <Text style={styles.specialization}>{provider.specialization}</Text>
          </View>
          <View style={styles.ratingBlock}>
            <Text style={styles.ratingValue}>⭐ {provider.rating}</Text>
            <Text style={styles.sector}>{provider.sector}</Text>
          </View>
        </View>

        {/* Score Bar */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreLabel}>Match Score</Text>
            <Text style={[styles.scoreValue, { color: rankColor }]}>{scorePercent}%</Text>
          </View>
          <View style={styles.scoreBarBg}>
            <LinearGradient
              colors={[rankColor, rankColor + 'AA']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.scoreBarFill, { width: `${scorePercent}%` }]}
            />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <Stat icon="📍" value={`${provider.distance_km}km`} label="Distance" />
          <Stat icon="🔧" value={provider.availability_status === 'AVAILABLE' ? 'Open' : 'Busy'}
            label="Status" valueColor={provider.availability_status === 'AVAILABLE' ? COLORS.success : COLORS.error} />
          <Stat icon="✅" value={`${Math.round(provider.reliability_score * 100)}%`} label="Reliable" />
          <Stat icon="💰" value={`${provider.price_base}`} label="Base PKR" />
        </View>

        {/* Rank Reason */}
        {provider.rank_reason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonText}>💡 {provider.rank_reason}</Text>
          </View>
        )}

        {selected && (
          <LinearGradient colors={COLORS.gradientPrimary} style={styles.selectedBadge}>
            <Text style={styles.selectedText}>Selected ✓</Text>
          </LinearGradient>
        )}
      </View>
    </TouchableOpacity>
  );
}

function Stat({ icon, value, label, valueColor }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, valueColor && { color: valueColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: SPACING.md },
  selectedWrapper: {
    borderRadius: RADIUS.lg + 2,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...SHADOWS.primary,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    overflow: 'hidden',
  },
  rankBadge: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  rankText: { fontSize: SIZES.xs, fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md, paddingRight: 44 },
  nameBlock: { flex: 1 },
  name: { color: COLORS.textPrimary, fontSize: SIZES.base, fontWeight: '700' },
  specialization: { color: COLORS.accent, fontSize: SIZES.xs, marginTop: 2 },
  ratingBlock: { alignItems: 'flex-end' },
  ratingValue: { color: COLORS.warning, fontSize: SIZES.sm, fontWeight: '600' },
  sector: { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: 2 },
  scoreSection: { marginBottom: SPACING.md },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  scoreLabel: { color: COLORS.textSecondary, fontSize: SIZES.xs },
  scoreValue: { fontSize: SIZES.xs, fontWeight: '700' },
  scoreBarBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 3 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  stat: { alignItems: 'center', flex: 1 },
  statIcon: { fontSize: 14 },
  statValue: { color: COLORS.textPrimary, fontSize: SIZES.xs, fontWeight: '600', marginTop: 2 },
  statLabel: { color: COLORS.textMuted, fontSize: 9, marginTop: 1 },
  reasonBox: {
    backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.sm,
    padding: SPACING.sm, marginTop: SPACING.xs,
  },
  reasonText: { color: COLORS.primaryLight, fontSize: SIZES.xs, lineHeight: 16 },
  selectedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    borderTopLeftRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 5,
  },
  selectedText: { color: '#fff', fontSize: SIZES.xs, fontWeight: '700' },
});

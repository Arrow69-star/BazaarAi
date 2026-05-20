import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, SIZES } from '../constants/theme';

export default function ConfidenceCard({ confidence }) {
  if (!confidence) return null;

  const bars = [
    { label: 'Intent Detection', key: 'intent', color: '#6C63FF' },
    { label: 'Location Found', key: 'location', color: '#22D3EE' },
    { label: 'Time Extracted', key: 'time', color: '#10B981' },
    { label: 'Service Match', key: 'service_match', color: '#F59E0B' },
  ];

  const overall = confidence.overall || 0;
  const overallColor = overall >= 85 ? '#10B981' : overall >= 70 ? '#F59E0B' : '#EF4444';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Confidence Breakdown</Text>

      {}
      <View style={styles.overallRow}>
        <View style={[styles.overallRing, { borderColor: overallColor }]}>
          <Text style={[styles.overallPct, { color: overallColor }]}>{overall}%</Text>
          <Text style={styles.overallLabel}>Overall</Text>
        </View>
        <View style={styles.barsBlock}>
          {bars.map(({ label, key, color }) => (
            <ConfBar key={key} label={label} value={confidence[key] || 0} color={color} />
          ))}
        </View>
      </View>

      <View style={[styles.badge, { backgroundColor: overallColor + '22', borderColor: overallColor + '44' }]}>
        <Text style={[styles.badgeText, { color: overallColor }]}>
          {overall >= 85 ? '✅ High confidence — proceeding automatically' :
           overall >= 70 ? '⚠️ Medium confidence — verify details' :
           '❌ Low confidence — clarification needed'}
        </Text>
      </View>
    </View>
  );
}

function ConfBar({ label, value, color }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, { toValue: value, duration: 800, useNativeDriver: false }).start();
  }, [value]);

  const width = widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color }]}>{value}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.md,
  },
  title: { color: COLORS.textPrimary, fontSize: SIZES.base, fontWeight: '700', marginBottom: SPACING.md },
  overallRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base, marginBottom: SPACING.md },
  overallRing: {
    width: 70, height: 70, borderRadius: 35,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center',
  },
  overallPct: { fontSize: SIZES.lg, fontWeight: '800' },
  overallLabel: { color: COLORS.textMuted, fontSize: SIZES.xs },
  barsBlock: { flex: 1, gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  barLabel: { color: COLORS.textMuted, fontSize: SIZES.xs, width: 90 },
  barTrack: {
    flex: 1, height: 6,
    backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  barValue: { fontSize: SIZES.xs, fontWeight: '700', width: 32, textAlign: 'right' },
  badge: {
    borderRadius: RADIUS.sm, padding: SPACING.sm,
    borderWidth: 1, alignItems: 'center',
  },
  badgeText: { fontSize: SIZES.xs, fontWeight: '600', textAlign: 'center' },
});

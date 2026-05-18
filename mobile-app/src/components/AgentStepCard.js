import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, AGENT_COLORS, AGENT_ICONS, RADIUS, SPACING, SIZES } from '../constants/theme';

export default function AgentStepCard({ agentName, status, output, index }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const color = AGENT_COLORS[agentName] || COLORS.primary;
  const icon = AGENT_ICONS[agentName] || '🤖';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 120, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: index * 120, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (status === 'running') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const statusColor =
    status === 'done' ? COLORS.agentDone :
    status === 'running' ? COLORS.agentRunning :
    status === 'error' ? COLORS.agentError :
    COLORS.agentPending;

  const statusIcon = status === 'done' ? '✅' : status === 'running' ? '⏳' : status === 'error' ? '❌' : '⬜';

  const summaryText = output
    ? typeof output === 'string'
      ? output.substring(0, 80)
      : JSON.stringify(output).substring(0, 80) + '…'
    : null;

  return (
    <Animated.View
      style={[
        styles.card,
        { borderLeftColor: color, opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: pulseAnim }] },
        status === 'running' && { borderColor: color, borderWidth: 1 },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: color + '22' }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.agentName}>{agentName.replace(/([A-Z])/g, ' $1').trim()}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {status === 'done' ? 'Complete' : status === 'running' ? 'Processing…' : status === 'error' ? 'Error' : 'Pending'}
            </Text>
          </View>
        </View>
        <Text style={styles.statusIcon}>{statusIcon}</Text>
      </View>

      {summaryText && status !== 'pending' && (
        <View style={[styles.outputBox, { backgroundColor: color + '11' }]}>
          <Text style={[styles.outputText, { color: color }]}>{summaryText}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  titleBlock: { flex: 1 },
  agentName: {
    color: COLORS.textPrimary,
    fontSize: SIZES.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: SIZES.xs, fontWeight: '500' },
  statusIcon: { fontSize: 16 },
  outputBox: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  outputText: { fontSize: SIZES.xs, lineHeight: 16 },
});

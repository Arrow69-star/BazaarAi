import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, SIZES, SHADOWS } from '../constants/theme';

export default function BookingReceipt({ receipt, booking }) {
  if (!receipt) return null;

  const handleShare = async () => {
    await Share.share({ message: receipt.text || `BazaarAI Booking ${receipt.booking_id}` });
  };

  return (
    <View style={[styles.container, SHADOWS.primary]}>
      <LinearGradient colors={['#1E2A3B', '#162032']} style={styles.header}>
        <Text style={styles.checkmark}>✅</Text>
        <Text style={styles.confirmedText}>Booking Confirmed!</Text>
        <Text style={styles.bookingId}>{receipt.booking_id}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <Row icon="🔧" label="Service" value={receipt.service_type} />
        <Row icon="📍" label="Location" value={receipt.location_display} />
        <Row icon="📅" label="Scheduled" value={receipt.slot_display} />

        <View style={styles.divider} />

        <Row icon="👨‍🔧" label="Provider" value={receipt.provider_name} highlight />
        <Row icon="📱" label="Contact" value={receipt.provider_phone} />
        <Row icon="⭐" label="Rating" value={`${booking?.booking?.provider?.rating || '—'} / 5.0`} />

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>PKR {receipt.total_amount}</Text>
        </View>

        <View style={styles.paymentBadge}>
          <Text style={styles.paymentText}>💵 Cash on Delivery</Text>
        </View>

        <View style={styles.policy}>
          <Text style={styles.policyText}>
            📋 Free cancellation up to 2 hours before appointment
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
        <LinearGradient colors={COLORS.gradientPrimary} style={styles.shareGradient}>
          <Text style={styles.shareText}>📤 Share Receipt</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function Row({ icon, label, value, highlight }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.highlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.success + '44',
  },
  header: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkmark: { fontSize: 40, marginBottom: SPACING.sm },
  confirmedText: {
    color: COLORS.success,
    fontSize: SIZES['2xl'],
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bookingId: {
    color: COLORS.textMuted,
    fontSize: SIZES.sm,
    fontFamily: 'monospace',
    marginTop: SPACING.xs,
    letterSpacing: 1,
  },
  body: { backgroundColor: COLORS.card, padding: SPACING.base },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    gap: SPACING.sm,
  },
  rowIcon: { fontSize: 16, width: 24 },
  rowLabel: { color: COLORS.textSecondary, fontSize: SIZES.sm, flex: 1 },
  rowValue: { color: COLORS.textPrimary, fontSize: SIZES.sm, fontWeight: '600' },
  highlight: { color: COLORS.accent },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  totalLabel: { color: COLORS.textPrimary, fontSize: SIZES.lg, fontWeight: '700' },
  totalValue: { color: COLORS.accent, fontSize: SIZES.xl, fontWeight: '800' },
  paymentBadge: {
    backgroundColor: COLORS.accentGlow,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  paymentText: { color: COLORS.accent, fontSize: SIZES.sm, fontWeight: '600' },
  policy: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  policyText: { color: COLORS.textMuted, fontSize: SIZES.xs, lineHeight: 16 },
  shareBtn: { backgroundColor: COLORS.surface },
  shareGradient: { padding: SPACING.md, alignItems: 'center' },
  shareText: { color: '#fff', fontSize: SIZES.base, fontWeight: '700' },
});

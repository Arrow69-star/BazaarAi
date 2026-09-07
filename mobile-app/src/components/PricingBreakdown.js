import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SIZES } from '../constants/theme';

export default function PricingBreakdown({ pricing, escrow: escrowProp }) {
  if (!pricing) return null;
  const escrow = escrowProp || pricing.escrow;

  const rows = [
    { label: 'Visit + Service Fee', key: 'base_fee', icon: '🔧' },
    { label: 'Complexity Cost', key: 'complexity_cost', icon: '⚙️' },
    { label: 'Travel Cost', key: 'distance_cost', icon: '📍' },
    { label: 'Urgency Fee', key: 'urgency_fee', icon: '⚡' },
    { label: 'Demand Surge', key: 'demand_surge', icon: '🔥' },
    { label: 'Discount', key: 'discount', icon: '🎁' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💰 Price Breakdown</Text>

      {rows.map(({ label, key, icon }) => {
        const item = pricing.breakdown?.[key];
        if (!item || item.amount === 0) return null;
        const isDiscount = item.amount < 0;

        return (
          <View key={key} style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>{icon}</Text>
              <Text style={styles.rowLabel}>{item.label || label}</Text>
            </View>
            <Text style={[styles.rowAmount, isDiscount && styles.discount]}>
              {isDiscount ? `-PKR ${Math.abs(item.amount)}` : `PKR ${item.amount}`}
            </Text>
          </View>
        );
      })}

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Payable</Text>
        <Text style={styles.totalAmount}>PKR {pricing.total_price}</Text>
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>🔒 Smart Escrow Protected • 100% Satisfaction Guarantee</Text>
      </View>

      <View style={styles.escrowBox}>
        <View style={styles.escrowHeader}>
          <Text style={styles.escrowTitle}>🛡️ Digital Escrow Vault</Text>
          <Text style={styles.escrowStatus}>
            {escrow?.status === 'RELEASED_TO_KAARIGAR' ? 'RELEASED' : 'FUNDS SECURED'}
          </Text>
        </View>

        {escrow ? (
          <>
            <View style={styles.escrowRow}>
              <Text style={styles.escrowRowLabel}>Held in escrow</Text>
              <Text style={styles.escrowRowValue}>PKR {escrow.breakdown?.total_deposit_pkr}</Text>
            </View>
            <View style={styles.escrowRow}>
              <Text style={styles.escrowRowLabel}>Platform fee</Text>
              <Text style={styles.escrowRowValue}>PKR {escrow.breakdown?.platform_fee_pkr}</Text>
            </View>
            <View style={styles.escrowRow}>
              <Text style={styles.escrowRowLabel}>Kaarigar payout</Text>
              <Text style={styles.escrowRowValue}>PKR {escrow.breakdown?.kaarigar_payout_pkr}</Text>
            </View>
            <View style={styles.pinBox}>
              <Text style={styles.pinLabel}>Completion PIN — share only when the job is done</Text>
              <Text style={styles.pinValue}>{escrow.completion_pin}</Text>
              <Text style={styles.escrowId}>{escrow.escrow_id}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.escrowText}>
            Customer payment is held securely in escrow. Kaarigar receives payout only after you verify the job and release the 4-digit PIN.
          </Text>
        )}

        <View style={styles.paymentRow}>
          {(escrow?.payment_methods_supported || ['EasyPaisa', 'JazzCash', 'Raast', 'Cash on Escrow']).map(m => (
            <Text key={m} style={styles.paymentBadge}>{m}</Text>
          ))}
        </View>
      </View>

      {pricing.budget_alternative && (
        <View style={styles.altBox}>
          <Text style={styles.altTitle}>💡 Budget Alternative</Text>
          <Text style={styles.altText}>
            Switch to <Text style={styles.altHighlight}>{pricing.budget_alternative.provider_name}</Text>
            {' '}and save PKR {pricing.budget_alternative.savings}
          </Text>
          <Text style={styles.altSub}>{pricing.budget_alternative.trade_off}</Text>
        </View>
      )}
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
  title: {
    color: COLORS.textPrimary,
    fontSize: SIZES.base,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  rowIcon: { fontSize: 14 },
  rowLabel: { color: COLORS.textSecondary, fontSize: SIZES.sm, flex: 1 },
  rowAmount: { color: COLORS.textPrimary, fontSize: SIZES.sm, fontWeight: '600' },
  discount: { color: COLORS.success },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: COLORS.textPrimary, fontSize: SIZES.lg, fontWeight: '700' },
  totalAmount: {
    color: COLORS.accent,
    fontSize: SIZES.xl,
    fontWeight: '800',
  },
  badge: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.accentGlow,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  badgeText: { color: COLORS.accent, fontSize: SIZES.xs, fontWeight: '600' },
  altBox: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.successGlow,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.success + '33',
  },
  altTitle: { color: COLORS.success, fontSize: SIZES.sm, fontWeight: '700', marginBottom: 4 },
  altText: { color: COLORS.textSecondary, fontSize: SIZES.xs, lineHeight: 18 },
  altHighlight: { color: COLORS.success, fontWeight: '600' },
  altSub: { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: 4 },
  escrowBox: {
    marginTop: SPACING.md,
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#38BDF844',
  },
  escrowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  escrowTitle: { color: '#38BDF8', fontSize: SIZES.sm, fontWeight: '700' },
  escrowStatus: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: COLORS.success + '22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  escrowText: { color: COLORS.textSecondary, fontSize: SIZES.xs, lineHeight: 17, marginBottom: 8 },
  escrowRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  escrowRowLabel: { color: COLORS.textSecondary, fontSize: SIZES.xs },
  escrowRowValue: { color: '#E2E8F0', fontSize: SIZES.xs, fontWeight: '700' },
  pinBox: {
    marginTop: SPACING.sm,
    marginBottom: 8,
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  pinLabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 2 },
  pinValue: { color: '#38BDF8', fontSize: SIZES.xl, fontWeight: '800', letterSpacing: 6 },
  escrowId: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  paymentBadge: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
});

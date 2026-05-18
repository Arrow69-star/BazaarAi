import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SIZES } from '../constants/theme';

export default function PricingBreakdown({ pricing }) {
  if (!pricing) return null;

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
        <Text style={styles.badgeText}>💵 Cash on Delivery</Text>
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
});

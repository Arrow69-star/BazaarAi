import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BookingReceipt from '../components/BookingReceipt';
import { COLORS, RADIUS, SPACING, SIZES, SHADOWS } from '../constants/theme';

export default function BookingScreen({ navigation, route }) {
  const { result } = route.params || {};
  const stages = result?.stages || {};
  const booking = stages.booking || {};
  const receipt = booking.receipt;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0A0E1A', '#111827']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Text style={styles.title}>✅ Booking Confirmed</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <BookingReceipt receipt={receipt} booking={booking} />

        {/* Notifications Preview */}
        {stages.notifications?.notifications_sent?.length > 0 && (
          <View style={styles.notifCard}>
            <Text style={styles.notifTitle}>🔔 Notifications Sent</Text>
            {stages.notifications.notifications_sent.map((n, i) => (
              <View key={i} style={[styles.notifRow, { borderLeftColor: n.status === 'SENT' ? COLORS.success : COLORS.warning }]}>
                <Text style={styles.notifType}>{n.type}</Text>
                <View style={[styles.notifBadge, { backgroundColor: n.status === 'SENT' ? COLORS.successGlow : COLORS.warningGlow }]}>
                  <Text style={{ color: n.status === 'SENT' ? COLORS.success : COLORS.warning, fontSize: 10 }}>{n.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Dispute Button */}
        <View style={styles.disputeSection}>
          <Text style={styles.disputeLabel}>⚖️ Issue with this booking?</Text>
          <View style={styles.disputeButtons}>
            {['CANCELLATION', 'PRICE_DISPUTE', 'BAD_SERVICE'].map(type => (
              <TouchableOpacity
                key={type}
                style={styles.disputeBtn}
                onPress={() => navigation.navigate('Tracking', { result, disputeType: type })}
              >
                <Text style={styles.disputeBtnText}>{type.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Tracking', { result })}
          activeOpacity={0.9}
        >
          <LinearGradient colors={['#10B981', '#059669']} style={styles.trackBtn}>
            <Text style={styles.trackBtnText}>📡  Track Service →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: SPACING.base, paddingTop: 50,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  title: { color: COLORS.textPrimary, fontSize: SIZES.xl, fontWeight: '800' },
  scroll: { padding: SPACING.base, paddingBottom: 40 },
  notifCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md },
  notifTitle: { color: COLORS.textPrimary, fontSize: SIZES.base, fontWeight: '700', marginBottom: SPACING.md },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.sm, borderLeftWidth: 3, paddingLeft: SPACING.sm, marginBottom: SPACING.xs,
  },
  notifType: { color: COLORS.textSecondary, fontSize: SIZES.xs },
  notifBadge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  disputeSection: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md },
  disputeLabel: { color: COLORS.textSecondary, fontSize: SIZES.sm, fontWeight: '600', marginBottom: SPACING.sm },
  disputeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  disputeBtn: {
    backgroundColor: COLORS.errorGlow, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs + 2,
    borderWidth: 1, borderColor: COLORS.error + '33',
  },
  disputeBtnText: { color: COLORS.error, fontSize: SIZES.xs, fontWeight: '600' },
  trackBtn: { borderRadius: RADIUS.lg, padding: SPACING.base + 2, alignItems: 'center', marginBottom: 20 },
  trackBtnText: { color: '#fff', fontSize: SIZES.base, fontWeight: '800' },
});

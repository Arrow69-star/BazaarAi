import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAllBookings } from '../services/api';
import { COLORS, RADIUS, SPACING, SIZES } from '../constants/theme';

const STATUS_CONFIG = {
  CONFIRMED:    { color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: '✅' },
  IN_PROGRESS:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  icon: '🔄' },
  COMPLETED:    { color: '#6366F1', bg: 'rgba(99,102,241,0.12)',   icon: '🏁' },
  CANCELLED:    { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',    icon: '❌' },
  DISPUTED:     { color: '#F97316', bg: 'rgba(249,115,22,0.12)',   icon: '⚖️' },
};

export default function BookingHistoryScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const fetchBookings = async () => {
    try {
      const data = await getAllBookings();
      
      const sorted = (data.bookings || []).sort((a, b) =>
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      setBookings(sorted);
    } catch (e) {
      setBookings(DEMO_BOOKINGS);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  const renderItem = ({ item }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.CONFIRMED;
    const isExp = expanded === item.booking_id;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpanded(isExp ? null : item.booking_id)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.serviceText}>{item.service || 'Service'}</Text>
            <Text style={styles.bookingId}>{item.booking_id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={styles.statusIcon}>{cfg.icon}</Text>
            <Text style={[styles.statusText, { color: cfg.color }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <Text style={styles.metaItem}>📍 {item.location || '—'}</Text>
          <Text style={styles.metaItem}>⏰ {item.time_slot || item.time_preference || '—'}</Text>
          <Text style={styles.metaItem}>💰 PKR {item.pricing?.total_pkr || '—'}</Text>
        </View>

        {isExp && (
          <View style={styles.expanded}>
            <View style={styles.divider} />
            <Row label="Provider"     value={item.provider?.name} />
            <Row label="Phone"        value={item.provider?.phone} />
            <Row label="Rating"       value={item.provider?.rating ? `⭐ ${item.provider.rating}` : '—'} />
            <Row label="Distance"     value={item.provider?.distance_km ? `${item.provider.distance_km} km` : '—'} />
            <Row label="Base Fee"     value={`PKR ${item.pricing?.base_fee || '—'}`} />
            <Row label="Distance Fee" value={`PKR ${item.pricing?.distance_fee || 0}`} />
            <Row label="Urgency Fee"  value={`PKR ${item.pricing?.urgency_fee || 0}`} />
            <Row label="Total"        value={`PKR ${item.pricing?.total_pkr || '—'}`} highlight />
            {item.dispute && (
              <View style={styles.disputeBox}>
                <Text style={styles.disputeLabel}>⚖️ Dispute Filed</Text>
                <Text style={styles.disputeText}>{item.dispute.reason} → {item.dispute.action}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('Tracking', { booking: item, result: { stages: {} } })}
            >
              <Text style={styles.viewBtnText}>View Tracking →</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <LinearGradient colors={['#0A0E1A', '#111827']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <Text style={styles.title}>📋 Booking History</Text>
        <Text style={styles.sub}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</Text>
      </View>
      {loading ? (
        <View style={styles.center}><Text style={styles.loadingText}>Loading bookings…</Text></View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.booking_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No bookings yet</Text>
              <Text style={styles.emptySub}>Submit a request to get started</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function Row({ label, value, highlight }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { color: '#10B981', fontWeight: '800' }]}>{value || '—'}</Text>
    </View>
  );
}

const DEMO_BOOKINGS = [
  { booking_id: 'BK-20260519-DEMO', status: 'CONFIRMED', service: 'AC Repair', location: 'G-13', time_slot: '09:00', provider: { name: 'ColdBreeze AC Experts', rating: 4.83, distance_km: 1.1 }, pricing: { base_fee: 1100, distance_fee: 17, urgency_fee: 0, total_pkr: 1154 } },
  { booking_id: 'BK-20260518-DEMO', status: 'COMPLETED', service: 'Plumbing', location: 'F-10', time_slot: '14:00', provider: { name: 'Khan Plumbing & Gas', rating: 4.79, distance_km: 2.3 }, pricing: { base_fee: 800, distance_fee: 35, urgency_fee: 0, total_pkr: 835 } },
];

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  header:       { padding: SPACING.base, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:        { color: COLORS.textPrimary, fontSize: SIZES.xl, fontWeight: '800' },
  sub:          { color: COLORS.textMuted, fontSize: SIZES.sm },
  list:         { padding: SPACING.base, paddingBottom: 40 },
  card:         { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  cardLeft:     { flex: 1 },
  serviceText:  { color: COLORS.textPrimary, fontSize: SIZES.base, fontWeight: '700' },
  bookingId:    { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: 2 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, gap: 4 },
  statusIcon:   { fontSize: 12 },
  statusText:   { fontSize: SIZES.xs, fontWeight: '700' },
  cardMeta:     { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  metaItem:     { color: COLORS.textSecondary, fontSize: SIZES.xs },
  expanded:     { marginTop: SPACING.sm },
  divider:      { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  row:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel:     { color: COLORS.textMuted, fontSize: SIZES.xs },
  rowValue:     { color: COLORS.textSecondary, fontSize: SIZES.xs, fontWeight: '600' },
  disputeBox:   { backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.sm },
  disputeLabel: { color: '#F97316', fontSize: SIZES.xs, fontWeight: '700' },
  disputeText:  { color: COLORS.textSecondary, fontSize: SIZES.xs, marginTop: 2 },
  viewBtn:      { backgroundColor: COLORS.primaryGlow, borderRadius: RADIUS.md, padding: SPACING.sm, alignItems: 'center', marginTop: SPACING.sm },
  viewBtnText:  { color: COLORS.primary, fontSize: SIZES.sm, fontWeight: '700' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText:  { color: COLORS.textMuted, fontSize: SIZES.base },
  emptyIcon:    { fontSize: 48, marginBottom: SPACING.md },
  emptyText:    { color: COLORS.textPrimary, fontSize: SIZES.lg, fontWeight: '700' },
  emptySub:     { color: COLORS.textMuted, fontSize: SIZES.sm, marginTop: SPACING.xs },
});

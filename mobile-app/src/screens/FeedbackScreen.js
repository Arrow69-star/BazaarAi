import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, SIZES } from '../constants/theme';

export default function FeedbackScreen({ navigation, route }) {
  const { result } = route.params || {};
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const booking = result?.stages?.booking?.booking;

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => navigation.navigate('Home'), 2500);
  };

  if (submitted) {
    return (
      <View style={[styles.container, styles.center]}>
        <LinearGradient colors={['#0A0E1A', '#111827']} style={StyleSheet.absoluteFill} />
        <Text style={{ fontSize: 64 }}>🌟</Text>
        <Text style={styles.thankyou}>Shukriya!</Text>
        <Text style={styles.thankyouSub}>Aap ka feedback record ho gaya.</Text>
        <Text style={styles.thankyouMuted}>Going back to home…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0A0E1A', '#111827']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <Text style={styles.title}>⭐ Rate Your Service</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {booking && (
          <View style={styles.providerCard}>
            <Text style={styles.providerName}>👨‍🔧 {booking.provider?.name}</Text>
            <Text style={styles.providerSub}>{result?.final_output?.service_request?.service} • {booking.schedule?.display}</Text>
          </View>
        )}

        {/* Star Rating */}
        <View style={styles.starsCard}>
          <Text style={styles.starsLabel}>How was the service?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {rating === 0 ? 'Tap to rate' : rating === 5 ? 'Excellent! 🌟' : rating === 4 ? 'Good 👍' : rating === 3 ? 'Average' : rating === 2 ? 'Poor 😕' : 'Terrible 😡'}
          </Text>
        </View>

        {/* Review Input */}
        <View style={styles.reviewCard}>
          <Text style={styles.reviewLabel}>📝 Leave a review (optional)</Text>
          <TextInput
            style={styles.reviewInput}
            value={review}
            onChangeText={setReview}
            placeholder="Kaam kaisa raha? Koi masla? (Urdu/English)"
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={rating === 0} activeOpacity={0.9}>
          <LinearGradient
            colors={rating > 0 ? ['#6C63FF', '#4F46E5'] : ['#2A3A50', '#1E2A3B']}
            style={styles.submitBtn}
          >
            <Text style={[styles.submitText, rating === 0 && { color: COLORS.textMuted }]}>
              {rating > 0 ? '📤  Submit Feedback' : 'Select a rating first'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { padding: SPACING.base, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  title: { color: COLORS.textPrimary, fontSize: SIZES.xl, fontWeight: '800' },
  scroll: { padding: SPACING.base, paddingBottom: 40 },
  providerCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md },
  providerName: { color: COLORS.textPrimary, fontSize: SIZES.lg, fontWeight: '700' },
  providerSub: { color: COLORS.textSecondary, fontSize: SIZES.sm, marginTop: 4 },
  starsCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.md },
  starsLabel: { color: COLORS.textSecondary, fontSize: SIZES.sm, marginBottom: SPACING.md },
  starsRow: { flexDirection: 'row', gap: SPACING.sm },
  star: { fontSize: 44, color: COLORS.border },
  starActive: { color: COLORS.warning },
  ratingText: { color: COLORS.textSecondary, fontSize: SIZES.sm, marginTop: SPACING.sm },
  reviewCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md },
  reviewLabel: { color: COLORS.textSecondary, fontSize: SIZES.sm, marginBottom: SPACING.sm },
  reviewInput: { color: COLORS.textPrimary, fontSize: SIZES.base, lineHeight: 24, minHeight: 100, paddingTop: 0 },
  submitBtn: { borderRadius: RADIUS.lg, padding: SPACING.base + 2, alignItems: 'center', marginBottom: 20 },
  submitText: { color: '#fff', fontSize: SIZES.base, fontWeight: '800' },
  thankyou: { color: COLORS.textPrimary, fontSize: SIZES['3xl'], fontWeight: '800', marginTop: SPACING.md },
  thankyouSub: { color: COLORS.accent, fontSize: SIZES.base, marginTop: SPACING.sm },
  thankyouMuted: { color: COLORS.textMuted, fontSize: SIZES.sm, marginTop: SPACING.xl },
});

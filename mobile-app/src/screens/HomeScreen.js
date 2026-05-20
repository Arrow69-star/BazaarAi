import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, SIZES, SHADOWS } from '../constants/theme';

const EXAMPLE_PROMPTS = [
  'Mujhe kal subah G-13 mein AC technician chahiye, budget kam hai',
  'G-13 AC ka scene kharab hai, kal fix karwana hai',
  'Plumber chahiye aaj G-11 mein, pipe leak ho rahi hai',
  'Electrician G-10 ke liye, bijli short circuit ho gayi',
  'AC repair G-14 tomorrow morning, urgent!',
];

export default function HomeScreen({ navigation }) {
  const [text, setText] = useState('');
  const [selectedChip, setSelectedChip] = useState(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSubmit = () => {
    if (!text.trim()) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      navigation.navigate('Processing', { userText: text });
    });
  };

  const handleChip = (prompt) => {
    setSelectedChip(prompt);
    setText(prompt);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <LinearGradient
        colors={['#0A0E1A', '#111827']}
        style={StyleSheet.absoluteFill}
      />

      {}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {}
          <View style={styles.header}>
            <LinearGradient colors={['#6C63FF22', '#22D3EE11']} style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>🧠</Text>
            </LinearGradient>
            <Text style={styles.appName}>BazaarAI</Text>
            <Text style={styles.tagline}>Autonomous Service Orchestration</Text>
            <View style={styles.statusDot}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusText}>15 Agents Ready</Text>
            </View>
          </View>

          {}
          <View style={[styles.inputCard, SHADOWS.primary]}>
            <Text style={styles.inputLabel}>🗣️ Apni request likhein (Urdu / Roman Urdu / English)</Text>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={'"Mujhe kal subah G-13 mein AC technician chahiye…"'}
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.inputFooter}>
              <Text style={styles.charCount}>{text.length} chars</Text>
              <Text style={styles.langHint}>🌐 Urdu • Roman • English</Text>
            </View>
          </View>

          {}
          <Text style={styles.sectionLabel}>💬 Example Requests</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {EXAMPLE_PROMPTS.map((prompt, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.chip, selectedChip === prompt && styles.chipSelected]}
                onPress={() => handleChip(prompt)}
              >
                <Text style={[styles.chipText, selectedChip === prompt && styles.chipTextSelected]} numberOfLines={2}>
                  {prompt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {}
          <Text style={styles.sectionLabel}>🧪 Demo Edge Cases</Text>
          <View style={styles.edgeRow}>
            <TouchableOpacity
              style={styles.edgeBtn}
              onPress={() => navigation.navigate('Processing', {
                userText: 'AC repair G-13 kal subah', simulateCancellation: true
              })}
            >
              <Text style={styles.edgeIcon}>⚡</Text>
              <Text style={styles.edgeText}>Cancel & Rebook</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.edgeBtn}
              onPress={() => navigation.navigate('Processing', {
                userText: 'AC technician G-13', simulatePriceDispute: true
              })}
            >
              <Text style={styles.edgeIcon}>⚖️</Text>
              <Text style={styles.edgeText}>Price Dispute</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.edgeBtn}
              onPress={() => navigation.navigate('Processing', { userText: 'fix my home' })}
            >
              <Text style={styles.edgeIcon}>❓</Text>
              <Text style={styles.edgeText}>Unclear Input</Text>
            </TouchableOpacity>
          </View>

          {}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity onPress={handleSubmit} activeOpacity={0.9} disabled={!text.trim()}>
              <LinearGradient
                colors={text.trim() ? ['#6C63FF', '#4F46E5'] : ['#2A3A50', '#1E2A3B']}
                style={styles.submitBtn}
              >
                <Text style={[styles.submitText, !text.trim() && { color: COLORS.textMuted }]}>
                  {text.trim() ? '🚀  Start AI Orchestration' : 'Enter your request above'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {}
          <View style={styles.agentsRow}>
            {['🧠', '🌍', '⚙️', '🔍', '🎯', '💡', '💰', '📅', '✅', '🔔'].map((em, i) => (
              <View key={i} style={styles.agentBadge}>
                <Text style={{ fontSize: 16 }}>{em}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.agentsLabel}>15 Specialized AI Agents</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { padding: SPACING.base, paddingBottom: 40 },
  orb1: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, backgroundColor: '#6C63FF08',
    top: -80, right: -80,
  },
  orb2: {
    position: 'absolute', width: 250, height: 250,
    borderRadius: 125, backgroundColor: '#22D3EE06',
    bottom: 100, left: -80,
  },
  header: { alignItems: 'center', paddingVertical: SPACING.xl + 8 },
  logoBadge: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.primary + '44',
  },
  logoEmoji: { fontSize: 36 },
  appName: {
    color: COLORS.textPrimary, fontSize: 34, fontWeight: '800',
    letterSpacing: 1,
  },
  tagline: { color: COLORS.accent, fontSize: SIZES.sm, marginTop: 4, letterSpacing: 0.5 },
  statusDot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  statusText: { color: COLORS.success, fontSize: SIZES.xs, fontWeight: '600' },
  inputCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputLabel: { color: COLORS.textSecondary, fontSize: SIZES.xs, marginBottom: SPACING.sm },
  input: {
    color: COLORS.textPrimary,
    fontSize: SIZES.base,
    lineHeight: 24,
    minHeight: 80,
    paddingTop: 0,
  },
  inputFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm },
  charCount: { color: COLORS.textMuted, fontSize: SIZES.xs },
  langHint: { color: COLORS.primary, fontSize: SIZES.xs },
  sectionLabel: {
    color: COLORS.textSecondary, fontSize: SIZES.sm,
    fontWeight: '600', marginBottom: SPACING.sm,
    letterSpacing: 0.3,
  },
  chipsScroll: { marginBottom: SPACING.lg },
  chip: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginRight: SPACING.sm,
    maxWidth: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  chipText: { color: COLORS.textSecondary, fontSize: SIZES.xs, lineHeight: 16 },
  chipTextSelected: { color: COLORS.primaryLight },
  edgeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  edgeBtn: {
    flex: 1, backgroundColor: COLORS.card,
    borderRadius: RADIUS.md, padding: SPACING.sm,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  edgeIcon: { fontSize: 20, marginBottom: 4 },
  edgeText: { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center' },
  submitBtn: {
    borderRadius: RADIUS.lg, padding: SPACING.base + 2,
    alignItems: 'center', marginBottom: SPACING.xl,
  },
  submitText: { color: '#fff', fontSize: SIZES.base + 1, fontWeight: '800', letterSpacing: 0.5 },
  agentsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  agentBadge: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  agentsLabel: { color: COLORS.textMuted, fontSize: SIZES.xs, textAlign: 'center' },
});

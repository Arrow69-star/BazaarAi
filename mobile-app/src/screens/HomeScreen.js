import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Animated, StatusBar,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { diagnoseRepair, warmUp } from '../services/api';

const EXAMPLE_PROMPTS = [
  'Mujhe kal subah G-13 mein AC technician chahiye, budget kam hai',
  'G-13 AC ka scene kharab hai, kal fix karwana hai',
  'Plumber chahiye aaj G-11 mein, pipe leak ho rahi hai',
  'Electrician G-10 ke liye, bijli short circuit ho gayi',
  'AC repair G-14 tomorrow morning, urgent!',
];

// Alert.alert is a no-op on web; fall back to the browser dialog.
const notify = (title, message) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}

${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function HomeScreen({ navigation }) {
  const [text, setText] = useState('');
  const [selectedChip, setSelectedChip] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Wake a sleeping free-tier backend while the user is still typing their request.
  useEffect(() => { warmUp(); }, []);

  // Sends a real photo of the fault to the multimodal diagnostic agent (/api/diagnose).
  const runPhotoDiagnostic = async (useCamera) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify('Permission needed', 'Allow access so the AI can look at the fault photo.');
      return;
    }

    const picker = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const shot = await picker({ base64: true, quality: 0.5, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (shot.canceled || !shot.assets?.length) return;

    setDiagnosing(true);
    setDiagnosis(null);
    try {
      const res = await diagnoseRepair(text.trim() || 'Is tasveer mein kya kharabi hai?', shot.assets[0].base64);
      const report = res?.diagnostic_report;
      // The API layer returns a canned report on failure; never present that as a real analysis.
      if (res?.success === false || report?.offline) {
        notify('Diagnosis unavailable', 'Could not reach the AI service. Please check your connection and try again.');
      } else if (report) {
        setDiagnosis(report);
        if (!text.trim() && report.diagnosis_title) {
          setText(`${report.diagnosis_title} - ${report.category} service chahiye`);
        }
      } else {
        notify('Diagnosis failed', 'Could not analyse that photo. Please try again.');
      }
    } catch (e) {
      notify('Diagnosis failed', e?.message || 'Backend unreachable.');
    } finally {
      setDiagnosing(false);
    }
  };

  const choosePhotoSource = () => {
    // Alert.alert renders nothing on web, and browsers have no camera roll —
    // go straight to the file picker there.
    if (Platform.OS === 'web') {
      runPhotoDiagnostic(false);
      return;
    }
    Alert.alert('AI Photo Diagnostic', 'Fault ki tasveer bhejein', [
      { text: 'Take photo', onPress: () => runPhotoDiagnostic(true) },
      { text: 'Choose from gallery', onPress: () => runPhotoDiagnostic(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

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
            <Text style={styles.appName}>Khidmat AI</Text>
            <Text style={styles.tagline}>Autonomous Service Orchestration</Text>
            <View style={styles.statusDot}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusText}>15 Agents Ready</Text>
            </View>
          </View>

          {/* Input Card */}
          <View style={[styles.inputCard, SHADOWS.primary]}>
            <Text style={styles.inputLabel}>🗣️ Apni request likhein ya bolen (Urdu / Roman Urdu / English)</Text>
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

            {/* Multimodal Perception Tools */}
            <View style={styles.multimodalRow}>
              <TouchableOpacity
                style={[styles.toolBtn, styles.toolBtnPrimary]}
                onPress={choosePhotoSource}
                disabled={diagnosing}
              >
                {diagnosing
                  ? <ActivityIndicator size="small" color={COLORS.primary} />
                  : <Text style={styles.toolIcon}>📷</Text>}
                <Text style={styles.toolText}>
                  {diagnosing ? 'Analysing...' : 'AI Photo Diagnostic'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={() => {
                  setText('Bijli ka breaker spark kar raha hai, electrician chahiye I-8');
                }}
              >
                <Text style={styles.toolIcon}>⚡</Text>
                <Text style={styles.toolText}>Emergency example</Text>
              </TouchableOpacity>
            </View>

            {diagnosis && (
              <View style={styles.diagBox}>
                <View style={styles.diagHeader}>
                  <Text style={styles.diagTitle}>🔍 {diagnosis.diagnosis_title}</Text>
                  <Text style={[styles.diagSeverity,
                    diagnosis.severity === 'CRITICAL' && styles.diagCritical]}>
                    {diagnosis.severity}
                  </Text>
                </View>
                <Text style={styles.diagCause}>{diagnosis.root_cause_analysis}</Text>

                {!!diagnosis.safety_precautions?.length && (
                  <View style={styles.diagSection}>
                    <Text style={styles.diagLabel}>⚠️ Safety first</Text>
                    {diagnosis.safety_precautions.map((s, i) => (
                      <Text key={i} style={styles.diagItem}>• {s}</Text>
                    ))}
                  </View>
                )}

                {!!diagnosis.recommended_parts?.length && (
                  <View style={styles.diagSection}>
                    <Text style={styles.diagLabel}>🔩 Parts likely needed</Text>
                    {diagnosis.recommended_parts.map((p, i) => (
                      <Text key={i} style={styles.diagItem}>
                        • {p.part_name} — PKR {p.est_price_pkr}
                      </Text>
                    ))}
                  </View>
                )}

                <Text style={styles.diagEstimate}>
                  Estimated total: PKR {diagnosis.estimated_total_pkr?.min} – {diagnosis.estimated_total_pkr?.max}
                  {'  ·  '}~{diagnosis.estimated_duration_minutes} min
                </Text>
                <Text style={styles.diagSource}>
                  {diagnosis.source === 'gemini_multimodal' ? 'Analysed by Gemini vision' : 'Offline estimate'}
                </Text>
              </View>
            )}
          </View>

          {/* Commercialization & Trust Banner */}
          <View style={styles.passBanner}>
            <View style={styles.passLeft}>
              <Text style={styles.passTitle}>⭐ Khidmat Pass™</Text>
              <Text style={styles.passSub}>Every booking is escrow-protected • Upgrade to waive surge fees</Text>
            </View>
            <View style={styles.passBadge}>
              <Text style={styles.passBadgeText}>LEARN MORE</Text>
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
  multimodalRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toolIcon: { fontSize: 13 },
  toolText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600' },
  toolBtnPrimary: { borderColor: COLORS.primary, backgroundColor: '#1E293B' },
  diagBox: {
    marginTop: SPACING.md,
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#38BDF844',
  },
  diagHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  diagTitle: { color: '#38BDF8', fontSize: SIZES.sm, fontWeight: '700', flex: 1, paddingRight: 8 },
  diagSeverity: {
    color: COLORS.textSecondary, fontSize: 9, fontWeight: '800',
    backgroundColor: '#334155', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  diagCritical: { color: '#FCA5A5', backgroundColor: '#7F1D1D55' },
  diagCause: { color: COLORS.textSecondary, fontSize: SIZES.xs, lineHeight: 17 },
  diagSection: { marginTop: SPACING.sm },
  diagLabel: { color: COLORS.textPrimary, fontSize: SIZES.xs, fontWeight: '700', marginBottom: 2 },
  diagItem: { color: COLORS.textSecondary, fontSize: SIZES.xs, lineHeight: 16 },
  diagEstimate: { color: COLORS.accent, fontSize: SIZES.xs, fontWeight: '700', marginTop: SPACING.sm },
  diagSource: { color: COLORS.textMuted, fontSize: 9, marginTop: 2 },
  passBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#F59E0B44',
  },
  passLeft: { flex: 1 },
  passTitle: { color: '#FBBF24', fontSize: SIZES.sm, fontWeight: '800' },
  passSub: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  passBadge: {
    backgroundColor: '#F59E0B22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  passBadgeText: { color: '#FBBF24', fontSize: 10, fontWeight: '800' },
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

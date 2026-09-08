import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, SIZES, SHADOWS } from '../constants/theme';
import { requestOtp, verifyOtp } from '../services/auth';

export default function LoginScreen({ navigation, route }) {
  const [step, setStep] = useState('phone');   // 'phone' | 'code'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // Shown only while no SMS provider is configured, so the code can still be entered.
  const [devCode, setDevCode] = useState(null);

  const sendCode = async () => {
    setError(null);
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid mobile number, e.g. 0300 1234567');
      return;
    }
    setBusy(true);
    try {
      const res = await requestOtp(phone);
      setDevCode(res?.dev_code || null);
      setStep('code');
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not send the code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    setError(null);
    if (code.trim().length < 4) {
      setError('Enter the code you received.');
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(phone, code.trim());
      const next = route?.params?.redirectTo;
      if (next) navigation.replace(next);
      else navigation.goBack();
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not verify that code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={['#0A0E1A', '#111827']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            {step === 'phone'
              ? 'Apna mobile number dein — hum ek code bhejenge.'
              : `Code bheja gaya ${phone} par.`}
          </Text>

          <View style={[styles.card, SHADOWS.primary]}>
            {step === 'phone' ? (
              <>
                <Text style={styles.label}>Mobile number</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="0300 1234567"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  autoFocus
                  editable={!busy}
                />
                <TouchableOpacity
                  style={[styles.button, busy && styles.buttonDisabled]}
                  onPress={sendCode}
                  disabled={busy}
                >
                  {busy
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>Send code</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>6-digit code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={setCode}
                  placeholder="------"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!busy}
                />

                {devCode && (
                  <View style={styles.devBox}>
                    <Text style={styles.devLabel}>Development mode — no SMS provider configured</Text>
                    <Text style={styles.devCode}>{devCode}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.button, busy && styles.buttonDisabled]}
                  onPress={confirmCode}
                  disabled={busy}
                >
                  {busy
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>Verify &amp; sign in</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { setStep('phone'); setCode(''); setError(null); }}>
                  <Text style={styles.link}>Change number</Text>
                </TouchableOpacity>
              </>
            )}

            {error && <Text style={styles.error}>{error}</Text>}
          </View>

          <Text style={styles.footnote}>
            You can book without an account — signing in lets you see your booking
            history and raise disputes.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingTop: SPACING.xl * 2 },
  title: { color: COLORS.textPrimary, fontSize: SIZES.xxl, fontWeight: '800' },
  subtitle: { color: COLORS.textSecondary, fontSize: SIZES.sm, marginTop: 6, marginBottom: SPACING.lg },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
  },
  label: { color: COLORS.textSecondary, fontSize: SIZES.xs, marginBottom: 6 },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
    fontSize: SIZES.base,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  codeInput: { letterSpacing: 8, textAlign: 'center', fontSize: SIZES.xl },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: SIZES.base, fontWeight: '700' },
  link: { color: COLORS.primary, fontSize: SIZES.xs, textAlign: 'center', marginTop: SPACING.md },
  error: { color: '#FCA5A5', fontSize: SIZES.xs, marginTop: SPACING.md, textAlign: 'center' },
  devBox: {
    marginTop: SPACING.md,
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#F59E0B44',
    padding: SPACING.sm,
    alignItems: 'center',
  },
  devLabel: { color: '#FBBF24', fontSize: 10, marginBottom: 2 },
  devCode: { color: '#FBBF24', fontSize: SIZES.lg, fontWeight: '800', letterSpacing: 4 },
  footnote: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    marginTop: SPACING.lg,
    lineHeight: 17,
    textAlign: 'center',
  },
});

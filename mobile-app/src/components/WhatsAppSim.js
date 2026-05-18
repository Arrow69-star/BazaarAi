import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, SIZES } from '../constants/theme';

export default function WhatsAppSim({ messages }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  if (!messages || messages.length === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* WhatsApp header */}
      <LinearGradient colors={['#075E54', '#128C7E']} style={styles.waHeader}>
        <Text style={styles.waTitle}>📲 BazaarAI WhatsApp Simulation</Text>
        <Text style={styles.waSubtitle}>Real-world Pakistan workflow</Text>
      </LinearGradient>

      <View style={styles.chatBg}>
        {messages.map((msg, i) => {
          const isBazaarAI = msg.from === 'BazaarAI';
          return (
            <Bubble
              key={i}
              from={msg.from}
              time={msg.time}
              message={msg.message}
              isRight={isBazaarAI}
              delay={i * 200}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

function Bubble({ from, time, message, isRight, delay }) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        isRight ? styles.bubbleRowRight : styles.bubbleRowLeft,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }
      ]}
    >
      <View style={[styles.bubble, isRight ? styles.bubbleRight : styles.bubbleLeft]}>
        <Text style={[styles.bubbleFrom, { color: isRight ? '#4FC3F7' : '#81C784' }]}>
          {isRight ? '🤖 ' : '👨‍🔧 '}{from}
        </Text>
        <Text style={styles.bubbleText}>{message}</Text>
        <Text style={styles.bubbleTime}>{time} ✓✓</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#128C7E44',
  },
  waHeader: {
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waTitle: { color: '#fff', fontSize: SIZES.sm, fontWeight: '700' },
  waSubtitle: { color: '#B2DFDB', fontSize: SIZES.xs },
  chatBg: {
    backgroundColor: '#0A1A0A',
    padding: SPACING.md,
    minHeight: 200,
  },
  bubbleRow: { marginBottom: SPACING.sm },
  bubbleRowRight: { alignItems: 'flex-end' },
  bubbleRowLeft: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 12,
    padding: SPACING.sm,
  },
  bubbleRight: {
    backgroundColor: '#005C4B',
    borderTopRightRadius: 2,
  },
  bubbleLeft: {
    backgroundColor: '#1F2C34',
    borderTopLeftRadius: 2,
  },
  bubbleFrom: { fontSize: SIZES.xs, fontWeight: '700', marginBottom: 3 },
  bubbleText: { color: '#E9EDEF', fontSize: SIZES.sm, lineHeight: 20 },
  bubbleTime: { color: '#8696A0', fontSize: 10, marginTop: 4, textAlign: 'right' },
});

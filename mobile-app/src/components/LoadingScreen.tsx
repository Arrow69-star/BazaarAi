import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface LoadingScreenProps {
  onFinish?: () => void;
}

export default function LoadingScreen({ onFinish }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  // Animations
  const logoScale = useRef(new Animated.Value(1)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const bgTransition = useRef(new Animated.Value(0)).current;
  
  // Dots Animations
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Logo Pulse Loop (1.0 → 1.08 → 1.0, 1.5s loop)
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.08, duration: 750, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1.0, duration: 750, useNativeDriver: true }),
      ])
    ).start();

    // 2. Slow Background Gradient transition loop (3s loop)
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgTransition, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(bgTransition, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    // 3. Tagline & Subtitle Fades
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(taglineFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(subtitleFade, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // 4. Dot Pulsing Sequence
    const animateDots = () => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot3, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot1, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(dot2, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ])
      ).start();
    };
    animateDots();

    // 5. Numerical and Bar Progress (0% to 100%)
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 2;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        if (onFinish) {
          setTimeout(onFinish, 400); // Small grace delay
        }
      }
      setProgress(currentProgress);
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Background 1: #006D77 primary base */}
      <LinearGradient
        colors={['#006D77', '#004C55']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Background 2: Shifted colors to create smooth loop animation */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgTransition }]}>
        <LinearGradient
          colors={['#004C55', '#002D33']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Content Container */}
      <View style={styles.content}>
        {/* Logo Container */}
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoOrb}>
            <Text style={styles.logoEmoji}>🤝</Text>
          </View>
          <Text style={styles.logoText}>KHIDMAT AI</Text>
        </Animated.View>

        {/* Tagline Urdu */}
        <Animated.Text style={[styles.tagline, { opacity: taglineFade }]}>
          آپ کی خدمت میں حاضر ہیں
        </Animated.Text>

        {/* Tagline English */}
        <Animated.Text style={[styles.subtitle, { opacity: subtitleFade }]}>
          AI Service Orchestrator
        </Animated.Text>

        {/* 3 Animated Dots Loading Indicator */}
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { opacity: dot1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }), transform: [{ scale: dot1.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }] }]} />
          <Animated.View style={[styles.dot, { opacity: dot2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }), transform: [{ scale: dot2.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }] }]} />
          <Animated.View style={[styles.dot, { opacity: dot3.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }), transform: [{ scale: dot3.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }] }]} />
        </View>

        {/* Progress Bar Container */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}% Loaded</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoOrb: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 16,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  logoEmoji: {
    fontSize: 48,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E0F2FE',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#38BDF8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 30,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 20,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  progressContainer: {
    width: width * 0.6,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
  },
});

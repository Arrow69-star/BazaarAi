import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

// A single shimmer bar — reusable
function ShimmerBar({ width, height = 14, borderRadius = 7, style }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const bg = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['#21262D', '#30363D'],
  });

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: bg }, style]}
    />
  );
}

// Skeleton for a provider card
export function ProviderCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ShimmerBar width={50} height={50} borderRadius={25} />
        <View style={styles.col}>
          <ShimmerBar width={160} height={14} style={{ marginBottom: 8 }} />
          <ShimmerBar width={100} height={10} />
        </View>
      </View>
      <ShimmerBar width="100%" height={10} style={{ marginTop: 12 }} />
      <ShimmerBar width="70%" height={10} style={{ marginTop: 6 }} />
    </View>
  );
}

// Skeleton for a booking history card
export function BookingCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <ShimmerBar width={120} height={14} />
        <ShimmerBar width={70} height={22} borderRadius={11} />
      </View>
      <ShimmerBar width="90%" height={10} style={{ marginTop: 10 }} />
      <ShimmerBar width="60%" height={10} style={{ marginTop: 6 }} />
    </View>
  );
}

// Skeleton for agent log entry
export function AgentLogSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <ShimmerBar width={60} height={22} borderRadius={11} />
        <ShimmerBar width={80} height={10} style={{ marginLeft: 8 }} />
      </View>
      <ShimmerBar width="100%" height={10} style={{ marginTop: 10 }} />
      <ShimmerBar width="85%" height={10} style={{ marginTop: 6 }} />
    </View>
  );
}

// Generic list of skeletons
export function SkeletonList({ count = 4, type = 'provider' }) {
  const Component = type === 'booking' ? BookingCardSkeleton
    : type === 'log' ? AgentLogSkeleton
    : ProviderCardSkeleton;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161B22',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#21262D',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  col: {
    flex: 1,
  },
});

export default SkeletonList;

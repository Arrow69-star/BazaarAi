import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, Animated, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const VARIANTS = {
  success: { bg: 'rgba(63,185,80,0.95)', icon: '✅', border: '#3FB950' },
  error:   { bg: 'rgba(248,81,73,0.95)',  icon: '❌', border: '#F85149' },
  warning: { bg: 'rgba(210,153,34,0.95)', icon: '⚠️', border: '#D29922' },
  info:    { bg: 'rgba(88,166,255,0.95)', icon: 'ℹ️', border: '#58A6FF' },
};

// Global toast queue system
let _showToast = null;
export const showToast = (type, title, message) => {
  if (_showToast) _showToast(type, title, message);
};

export default function ToastMessage() {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const toastRef   = useRef({ type: 'info', title: '', message: '' });
  const [visible, setVisible] = React.useState(false);
  const [toast, setToast]     = React.useState({ type: 'info', title: '', message: '' });
  const timerRef = useRef(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,    duration: 250, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, []);

  const show = useCallback((type, title, message) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ type, title, message });
    setVisible(true);
    translateY.setValue(-120);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(hide, 3000);
  }, [hide]);

  useEffect(() => {
    _showToast = show;
    return () => { _showToast = null; };
  }, [show]);

  if (!visible) return null;

  const v = VARIANTS[toast.type] || VARIANTS.info;
  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity, borderLeftColor: v.border }]}>
      <View style={[styles.toast, { backgroundColor: v.bg }]}>
        <Text style={styles.icon}>{v.icon}</Text>
        <View style={styles.textBlock}>
          {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
          {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
        </View>
        <TouchableOpacity onPress={hide} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderLeftWidth: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  icon:      { fontSize: 20 },
  textBlock: { flex: 1 },
  title:     { color: '#fff', fontWeight: '800', fontSize: 13 },
  message:   { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  close:     { padding: 4 },
  closeText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '800' },
});

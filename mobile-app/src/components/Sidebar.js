import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Switch, ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home',        screen: 'Main' },
  { icon: '📋', label: 'My Bookings', screen: 'History' },
  { icon: '🔬', label: 'Agent Logs',  screen: 'Trace' },
  { icon: '📞', label: 'Support',      screen: null },
  { icon: 'ℹ️',  label: 'About',       screen: null },
];

export default function Sidebar({ navigation, state }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const translateX = useRef(new Animated.Value(-300)).current;
  const itemAnims  = useRef(NAV_ITEMS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: 0, tension: 70, friction: 14, useNativeDriver: true,
    }).start();
    NAV_ITEMS.forEach((_, i) => {
      Animated.timing(itemAnims[i], {
        toValue: 1, duration: 250, delay: 80 + i * 55, useNativeDriver: true,
      }).start();
    });
  }, []);

  const navigate = (screen) => {
    if (!screen) return;
    navigation.closeDrawer();
    navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header / Profile */}
      <LinearGradient
        colors={['#006D77', '#004C55']}
        style={styles.header}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>خ</Text>
        </View>
        <Text style={styles.appTitle}>KHIDMAT AI</Text>
        <Text style={styles.appSubtitle}>آپ کی خدمت میں حاضر ہیں</Text>
      </LinearGradient>

      {/* Navigation Items */}
      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item, i) => {
          const isActive = state?.routeNames?.[state?.index] === item.screen;
          return (
            <Animated.View
              key={i}
              style={{
                opacity: itemAnims[i],
                transform: [{
                  translateX: itemAnims[i].interpolate({
                    inputRange: [0, 1], outputRange: [-40, 0],
                  }),
                }],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.navItem,
                  isActive && { backgroundColor: colors.primaryGlow, borderLeftColor: colors.primary, borderLeftWidth: 3 },
                ]}
                onPress={() => navigate(item.screen)}
                activeOpacity={0.75}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={[styles.navLabel, { color: isActive ? colors.primary : colors.text }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Dark Mode Row */}
        <View style={[styles.navItem, styles.toggleRow]}>
          <Text style={styles.navIcon}>{isDark ? '🌙' : '☀️'}</Text>
          <Text style={[styles.navLabel, { color: colors.text }]}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </ScrollView>

      {/* Footer branding */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Powered by Gemini AI + 5-Agent Pipeline
        </Text>
        <Text style={[styles.footerVersion, { color: colors.textMuted }]}>v1.0.0 — Hackathon 2026</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  header:    { padding: 24, paddingTop: 40, alignItems: 'center' },
  avatar:    {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: '#F4A261',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText:   { fontSize: 36, color: '#F4A261' },
  appTitle:     { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  appSubtitle:  { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  navList:      { flex: 1, paddingVertical: 12 },
  navItem:      {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15,
    gap: 14, marginHorizontal: 8, borderRadius: 10, marginBottom: 2,
  },
  navIcon:   { fontSize: 20, width: 28, textAlign: 'center' },
  navLabel:  { fontSize: 15, fontWeight: '600', flex: 1 },
  toggleRow: { justifyContent: 'space-between' },
  footer:    { padding: 20, borderTopWidth: 1, alignItems: 'center' },
  footerText:    { fontSize: 11, textAlign: 'center' },
  footerVersion: { fontSize: 10, marginTop: 3 },
});

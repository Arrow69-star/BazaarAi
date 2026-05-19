import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0D1117' },
          headerTintColor: '#E2E8F0',
          headerTitleStyle: { fontWeight: '700', fontSize: 16 },
          contentStyle: { backgroundColor: '#0A0E1A' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="chat"  options={{ title: '🧠 Orchestrator Studio', headerBackTitle: 'Home' }} />
        <Stack.Screen name="booking-details" options={{ title: '📋 Booking Details' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

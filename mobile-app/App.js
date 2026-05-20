import 'react-native-gesture-handler'; // Must be FIRST import
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator }      from '@react-navigation/drawer';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';

// Theme
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

// Components
import { ErrorBoundary }  from './src/components/ErrorBoundary';
import ToastMessage       from './src/components/ToastMessage';
import LoadingScreen      from './src/components/LoadingScreen';
import Sidebar            from './src/components/Sidebar';

// Screens
import HomeScreen       from './src/screens/HomeScreen';
import ProcessingScreen from './src/screens/ProcessingScreen';
import ResultsScreen    from './src/screens/ResultsScreen';
import BookingScreen    from './src/screens/BookingScreen';
import TrackingScreen   from './src/screens/TrackingScreen';
import FeedbackScreen   from './src/screens/FeedbackScreen';
import HistoryScreen    from './src/screens/HistoryScreen';
import AgentTraceScreen from './src/screens/AgentTraceScreen';

const Stack  = createNativeStackNavigator();
const Tab    = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// ── Tab icons ─────────────────────────────────────────────────────────────────
const TAB_ICONS = { Home: '🏠', History: '📋', Trace: '🔬' };

function TabIcon({ name, focused }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 4 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{TAB_ICONS[name]}</Text>
    </View>
  );
}

// ── Bottom Tabs ───────────────────────────────────────────────────────────────
function HomeTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarLabel: ({ focused }) => (
          <Text style={{
            color: focused ? colors.primary : colors.textMuted,
            fontSize: 10,
            fontWeight: focused ? '700' : '500',
          }}>
            {route.name}
          </Text>
        ),
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
        },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Trace"   component={AgentTraceScreen} />
    </Tab.Navigator>
  );
}

// ── Drawer wrapping Tabs ─────────────────────────────────────────────────────
function DrawerApp() {
  const { colors } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <Sidebar {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: colors.surface, width: 280 },
        overlayColor: 'rgba(0,0,0,0.5)',
        drawerType: 'front',
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen name="MainTabs" component={HomeTabs} />
    </Drawer.Navigator>
  );
}

// ── Root Navigator ───────────────────────────────────────────────────────────
function RootNav() {
  const { colors, isDark } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Main"       component={DrawerApp} />
      <Stack.Screen name="Processing" component={ProcessingScreen}
        options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Results"    component={ResultsScreen} />
      <Stack.Screen name="Booking"    component={BookingScreen} />
      <Stack.Screen name="Tracking"   component={TrackingScreen} />
      <Stack.Screen name="Feedback"   component={FeedbackScreen} />
    </Stack.Navigator>
  );
}

// ── App Entry ────────────────────────────────────────────────────────────────
function AppInner() {
  const [appReady, setAppReady] = React.useState(false);
  const { isDark } = useTheme();

  if (!appReady) {
    return <LoadingScreen onFinish={() => setAppReady(true)} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ErrorBoundary>
        <RootNav />
      </ErrorBoundary>
      {/* Global toast layer — rendered on top of everything */}
      <ToastMessage />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

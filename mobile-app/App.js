import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';

import HomeScreen       from './src/screens/HomeScreen';
import ProcessingScreen from './src/screens/ProcessingScreen';
import ResultsScreen    from './src/screens/ResultsScreen';
import BookingScreen    from './src/screens/BookingScreen';
import TrackingScreen   from './src/screens/TrackingScreen';
import FeedbackScreen   from './src/screens/FeedbackScreen';
import HistoryScreen    from './src/screens/HistoryScreen';
import AgentTraceScreen from './src/screens/AgentTraceScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_ICONS = { Home: '🏠', History: '📋', Trace: '🔬' };

function TabIcon({ name, focused }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 4 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{TAB_ICONS[name]}</Text>
    </View>
  );
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarLabel: ({ focused }) => (
          <Text style={{ color: focused ? '#6C63FF' : '#6B7280', fontSize: 10, fontWeight: focused ? '700' : '500' }}>
            {route.name}
          </Text>
        ),
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#1F2937',
          height: 62,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Trace"   component={AgentTraceScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0A0E1A' },
        }}
      >
        <Stack.Screen name="Main"       component={HomeTabs} />
        <Stack.Screen name="Processing" component={ProcessingScreen} />
        <Stack.Screen name="Results"    component={ResultsScreen} />
        <Stack.Screen name="Booking"    component={BookingScreen} />
        <Stack.Screen name="Tracking"   component={TrackingScreen} />
        <Stack.Screen name="Feedback"   component={FeedbackScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

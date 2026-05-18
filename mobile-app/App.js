import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import ProcessingScreen from './src/screens/ProcessingScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import BookingScreen from './src/screens/BookingScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0A0E1A' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Processing" component={ProcessingScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="Tracking" component={TrackingScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

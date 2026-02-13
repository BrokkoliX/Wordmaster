import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { initDatabase } from './src/services/database';
import MainTabs from './src/navigation/MainTabs';
import TestScreen from './src/screens/TestScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    prepareApp();
  }, []);

  const prepareApp = async () => {
    try {
      console.log('Initializing WordMaster...');
      await initDatabase();
      console.log('Database initialized successfully');
      
      // Check if onboarding was completed
      const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
      setShowOnboarding(onboardingCompleted !== 'true');
      
      setIsReady(true);
    } catch (err) {
      console.error('Failed to initialize app:', err);
      setError(err.message);
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Loading WordMaster...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={showOnboarding ? "Onboarding" : "MainApp"}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
          />
          <Stack.Screen
            name="MainApp"
            component={MainTabs}
          />
          <Stack.Screen
            name="Test"
            component={TestScreen}
            options={{
              headerShown: true,
              title: '🧪 Achievement Tests',
              headerStyle: {
                backgroundColor: '#3498DB',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7F8C8D',
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    padding: 20,
    textAlign: 'center',
  },
});

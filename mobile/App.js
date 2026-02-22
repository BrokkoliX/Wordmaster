import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { initDatabase } from './src/services/database';
import MainTabs from './src/navigation/MainTabs';
import OnboardingScreen from './src/screens/OnboardingScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import GuestEntryScreen from './src/screens/GuestEntryScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, loading: authLoading, initialized } = useAuth();
  const [dbReady, setDbReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    prepareApp();
  }, []);

  const prepareApp = async () => {
    try {
      await initDatabase();

      const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
      setShowOnboarding(onboardingCompleted !== 'true');

      setDbReady(true);
    } catch (err) {
      console.error('Failed to initialize app:', err);
      setInitError(err.message);
    }
  };

  if (initError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {initError}</Text>
      </View>
    );
  }

  if (!dbReady || !initialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Loading WordMaster...</Text>
      </View>
    );
  }

  // Determine initial route based on auth + onboarding state
  const isAuthenticated = user !== null;

  // Build the screen list conditionally based on auth state.
  // React Navigation treats the first screen as the initial route.
  const authScreens = (
    <>
      {showOnboarding && (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      )}
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="GuestEntry" component={GuestEntryScreen} />
    </>
  );

  const appScreens = (
    <>
      <Stack.Screen name="MainApp" component={MainTabs} />
      {__DEV__ && (
        <Stack.Screen
          name="Test"
          component={require('./src/screens/TestScreen').default}
          options={{
            headerShown: true,
            title: 'Achievement Tests',
            headerStyle: { backgroundColor: '#3498DB' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
      )}
    </>
  );

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? appScreens : authScreens}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
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

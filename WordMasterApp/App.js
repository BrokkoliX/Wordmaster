import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { initDatabase } from './src/services/database';
import HomeScreen from './src/screens/HomeScreen';
import LearningScreen from './src/screens/LearningScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import TestScreen from './src/screens/TestScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    prepareApp();
  }, []);

  const prepareApp = async () => {
    try {
      console.log('Initializing WordMaster...');
      await initDatabase();
      console.log('Database initialized successfully');
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
    <>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#3498DB',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
              headerBackTitle: 'Back'
            }}
          />
          <Stack.Screen
            name="Achievements"
            component={AchievementsScreen}
            options={{
              title: 'Achievements',
              headerBackTitle: 'Back'
            }}
          />
          <Stack.Screen
            name="Test"
            component={TestScreen}
            options={{
              title: '🧪 Achievement Tests',
              headerBackTitle: 'Back'
            }}
          />
          <Stack.Screen
            name="Learning"
            component={LearningScreen}
            options={{
              title: 'Learning Session',
              headerBackTitle: 'Home'
            }}
          />
          <Stack.Screen
            name="Summary"
            component={SummaryScreen}
            options={{
              title: 'Session Summary',
              headerLeft: () => null,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </>
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

import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ModeSelectionScreen from '../screens/ModeSelectionScreen';
import LearningScreen from '../screens/LearningScreen';
import MatchingPairsScreen from '../screens/MatchingPairsScreen';
import TypeTranslationScreen from '../screens/TypeTranslationScreen';
import FillInBlankScreen from '../screens/FillInBlankScreen';
import SummaryScreen from '../screens/SummaryScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MistakeJournalScreen from '../screens/MistakeJournalScreen';
import WordListsScreen from '../screens/WordListsScreen';
import WordListDetailScreen from '../screens/WordListDetailScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home Stack
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#3498DB' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ title: 'Help & FAQ' }}
      />
      <Stack.Screen
        name="MistakeJournal"
        component={MistakeJournalScreen}
        options={{ title: 'Mistake Journal' }}
      />
      <Stack.Screen
        name="WordLists"
        component={WordListsScreen}
        options={{ title: 'My Word Lists' }}
      />
      <Stack.Screen
        name="WordListDetail"
        component={WordListDetailScreen}
        options={({ route }) => ({ title: route.params?.listName || 'Word List' })}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
    </Stack.Navigator>
  );
}

// Learn Stack
function LearnStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#3498DB' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="ModeSelection"
        component={ModeSelectionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Learning"
        component={LearningScreen}
        options={{ title: 'Multiple Choice' }}
      />
      <Stack.Screen
        name="MatchingPairs"
        component={MatchingPairsScreen}
        options={{ title: 'Matching Pairs' }}
      />
      <Stack.Screen
        name="TypeTranslation"
        component={TypeTranslationScreen}
        options={{ title: 'Type Translation' }}
      />
      <Stack.Screen
        name="FillInBlank"
        component={FillInBlankScreen}
        options={{ title: 'Fill in the Blank' }}
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
  );
}

// Progress Stack
function ProgressStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#3498DB' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="AchievementsList"
        component={AchievementsScreen}
        options={{ title: 'Achievements' }}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ title: 'Leaderboard' }}
      />
    </Stack.Navigator>
  );
}

// Profile Stack
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#3498DB' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}

// Main Tab Navigator
export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3498DB',
        tabBarInactiveTintColor: '#95A5A6',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? '🏠' : '🏡';
          } else if (route.name === 'Learn') {
            iconName = focused ? '📚' : '📖';
          } else if (route.name === 'Progress') {
            iconName = focused ? '📊' : '📈';
          } else if (route.name === 'Profile') {
            iconName = focused ? '👤' : '👥';
          }

          return <Text style={{ fontSize: size }}>{iconName}</Text>;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Learn"
        component={LearnStack}
        options={{ tabBarLabel: 'Learn' }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressStack}
        options={{ tabBarLabel: 'Progress' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

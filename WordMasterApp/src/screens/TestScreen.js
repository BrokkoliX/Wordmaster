import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import achievementService from '../services/AchievementService';
import * as testHelpers from '../../scripts/testAchievements';

export default function TestScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const runTest = async (testFn, testName) => {
    try {
      setLoading(true);
      console.log(`\n🧪 Running: ${testName}\n`);
      await testFn();
      await refreshStats();
      Alert.alert('✅ Test Complete', `${testName} finished successfully!`);
    } catch (error) {
      console.error(`❌ Error in ${testName}:`, error);
      Alert.alert('❌ Test Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      const achievementStats = await achievementService.getStats();
      setStats(achievementStats);
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  React.useEffect(() => {
    refreshStats();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>🧪 Achievement Test Lab</Text>
          <Text style={styles.subtitle}>Test achievement system features</Text>
        </View>

        {/* Stats Display */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Current Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.unlocked}</Text>
                <Text style={styles.statLabel}>Unlocked</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.percentComplete}%</Text>
                <Text style={styles.statLabel}>Complete</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalPoints}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={() => runTest(testHelpers.quickTest, 'Quick Test')}
            disabled={loading}
          >
            <Text style={styles.buttonText}>⚡ Run Quick Test</Text>
            <Text style={styles.buttonSubtext}>Unlock 4 test achievements</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => runTest(testHelpers.resetAllAchievements, 'Reset All')}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🧹 Reset All Achievements</Text>
            <Text style={styles.buttonSubtext}>Clear all progress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => runTest(testHelpers.viewAllAchievements, 'View All')}
            disabled={loading}
          >
            <Text style={styles.buttonText}>📊 View All (Console)</Text>
            <Text style={styles.buttonSubtext}>Check browser console</Text>
          </TouchableOpacity>
        </View>

        {/* Category Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Category Tests</Text>
          
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => runTest(testHelpers.testFirstSteps, 'First Steps')}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🌱 Test First Steps (5)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => runTest(testHelpers.testStreakAchievements, 'Streaks')}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🔥 Test Streaks (4)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => runTest(testHelpers.testMasteryAchievements, 'Mastery')}
            disabled={loading}
          >
            <Text style={styles.buttonText}>📚 Test Mastery (3)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => runTest(testHelpers.runAllTests, 'All Tests')}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🎯 Run All Tests</Text>
          </TouchableOpacity>
        </View>

        {/* Manual Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Manual Helpers</Text>
          
          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => runTest(
              () => testHelpers.unlockTestAchievement('first_word'),
              'Unlock First Word'
            )}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🌱 Unlock: First Word</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => runTest(
              () => testHelpers.setStreak(7),
              'Set 7-day Streak'
            )}
            disabled={loading}
          >
            <Text style={styles.buttonText}>🔥 Set Streak: 7 days</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() => runTest(
              () => testHelpers.setMasteredWords(10),
              'Set 10 Mastered Words'
            )}
            disabled={loading}
          >
            <Text style={styles.buttonText}>📚 Master: 10 words</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Navigation</Text>
          
          <TouchableOpacity
            style={styles.buttonNav}
            onPress={() => navigation.navigate('Achievements')}
          >
            <Text style={styles.buttonText}>🏆 View Achievements Screen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonNav}
            onPress={() => navigation.navigate('MainApp', { screen: 'Home', params: { screen: 'Dashboard' } })}
          >
            <Text style={styles.buttonText}>🏠 Back to Home</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Achievement System Testing v1.0
          </Text>
          <Text style={styles.footerSubtext}>
            Check console for detailed logs
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA'
  },
  scrollView: {
    flex: 1
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280'
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280'
  },
  section: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  buttonSecondary: {
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10
  },
  buttonNav: {
    backgroundColor: '#6B7280',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  buttonSubtext: {
    color: '#DBEAFE',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600'
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4
  }
});

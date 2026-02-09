import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { getUserStatistics } from '../services/database';
import { getStreakEmoji, getStreakMessage, formatStreakDisplay } from '../services/streakService';
import achievementService from '../services/AchievementService';

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({
    wordsLearned: 0,
    wordsMastered: 0,
    totalReviews: 0,
    avgAccuracy: 0,
    sessionsCompleted: 0
  });
  const [achievementStats, setAchievementStats] = useState({
    unlocked: 0,
    total: 0,
    totalPoints: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    
    // Refresh stats when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadStats();
    });

    return unsubscribe;
  }, [navigation]);

  const loadStats = async () => {
    try {
      const [statistics, achStats] = await Promise.all([
        getUserStatistics(),
        achievementService.getStats()
      ]);
      setStats(statistics);
      setAchievementStats(achStats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>WordMaster</Text>
          <Text style={styles.subtitle}>Learn Spanish Vocabulary</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Achievements')}
            >
              <Text style={styles.headerIcon}>🏆</Text>
              {achievementStats.unlocked > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{achievementStats.unlocked}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.headerIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak Display */}
        <View style={styles.streakContainer}>
          <Text style={styles.streakEmoji}>{getStreakEmoji(stats.currentStreak || 0)}</Text>
          <Text style={styles.streakCount}>{formatStreakDisplay(stats.currentStreak || 0)}</Text>
          <Text style={styles.streakMessage}>
            {getStreakMessage(stats.currentStreak || 0, stats.longestStreak || 0)}
          </Text>
          {stats.longestStreak > 0 && stats.longestStreak !== stats.currentStreak && (
            <Text style={styles.longestStreak}>Personal Best: {stats.longestStreak} days</Text>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.wordsLearned}</Text>
            <Text style={styles.statLabel}>Words Learning</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.wordsMastered}</Text>
            <Text style={styles.statLabel}>Words Mastered</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalReviews}</Text>
            <Text style={styles.statLabel}>Total Reviews</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.avgAccuracy > 0 ? Math.round(stats.avgAccuracy) : 0}%
            </Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>

        {/* Main CTA Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('Learning')}
        >
          <Text style={styles.startButtonText}>Start Learning</Text>
        </TouchableOpacity>

        {/* Development Test Button */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => navigation.navigate('Test')}
          >
            <Text style={styles.testButtonText}>🧪 Test Achievements</Text>
          </TouchableOpacity>
        )}

        {/* Secondary Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {stats.sessionsCompleted} sessions completed
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
    position: 'relative',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  headerButtons: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    position: 'relative',
    marginLeft: 8,
  },
  headerIcon: {
    fontSize: 28,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  streakContainer: {
    backgroundColor: '#FFF5E6',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFB84D',
  },
  streakEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  streakCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 8,
  },
  streakMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  longestStreak: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498DB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#3498DB',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#059669',
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#95A5A6',
  },
});

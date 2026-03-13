import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserStatistics } from '../services/database';
import { getStreakEmoji, getStreakMessage, formatStreakDisplay } from '../services/streakService';
import achievementService from '../services/AchievementService';
import { showErrorAlert } from '../utils/errorMessages';
import { LANGUAGE_NAMES } from '../constants/languages';
import { getMistakeSummary } from '../services/mistakeJournalService';
import { getTodayChallenge, getChallengeStreak } from '../services/dailyChallengeService';
import { getWeakAreaSuggestion } from '../services/weakAreaService';
import { getLocalTotal } from '../services/xpService';

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
  const [learningLanguage, setLearningLanguage] = useState('es');
  const [loading, setLoading] = useState(true);
  const [mistakeSummary, setMistakeSummary] = useState(null);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [challengeStreak, setChallengeStreak] = useState(null);
  const [weakArea, setWeakArea] = useState(null);
  const [localXp, setLocalXp] = useState(0);

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
      const [statistics, achStats, savedLearningLang, mistakes, challenge, chStreak, weak, xp] =
        await Promise.all([
          getUserStatistics(),
          achievementService.getStats(),
          AsyncStorage.getItem('learningLanguage'),
          getMistakeSummary(),
          getTodayChallenge(),
          getChallengeStreak(),
          getWeakAreaSuggestion(),
          getLocalTotal(),
        ]);
      setStats(statistics);
      setAchievementStats(achStats);
      if (savedLearningLang) setLearningLanguage(savedLearningLang);
      setMistakeSummary(mistakes);
      setDailyChallenge(challenge);
      setChallengeStreak(chStreak);
      setWeakArea(weak);
      setLocalXp(xp);
    } catch (error) {
      console.error('Error loading statistics:', error);
      showErrorAlert(error, () => loadStats());
    } finally {
      setLoading(false);
    }
  };

  // Show loading indicator
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Progress', { screen: 'AchievementsList' })}
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
              onPress={() => navigation.navigate('Profile', { screen: 'SettingsMain' })}
            >
              <Text style={styles.headerIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>WordMaster</Text>
          <Text style={styles.subtitle}>Learn {LANGUAGE_NAMES[learningLanguage] || 'Vocabulary'} Vocabulary</Text>
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

        {/* Daily Challenge Card */}
        {dailyChallenge && (
          <TouchableOpacity
            style={styles.challengeCard}
            onPress={() => navigation.navigate('Learn', { screen: 'ModeSelection' })}
            activeOpacity={0.7}
          >
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeTitle}>{dailyChallenge.title}</Text>
              {dailyChallenge.is_completed ? (
                <Text style={styles.challengeCheck}>Done</Text>
              ) : null}
            </View>
            <View style={styles.challengeBarTrack}>
              <View
                style={[
                  styles.challengeBarFill,
                  {
                    width: `${Math.min(100,
                      (dailyChallenge.current_value / dailyChallenge.target_value) * 100
                    )}%`,
                    backgroundColor: dailyChallenge.is_completed ? '#27AE60' : '#3498DB',
                  },
                ]}
              />
            </View>
            <Text style={styles.challengeProgress}>
              {dailyChallenge.current_value} / {dailyChallenge.target_value}
              {challengeStreak && challengeStreak.currentStreak > 0
                ? `  |  ${challengeStreak.currentStreak} day streak`
                : ''}
            </Text>
          </TouchableOpacity>
        )}

        {/* Weak Area Suggestion */}
        {weakArea && (
          <TouchableOpacity
            style={styles.weakAreaBanner}
            onPress={() => navigation.navigate('Learn', {
              screen: 'Learning',
              params: { source: 'weakArea', weakArea, wordsPerSession: 20 },
            })}
            activeOpacity={0.7}
          >
            <Text style={styles.weakAreaText}>{weakArea.suggestion}</Text>
            <Text style={styles.weakAreaAction}>Practice Now</Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions Row */}
        <View style={styles.quickActionsRow}>
          {mistakeSummary && mistakeSummary.totalMistakeWords > 0 && (
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Home', { screen: 'MistakeJournal' })}
            >
              <Text style={styles.quickActionIcon}>📝</Text>
              <Text style={styles.quickActionLabel}>{mistakeSummary.totalMistakeWords} Mistakes</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Home', { screen: 'WordLists' })}
          >
            <Text style={styles.quickActionIcon}>📚</Text>
            <Text style={styles.quickActionLabel}>My Lists</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Home', { screen: 'Analytics' })}
          >
            <Text style={styles.quickActionIcon}>📊</Text>
            <Text style={styles.quickActionLabel}>Analytics</Text>
          </TouchableOpacity>
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

        {/* XP Card */}
        <TouchableOpacity
          style={styles.xpCard}
          onPress={() => navigation.navigate('Progress', { screen: 'Leaderboard' })}
          activeOpacity={0.7}
        >
          <Text style={styles.xpCardIcon}>⚡</Text>
          <View style={styles.xpCardInfo}>
            <Text style={styles.xpCardValue}>{localXp.toLocaleString()} XP</Text>
            <Text style={styles.xpCardLabel}>View Leaderboard →</Text>
          </View>
        </TouchableOpacity>

        {/* Main CTA Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigation.navigate('Learn', { screen: 'ModeSelection' })}
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
      </ScrollView>
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  headerButtons: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  headerButton: {
    padding: 8,
    position: 'relative',
    marginLeft: 8,
  },
  headerIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  streakContainer: {
    backgroundColor: '#FFF5E6',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFB84D',
  },
  streakEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  streakCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  streakMessage: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  longestStreak: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498DB',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  xpCardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  xpCardInfo: {
    flex: 1,
  },
  xpCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498DB',
  },
  xpCardLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  startButton: {
    backgroundColor: '#3498DB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
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
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#95A5A6',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7F8C8D',
  },
  challengeCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#3498DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  challengeCheck: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27AE60',
    backgroundColor: '#D4EDDA',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  challengeBarTrack: {
    height: 8,
    backgroundColor: '#ECF0F1',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  challengeBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  challengeProgress: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  weakAreaBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weakAreaText: {
    fontSize: 13,
    color: '#856404',
    flex: 1,
    marginRight: 8,
  },
  weakAreaAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F39C12',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  quickAction: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 10,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 11,
    color: '#7F8C8D',
    fontWeight: '600',
  },
});

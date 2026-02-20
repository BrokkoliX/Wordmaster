import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStreakEmoji, formatStreakDisplay } from '../services/streakService';

export default function SummaryScreen({ route, navigation }) {
  const { 
    accuracy = 0, 
    wordsReviewed = 0, 
    correctAnswers = 0,
    streak = null 
  } = route.params || {};

  const getEncouragementMessage = (acc) => {
    if (acc >= 90) return "Excellent work! 🌟";
    if (acc >= 75) return "Great job! 💪";
    if (acc >= 60) return "Good effort! 👍";
    return "Keep practicing! 📚";
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Session Complete!</Text>
          <Text style={styles.encouragement}>{getEncouragementMessage(accuracy)}</Text>
        </View>

        {/* Accuracy Circle */}
        <View style={styles.accuracyCircle}>
          <Text style={styles.accuracyNumber}>{Math.round(accuracy)}%</Text>
          <Text style={styles.accuracyLabel}>Accuracy</Text>
        </View>

        {/* Streak Update */}
        {streak && (
          <View style={styles.streakContainer}>
            {streak.milestone ? (
              <View style={styles.milestoneContainer}>
                <Text style={styles.milestoneEmoji}>{streak.milestone.emoji}</Text>
                <Text style={styles.milestoneText}>{streak.milestone.message}</Text>
              </View>
            ) : (
              <View style={styles.streakUpdate}>
                <Text style={styles.streakEmoji}>{getStreakEmoji(streak.current)}</Text>
                <Text style={styles.streakText}>
                  {formatStreakDisplay(streak.current)} Streak!
                </Text>
                {streak.current > streak.longest - 1 && streak.current > 1 && (
                  <Text style={styles.newRecord}>New Personal Record! 🏅</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Words Reviewed</Text>
            <Text style={styles.statValue}>{wordsReviewed}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Correct Answers</Text>
            <Text style={styles.statValue}>{correctAnswers}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Incorrect Answers</Text>
            <Text style={styles.statValue}>{wordsReviewed - correctAnswers}</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('ModeSelection')}
          >
            <Text style={styles.continueButtonText}>Continue Learning</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('Home', { screen: 'Dashboard' })}
          >
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 6,
  },
  encouragement: {
    fontSize: 17,
    color: '#3498DB',
  },
  accuracyCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'white',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 6,
    borderColor: '#3498DB',
  },
  accuracyNumber: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#3498DB',
  },
  accuracyLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 4,
  },
  streakContainer: {
    backgroundColor: '#FFF5E6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFB84D',
  },
  streakUpdate: {
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  streakText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  newRecord: {
    fontSize: 13,
    color: '#2ECC71',
    marginTop: 4,
    fontWeight: '600',
  },
  milestoneContainer: {
    alignItems: 'center',
    backgroundColor: '#FFE5B4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFB84D',
  },
  milestoneEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  milestoneText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6ED',
  },
  statLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  continueButton: {
    backgroundColor: '#3498DB',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  homeButton: {
    backgroundColor: 'transparent',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  homeButtonText: {
    color: '#3498DB',
    fontSize: 16,
    fontWeight: '600',
  },
});

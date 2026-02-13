import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
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
      <View style={styles.content}>
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
            onPress={() => navigation.navigate('Learning')}
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
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  encouragement: {
    fontSize: 20,
    color: '#3498DB',
  },
  accuracyCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'white',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 8,
    borderColor: '#3498DB',
  },
  accuracyNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#3498DB',
  },
  accuracyLabel: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 8,
  },
  streakContainer: {
    backgroundColor: '#FFF5E6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFB84D',
  },
  streakUpdate: {
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  streakText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  newRecord: {
    fontSize: 14,
    color: '#2ECC71',
    marginTop: 8,
    fontWeight: '600',
  },
  milestoneContainer: {
    alignItems: 'center',
    backgroundColor: '#FFE5B4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFB84D',
  },
  milestoneEmoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  milestoneText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6ED',
  },
  statLabel: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  continueButton: {
    backgroundColor: '#3498DB',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  homeButton: {
    backgroundColor: 'transparent',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  homeButtonText: {
    color: '#3498DB',
    fontSize: 18,
    fontWeight: '600',
  },
});

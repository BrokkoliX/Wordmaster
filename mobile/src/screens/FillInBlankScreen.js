import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createSession, completeSession } from '../services/database';
import { getLocalSentenceTemplates } from '../services/sentenceApiService';
import achievementService from '../services/AchievementService';
import AchievementUnlockModal from '../components/AchievementUnlockModal';
import hapticService from '../services/HapticService';

const DEFAULT_SENTENCES_PER_SESSION = 20;

export default function FillInBlankScreen({ route, navigation }) {
  const wordsPerSession =
    route.params?.wordsPerSession || DEFAULT_SENTENCES_PER_SESSION;

  const [loading, setLoading] = useState(true);
  const [sentences, setSentences] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState(null);

  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));

  const [achievementModalVisible, setAchievementModalVisible] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    if (sentences.length > 0 && currentIndex < sentences.length) {
      loadQuestion();
    }
  }, [sentences, currentIndex]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      const newSessionId = await createSession();
      setSessionId(newSessionId);
      await achievementService.startSession(newSessionId);

      const templates = await getLocalSentenceTemplates(wordsPerSession);
      setSentences(templates);
      setLoading(false);
    } catch (error) {
      console.error('Error initializing fill-in-the-blank session:', error);
      setLoading(false);
    }
  };

  const loadQuestion = () => {
    const s = sentences[currentIndex];
    let distractors = [];
    try {
      distractors =
        typeof s.distractors === 'string'
          ? JSON.parse(s.distractors)
          : s.distractors || [];
    } catch {
      distractors = [];
    }

    const allOptions = [
      { text: s.answer, isCorrect: true },
      ...distractors.map((d) => ({ text: d, isCorrect: false })),
    ].sort(() => Math.random() - 0.5);

    setOptions(allOptions);
    setSelectedOption(null);
    setShowFeedback(false);
    setStartTime(Date.now());

    scaleAnim.setValue(0.85);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleOptionPress = async (option) => {
    if (showFeedback) return;

    setSelectedOption(option);
    setShowFeedback(true);

    if (option.isCorrect) {
      hapticService.success();
      setCorrectCount((c) => c + 1);

      // Auto-advance after a short delay on correct
      setTimeout(() => handleNext(), 800);
    } else {
      hapticService.error();
    }

    // Track for achievements
    try {
      await achievementService.trackAnswer(option.isCorrect, Date.now() - startTime);
    } catch (err) {
      // non-critical
    }
  };

  const handleNext = async () => {
    if (currentIndex >= sentences.length - 1) {
      // Session complete
      const accuracy =
        sentences.length > 0
          ? Math.round((correctCount / sentences.length) * 100)
          : 0;

      try {
        await completeSession(sessionId, sentences.length, correctCount);
        const achievements = await achievementService.endSession(
          sentences.length,
          correctCount
        );
        if (achievements && achievements.length > 0) {
          setAchievementQueue(achievements);
          setCurrentAchievement(achievements[0]);
          setAchievementModalVisible(true);
          return; // navigation happens after modal dismiss
        }
      } catch (err) {
        console.error('Error completing session:', err);
      }

      navigation.replace('Summary', {
        accuracy:
          sentences.length > 0
            ? (correctCount / sentences.length) * 100
            : 0,
        wordsReviewed: sentences.length,
        correctAnswers: correctCount,
      });
      return;
    }

    // Transition animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((i) => i + 1);
      fadeAnim.setValue(1);
    });
  };

  const handleAchievementClose = () => {
    setAchievementModalVisible(false);
    const remaining = achievementQueue.slice(1);
    if (remaining.length > 0) {
      setAchievementQueue(remaining);
      setCurrentAchievement(remaining[0]);
      setTimeout(() => setAchievementModalVisible(true), 300);
    } else {
      navigation.replace('Summary', {
        accuracy:
          sentences.length > 0
            ? (correctCount / sentences.length) * 100
            : 0,
        wordsReviewed: sentences.length,
        correctAnswers: correctCount,
      });
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── No sentences available ──
  if (sentences.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Exercises Available</Text>
          <Text style={styles.emptyText}>
            Fill-in-the-blank exercises are not yet available for this language
            or level. Try a different language in Settings.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentSentence = sentences[currentIndex];
  const progress = ((currentIndex + 1) / sentences.length) * 100;

  // Split sentence around the blank marker "___"
  const sentenceParts = currentSentence.sentence.split('___');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {sentences.length}
          </Text>
        </View>

        <Animated.View
          style={[
            styles.questionContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Grammar topic badge */}
          {currentSentence.grammar_topic && (
            <View style={styles.topicBadge}>
              <Text style={styles.topicText}>
                {currentSentence.grammar_topic.replace(/_/g, ' ')}
              </Text>
            </View>
          )}

          {/* Sentence card with blank */}
          <View style={styles.sentenceCard}>
            <Text style={styles.sentenceText}>
              {sentenceParts[0]}
              <Text
                style={[
                  styles.blankText,
                  showFeedback && selectedOption?.isCorrect && styles.blankCorrect,
                  showFeedback && !selectedOption?.isCorrect && styles.blankIncorrect,
                ]}
              >
                {showFeedback ? (selectedOption?.isCorrect ? selectedOption.text : `${selectedOption?.text}`) : ' _____ '}
              </Text>
              {sentenceParts[1] || ''}
            </Text>

            {/* Show correct answer on wrong selection */}
            {showFeedback && !selectedOption?.isCorrect && (
              <Text style={styles.correctAnswerText}>
                Correct: {currentSentence.answer}
              </Text>
            )}
          </View>

          {/* Hint */}
          {currentSentence.hint && (
            <Text style={styles.hintText}>Hint: {currentSentence.hint}</Text>
          )}

          {/* Options */}
          <Text style={styles.instructionText}>Choose the missing word:</Text>
          <View style={styles.optionsContainer}>
            {options.map((option, index) => {
              let buttonStyle = styles.optionButton;
              let textStyle = styles.optionText;

              if (showFeedback) {
                if (option.isCorrect) {
                  buttonStyle = styles.optionButtonCorrect;
                  textStyle = styles.optionTextCorrect;
                } else if (
                  selectedOption?.text === option.text &&
                  !option.isCorrect
                ) {
                  buttonStyle = styles.optionButtonIncorrect;
                  textStyle = styles.optionTextIncorrect;
                }
              }

              return (
                <TouchableOpacity
                  key={`${option.text}-${index}`}
                  style={buttonStyle}
                  onPress={() => handleOptionPress(option)}
                  disabled={showFeedback}
                >
                  <Text style={textStyle}>{option.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Next button on wrong answer */}
      {showFeedback && selectedOption && !selectedOption.isCorrect && (
        <View style={styles.nextButtonContainer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex < sentences.length - 1 ? 'Next →' : 'Finish'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <AchievementUnlockModal
        visible={achievementModalVisible}
        achievement={currentAchievement}
        onClose={handleAchievementClose}
      />
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
    flexGrow: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7F8C8D',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E6ED',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9B59B6',
  },
  progressText: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  questionContainer: {
    flex: 1,
  },
  topicBadge: {
    alignSelf: 'center',
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  topicText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7E57C2',
    textTransform: 'capitalize',
  },
  sentenceCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#9B59B6',
  },
  sentenceText: {
    fontSize: 22,
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 34,
  },
  blankText: {
    fontWeight: 'bold',
    color: '#9B59B6',
    backgroundColor: '#F3E5F5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  blankCorrect: {
    color: '#155724',
    backgroundColor: '#D4EDDA',
  },
  blankIncorrect: {
    color: '#721C24',
    backgroundColor: '#F8D7DA',
    textDecorationLine: 'line-through',
  },
  correctAnswerText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#27AE60',
  },
  hintText: {
    fontSize: 13,
    color: '#95A5A6',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 14,
  },
  instructionText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 10,
  },
  optionsContainer: {
    flex: 1,
  },
  optionButton: {
    backgroundColor: 'white',
    padding: 13,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E0E6ED',
  },
  optionButtonCorrect: {
    backgroundColor: '#D4EDDA',
    padding: 13,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#28A745',
  },
  optionButtonIncorrect: {
    backgroundColor: '#F8D7DA',
    padding: 13,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#DC3545',
  },
  optionText: {
    fontSize: 16,
    color: '#2C3E50',
    textAlign: 'center',
    fontWeight: '500',
  },
  optionTextCorrect: {
    fontSize: 16,
    color: '#155724',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  optionTextIncorrect: {
    fontSize: 16,
    color: '#721C24',
    textAlign: 'center',
  },
  nextButtonContainer: {
    padding: 16,
    paddingBottom: 20,
    backgroundColor: '#F5F7FA',
  },
  nextButton: {
    backgroundColor: '#9B59B6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

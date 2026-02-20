import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ScrollView,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getWordsDueForReview,
  getNewWords,
  updateWordProgress,
  createSession,
  completeSession,
} from '../services/database';
import achievementService from '../services/AchievementService';
import AchievementUnlockModal from '../components/AchievementUnlockModal';
import ttsService from '../services/TTSService';
import hapticService from '../services/HapticService';

const DEFAULT_WORDS_PER_SESSION = 20;

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  hu: 'Hungarian',
};

/**
 * Normalize a string for comparison: lowercase, trim, and strip accents.
 * This allows forgiving matching so that e.g. "cafe" matches "café".
 */
const normalizeAnswer = (text) => {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function TypeTranslationScreen({ route, navigation }) {
  const wordsPerSession = route.params?.wordsPerSession || DEFAULT_WORDS_PER_SESSION;
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [achievementModalVisible, setAchievementModalVisible] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);

  const inputRef = useRef(null);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    if (words.length > 0 && currentIndex < words.length) {
      loadWord();
    }
  }, [words, currentIndex]);

  const initializeSession = async () => {
    try {
      setLoading(true);

      const newSessionId = await createSession();
      setSessionId(newSessionId);

      await achievementService.startSession(newSessionId);

      let reviewWords = await getWordsDueForReview(wordsPerSession);

      if (reviewWords.length < wordsPerSession) {
        const newWords = await getNewWords(wordsPerSession - reviewWords.length);
        reviewWords = [...reviewWords, ...newWords];
      }

      setWords(reviewWords);
      setLoading(false);
    } catch (error) {
      console.error('Error initializing session:', error);
      setLoading(false);
    }
  };

  const loadWord = async () => {
    try {
      const word = words[currentIndex];
      setCurrentWord(word);
      setUserInput('');
      setShowFeedback(false);
      setIsCorrect(false);
      setStartTime(Date.now());

      // Pronounce the word automatically
      const targetLang = word.target_lang;
      if (targetLang && word.word) {
        await ttsService.speakWord(word.word, targetLang);
      }

      // Entrance animation
      scaleAnim.setValue(0.8);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Focus the text input after animation settles
      setTimeout(() => {
        inputRef.current?.focus();
      }, 400);
    } catch (error) {
      console.error('Error loading word:', error);
    }
  };

  const handleSubmit = async () => {
    if (showFeedback || !userInput.trim()) return;

    Keyboard.dismiss();
    setShowFeedback(true);

    const responseTime = Date.now() - startTime;
    const correctAnswer = currentWord.translation;
    const correct = normalizeAnswer(userInput) === normalizeAnswer(correctAnswer);

    setIsCorrect(correct);

    if (correct) {
      hapticService.success();
    } else {
      hapticService.error();
    }

    try {
      await updateWordProgress(currentWord.id, correct, responseTime);

      if (correct) {
        setCorrectCount((prev) => prev + 1);
      }

      await achievementService.trackWordPractice(
        currentWord.id,
        currentWord.category,
        correct
      );
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleNext = async () => {
    if (currentIndex < words.length - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((prev) => prev + 1);
      });
    } else {
      await finishSession();
    }
  };

  const finishSession = async () => {
    try {
      const result = await completeSession(sessionId, words.length, correctCount);

      await achievementService.endSession();
      await achievementService.checkAllAchievements();

      const pendingAchievements = await achievementService.getPendingNotifications();
      if (pendingAchievements.length > 0) {
        setAchievementQueue(pendingAchievements);
        showNextAchievement(pendingAchievements);
      } else {
        navigation.navigate('Summary', {
          accuracy: result.accuracy,
          wordsReviewed: result.wordsReviewed,
          correctAnswers: result.correctAnswers,
          streak: result.streak || null,
        });
      }
    } catch (error) {
      console.error('Error finishing session:', error);
      navigation.navigate('Home', { screen: 'Dashboard' });
    }
  };

  const showNextAchievement = (queue) => {
    if (queue.length > 0) {
      setCurrentAchievement(queue[0]);
      setAchievementModalVisible(true);
    }
  };

  const handleAchievementClose = async () => {
    setAchievementModalVisible(false);

    if (currentAchievement) {
      await achievementService.markNotificationShown(currentAchievement.id);
    }

    const remainingQueue = achievementQueue.slice(1);
    setAchievementQueue(remainingQueue);

    if (remainingQueue.length > 0) {
      setTimeout(() => {
        showNextAchievement(remainingQueue);
      }, 300);
    } else {
      navigation.navigate('Summary', {
        accuracy: (correctCount / words.length) * 100,
        wordsReviewed: words.length,
        correctAnswers: correctCount,
        streak: null,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Preparing your lesson...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (words.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No words to review!</Text>
          <Text style={styles.emptyText}>Check back later or add new words.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Home', { screen: 'Dashboard' })}
          >
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentWord) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
        </View>
      </SafeAreaView>
    );
  }

  const targetLangName = LANGUAGE_NAMES[currentWord.target_lang] || currentWord.target_lang;
  const sourceLangName = LANGUAGE_NAMES[currentWord.source_lang] || currentWord.source_lang;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentIndex + 1) / words.length) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {words.length}
          </Text>
        </View>

        <Animated.View
          style={[
            styles.questionContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Direction indicator */}
          <Text style={styles.directionLabel}>
            {targetLangName} → {sourceLangName}
          </Text>

          {/* Question card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentWord.word}</Text>
            <TouchableOpacity
              style={styles.speakerButton}
              onPress={async () => {
                hapticService.light();
                const targetLang = currentWord.target_lang || 'es';
                const langCode = ttsService.getLanguageCode(targetLang);
                await ttsService.speak(currentWord.word, langCode, { force: true });
              }}
            >
              <Text style={styles.speakerIcon}>🔊</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.instructionText}>Type the translation:</Text>

          {/* Text input */}
          <View
            style={[
              styles.inputWrapper,
              showFeedback && isCorrect && styles.inputWrapperCorrect,
              showFeedback && !isCorrect && styles.inputWrapperIncorrect,
            ]}
          >
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={userInput}
              onChangeText={setUserInput}
              placeholder={`Type in ${sourceLangName}...`}
              placeholderTextColor="#B0BEC5"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!showFeedback}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {/* Feedback */}
          {showFeedback && (
            <View
              style={[
                styles.feedbackContainer,
                isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect,
              ]}
            >
              <Text style={styles.feedbackEmoji}>{isCorrect ? '✓' : '✗'}</Text>
              <View style={styles.feedbackTextContainer}>
                <Text
                  style={[
                    styles.feedbackTitle,
                    isCorrect ? styles.feedbackTitleCorrect : styles.feedbackTitleIncorrect,
                  ]}
                >
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </Text>
                {!isCorrect && (
                  <Text style={styles.correctAnswerText}>
                    Correct answer: {currentWord.translation}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Submit / Next button */}
          {!showFeedback ? (
            <TouchableOpacity
              style={[
                styles.submitButton,
                !userInput.trim() && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!userInput.trim()}
            >
              <Text style={styles.submitButtonText}>Check</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {currentIndex < words.length - 1 ? 'Next →' : 'Finish'}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Achievement Unlock Modal */}
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
    padding: 20,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 30,
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
    marginBottom: 30,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E6ED',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498DB',
  },
  progressText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  questionContainer: {
    flex: 1,
  },
  directionLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  questionText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
  },
  speakerButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    backgroundColor: '#3498DB',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  speakerIcon: {
    fontSize: 24,
  },
  instructionText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  inputWrapper: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E6ED',
    marginBottom: 16,
  },
  inputWrapperCorrect: {
    borderColor: '#28A745',
    backgroundColor: '#D4EDDA',
  },
  inputWrapperIncorrect: {
    borderColor: '#DC3545',
    backgroundColor: '#F8D7DA',
  },
  textInput: {
    fontSize: 18,
    color: '#2C3E50',
    padding: 18,
    textAlign: 'center',
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  feedbackCorrect: {
    backgroundColor: '#D4EDDA',
  },
  feedbackIncorrect: {
    backgroundColor: '#F8D7DA',
  },
  feedbackEmoji: {
    fontSize: 28,
    fontWeight: 'bold',
    marginRight: 12,
  },
  feedbackTextContainer: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  feedbackTitleCorrect: {
    color: '#155724',
  },
  feedbackTitleIncorrect: {
    color: '#721C24',
  },
  correctAnswerText: {
    fontSize: 15,
    color: '#721C24',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#3498DB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#3498DB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

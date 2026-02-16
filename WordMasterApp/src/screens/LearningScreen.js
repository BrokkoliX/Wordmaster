import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Animated
} from 'react-native';
import {
  getWordsDueForReview,
  getNewWords,
  updateWordProgress,
  createSession,
  completeSession
} from '../services/database';
import { createMultipleChoiceQuestion } from '../utils/distractorGenerator';
import achievementService from '../services/AchievementService';
import AchievementUnlockModal from '../components/AchievementUnlockModal';
import ttsService from '../services/TTSService';
import hapticService from '../services/HapticService';

const WORDS_PER_SESSION = 20;

export default function LearningScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [buttonScale] = useState(new Animated.Value(1));
  const [achievementModalVisible, setAchievementModalVisible] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    if (words.length > 0 && currentIndex < words.length) {
      loadQuestion();
    }
  }, [words, currentIndex]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      
      // Create session
      const newSessionId = await createSession();
      setSessionId(newSessionId);
      
      // Start achievement tracking
      await achievementService.startSession(newSessionId);
      
      // Get words for review
      let reviewWords = await getWordsDueForReview(15);
      
      // Add new words if needed
      if (reviewWords.length < WORDS_PER_SESSION) {
        const newWords = await getNewWords(WORDS_PER_SESSION - reviewWords.length);
        reviewWords = [...reviewWords, ...newWords];
      }
      
      setWords(reviewWords);
      setLoading(false);
    } catch (error) {
      console.error('Error initializing session:', error);
      setLoading(false);
    }
  };

  const loadQuestion = async () => {
    try {
      const word = words[currentIndex];
      // Always show target language word and ask for source language translation
      // e.g., if learning Hungarian from English: show Hungarian, ask for English
      const reverseDirection = false; // Never reverse - keep consistent direction
      const mcQuestion = await createMultipleChoiceQuestion(word, reverseDirection);
      
      setQuestion(mcQuestion);
      setSelectedOption(null);
      setShowFeedback(false);
      setStartTime(Date.now());
      
      // Pronounce the word automatically (if enabled)
      // Speak in the target language (the language being learned)
      const targetLang = word.target_lang; // 'es', 'fr', 'de', 'hu', etc.
      if (targetLang && mcQuestion.question) {
        // Auto-pronounce the question word in its native language
        await ttsService.speakWord(mcQuestion.question, targetLang);
      }
      
      // Smooth entrance animations
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
        })
      ]).start();
    } catch (error) {
      console.error('Error loading question:', error);
    }
  };

  const handleOptionPress = async (option) => {
    if (showFeedback) return;
    
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        tension: 100,
        friction: 3,
        useNativeDriver: true,
      })
    ]).start();
    
    setSelectedOption(option);
    setShowFeedback(true);
    
    const responseTime = Date.now() - startTime;
    const isCorrect = option.isCorrect;
    
    // Haptic feedback
    if (isCorrect) {
      hapticService.success();
    } else {
      hapticService.error();
    }
    
    // Update progress
    try {
      await updateWordProgress(question.word.id, isCorrect, responseTime);
      
      if (isCorrect) {
        setCorrectCount(prev => prev + 1);
      }
      
      // Track achievement progress
      await achievementService.trackWordPractice(
        question.word.id,
        question.word.category,
        isCorrect
      );
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleNext = async () => {
    if (currentIndex < words.length - 1) {
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(prev => prev + 1);
      });
    } else {
      // Session complete
      await finishSession();
    }
  };

  const finishSession = async () => {
    try {
      const result = await completeSession(sessionId, words.length, correctCount);
      
      // End achievement tracking and get unlocked achievements
      await achievementService.endSession();
      
      // Check all achievements comprehensively
      await achievementService.checkAllAchievements();
      
      // Get pending achievements and show them
      const pendingAchievements = await achievementService.getPendingNotifications();
      if (pendingAchievements.length > 0) {
        setAchievementQueue(pendingAchievements);
        showNextAchievement(pendingAchievements);
      } else {
        // No achievements, go to summary
        navigation.navigate('Summary', {
          accuracy: result.accuracy,
          wordsReviewed: result.wordsReviewed,
          correctAnswers: result.correctAnswers,
          streak: result.streak || null
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
    
    // Mark as shown
    if (currentAchievement) {
      await achievementService.markNotificationShown(currentAchievement.id);
    }
    
    // Show next achievement or navigate to summary
    const remainingQueue = achievementQueue.slice(1);
    setAchievementQueue(remainingQueue);
    
    if (remainingQueue.length > 0) {
      setTimeout(() => {
        showNextAchievement(remainingQueue);
      }, 300);
    } else {
      // All achievements shown, navigate to summary
      navigation.navigate('Summary', {
        accuracy: (correctCount / words.length) * 100,
        wordsReviewed: words.length,
        correctAnswers: correctCount,
        streak: null // Will be fetched in Summary screen
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

  if (!question) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentIndex + 1) / words.length) * 100}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {words.length}
          </Text>
        </View>

        <Animated.View style={[
          styles.questionContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          {/* Direction indicator */}
          <Text style={styles.directionLabel}>{question.questionLabel}</Text>

          {/* Question */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{question.question}</Text>
            {/* Speaker button for pronunciation - always works on tap */}
            <TouchableOpacity
              style={styles.speakerButton}
              onPress={async () => {
                hapticService.light();
                const targetLang = question.word?.target_lang || 'es';
                const langCode = ttsService.getLanguageCode(targetLang);
                await ttsService.speak(question.question, langCode, { force: true });
              }}
            >
              <Text style={styles.speakerIcon}>🔊</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.instructionText}>Select the correct translation:</Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {question.options.map((option, index) => {
              const isSelected = selectedOption?.id === option.id;
              const isCorrect = option.isCorrect;
              
              let buttonStyle = styles.optionButton;
              let textStyle = styles.optionText;
              
              if (showFeedback) {
                if (isCorrect) {
                  buttonStyle = styles.optionButtonCorrect;
                  textStyle = styles.optionTextCorrect;
                } else if (isSelected && !isCorrect) {
                  buttonStyle = styles.optionButtonIncorrect;
                  textStyle = styles.optionTextIncorrect;
                }
              }
              
              return (
                <TouchableOpacity
                  key={option.id}
                  style={buttonStyle}
                  onPress={() => handleOptionPress(option)}
                  disabled={showFeedback}
                >
                  <Text style={textStyle}>{option.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Next button */}
          {showFeedback && (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex < words.length - 1 ? 'Next →' : 'Finish'}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
      
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
  optionsContainer: {
    flex: 1,
  },
  optionButton: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E6ED',
  },
  optionButtonCorrect: {
    backgroundColor: '#D4EDDA',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#28A745',
  },
  optionButtonIncorrect: {
    backgroundColor: '#F8D7DA',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#DC3545',
  },
  optionText: {
    fontSize: 18,
    color: '#2C3E50',
    textAlign: 'center',
  },
  optionTextCorrect: {
    fontSize: 18,
    color: '#155724',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  optionTextIncorrect: {
    fontSize: 18,
    color: '#721C24',
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#3498DB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

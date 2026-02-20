import React, { useState, useEffect, useRef } from 'react';
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
import {
  getWordsDueForReview,
  getNewWords,
  updateWordProgress,
  createSession,
  completeSession,
} from '../services/database';
import achievementService from '../services/AchievementService';
import AchievementUnlockModal from '../components/AchievementUnlockModal';
import hapticService from '../services/HapticService';

const PAIRS_PER_ROUND = 5;
const DEFAULT_WORDS_PER_SESSION = 20;

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  hu: 'Hungarian',
};

/**
 * Shuffle an array using Fisher-Yates algorithm.
 */
const shuffleArray = (arr) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function MatchingPairsScreen({ route, navigation }) {
  const wordsPerSession = route.params?.wordsPerSession || DEFAULT_WORDS_PER_SESSION;
  const [loading, setLoading] = useState(true);
  const [allWords, setAllWords] = useState([]);
  const [roundWords, setRoundWords] = useState([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);

  // Left column items (target language words)
  const [leftItems, setLeftItems] = useState([]);
  // Right column items (source language translations), shuffled
  const [rightItems, setRightItems] = useState([]);

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState(new Set());
  const [incorrectPair, setIncorrectPair] = useState(null);

  const [sessionId, setSessionId] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [roundStartTime, setRoundStartTime] = useState(null);

  const [achievementModalVisible, setAchievementModalVisible] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [achievementQueue, setAchievementQueue] = useState([]);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    if (allWords.length > 0) {
      setupRound();
    }
  }, [allWords, roundIndex]);

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

      // Ensure we have at least PAIRS_PER_ROUND words
      if (reviewWords.length < PAIRS_PER_ROUND) {
        const extraWords = await getNewWords(PAIRS_PER_ROUND - reviewWords.length);
        reviewWords = [...reviewWords, ...extraWords];
      }

      // Deduplicate by word ID to prevent duplicate key errors
      const uniqueMap = new Map();
      for (const word of reviewWords) {
        if (!uniqueMap.has(word.id)) {
          uniqueMap.set(word.id, word);
        }
      }
      const uniqueWords = Array.from(uniqueMap.values());

      const shuffled = shuffleArray(uniqueWords);
      setAllWords(shuffled);
      setTotalRounds(Math.ceil(shuffled.length / PAIRS_PER_ROUND));
      setLoading(false);
    } catch (error) {
      console.error('Error initializing matching session:', error);
      setLoading(false);
    }
  };

  const setupRound = () => {
    const start = roundIndex * PAIRS_PER_ROUND;
    const end = Math.min(start + PAIRS_PER_ROUND, allWords.length);
    const wordsForRound = allWords.slice(start, end);

    if (wordsForRound.length === 0) {
      finishSession();
      return;
    }

    const left = wordsForRound.map((w) => ({
      id: w.id,
      text: w.word,
      wordObj: w,
    }));
    const right = shuffleArray(
      wordsForRound.map((w) => ({
        id: w.id,
        text: w.translation,
        wordObj: w,
      }))
    );

    setRoundWords(wordsForRound);
    setLeftItems(left);
    setRightItems(right);
    setMatchedPairs(new Set());
    setSelectedLeft(null);
    setSelectedRight(null);
    setIncorrectPair(null);
    setRoundStartTime(Date.now());

    // Entrance animation
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const handleLeftPress = (item) => {
    if (matchedPairs.has(item.id)) return;
    hapticService.light();
    setIncorrectPair(null);
    setSelectedLeft(item);

    if (selectedRight) {
      checkMatch(item, selectedRight);
    }
  };

  const handleRightPress = (item) => {
    if (matchedPairs.has(item.id)) return;
    hapticService.light();
    setIncorrectPair(null);
    setSelectedRight(item);

    if (selectedLeft) {
      checkMatch(selectedLeft, item);
    }
  };

  const checkMatch = async (leftItem, rightItem) => {
    setTotalAttempts((prev) => prev + 1);
    const isMatch = leftItem.id === rightItem.id;

    if (isMatch) {
      hapticService.success();
      const newMatched = new Set(matchedPairs);
      newMatched.add(leftItem.id);
      setMatchedPairs(newMatched);
      setSelectedLeft(null);
      setSelectedRight(null);
      setCorrectCount((prev) => prev + 1);

      // Update word progress
      const responseTime = Date.now() - roundStartTime;
      try {
        await updateWordProgress(leftItem.id, true, responseTime);
        await achievementService.trackWordPractice(
          leftItem.wordObj.id,
          leftItem.wordObj.category,
          true
        );
      } catch (error) {
        console.error('Error updating word progress:', error);
      }

      // Check if round is complete
      if (newMatched.size === leftItems.length) {
        setTimeout(() => advanceRound(), 600);
      }
    } else {
      hapticService.error();
      setIncorrectPair({ left: leftItem.id, right: rightItem.id });

      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();

      // Record incorrect attempts for both words
      try {
        await updateWordProgress(leftItem.id, false, 0);
        await achievementService.trackWordPractice(
          leftItem.wordObj.id,
          leftItem.wordObj.category,
          false
        );
      } catch (error) {
        console.error('Error updating word progress:', error);
      }

      // Clear selection after a brief delay so the user can see the error
      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
        setIncorrectPair(null);
      }, 800);
    }
  };

  const advanceRound = () => {
    const nextRound = roundIndex + 1;
    if (nextRound * PAIRS_PER_ROUND < allWords.length) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setRoundIndex(nextRound);
      });
    } else {
      finishSession();
    }
  };

  const finishSession = async () => {
    try {
      const result = await completeSession(sessionId, allWords.length, correctCount);

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
        accuracy: allWords.length > 0 ? (correctCount / allWords.length) * 100 : 0,
        wordsReviewed: allWords.length,
        correctAnswers: correctCount,
        streak: null,
      });
    }
  };

  // --- Derive language labels from the first word ---
  const targetLangName =
    allWords.length > 0
      ? LANGUAGE_NAMES[allWords[0].target_lang] || allWords[0].target_lang
      : '';
  const sourceLangName =
    allWords.length > 0
      ? LANGUAGE_NAMES[allWords[0].source_lang] || allWords[0].source_lang
      : '';

  // --- Render helpers ---

  const getLeftItemStyle = (item) => {
    if (matchedPairs.has(item.id)) return styles.itemMatched;
    if (incorrectPair?.left === item.id) return styles.itemIncorrect;
    if (selectedLeft?.id === item.id) return styles.itemSelected;
    return styles.item;
  };

  const getRightItemStyle = (item) => {
    if (matchedPairs.has(item.id)) return styles.itemMatched;
    if (incorrectPair?.right === item.id) return styles.itemIncorrect;
    if (selectedRight?.id === item.id) return styles.itemSelected;
    return styles.item;
  };

  const getLeftTextStyle = (item) => {
    if (matchedPairs.has(item.id)) return styles.itemTextMatched;
    if (incorrectPair?.left === item.id) return styles.itemTextIncorrect;
    if (selectedLeft?.id === item.id) return styles.itemTextSelected;
    return styles.itemText;
  };

  const getRightTextStyle = (item) => {
    if (matchedPairs.has(item.id)) return styles.itemTextMatched;
    if (incorrectPair?.right === item.id) return styles.itemTextIncorrect;
    if (selectedRight?.id === item.id) return styles.itemTextSelected;
    return styles.itemText;
  };

  // --- Loading / empty states ---

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E53935" />
          <Text style={styles.loadingText}>Preparing matching pairs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (allWords.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No words available!</Text>
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

  const overallProgress =
    allWords.length > 0
      ? ((roundIndex * PAIRS_PER_ROUND + matchedPairs.size) / allWords.length) * 100
      : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(overallProgress, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Round {roundIndex + 1} / {totalRounds}
          </Text>
        </View>

        {/* Instructions */}
        <Text style={styles.instructionText}>
          Match each word with its translation
        </Text>

        {/* Column headers */}
        <View style={styles.columnHeaders}>
          <Text style={styles.columnHeaderText}>{targetLangName}</Text>
          <Text style={styles.columnHeaderText}>{sourceLangName}</Text>
        </View>

        {/* Matching columns */}
        <Animated.View
          style={[
            styles.columnsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.columnsScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.columns}>
              {/* Left column: target language words */}
              <View style={styles.column}>
                {leftItems.map((item) => (
                  <TouchableOpacity
                    key={`left-${item.id}`}
                    style={getLeftItemStyle(item)}
                    onPress={() => handleLeftPress(item)}
                    disabled={matchedPairs.has(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={getLeftTextStyle(item)}>{item.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Right column: source language translations */}
              <View style={styles.column}>
                {rightItems.map((item) => (
                  <TouchableOpacity
                    key={`right-${item.id}`}
                    style={getRightItemStyle(item)}
                    onPress={() => handleRightPress(item)}
                    disabled={matchedPairs.has(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={getRightTextStyle(item)}>{item.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Score indicator */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>
            Matched: {matchedPairs.size} / {leftItems.length}
          </Text>
        </View>
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
    backgroundColor: '#E53935',
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
    marginBottom: 16,
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
    backgroundColor: '#E53935',
  },
  progressText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 12,
  },
  columnHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  columnHeaderText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#E53935',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
  },
  columnsContainer: {
    flex: 1,
  },
  columnsScroll: {
    flexGrow: 1,
  },
  columns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    marginHorizontal: 6,
  },
  item: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#E0E6ED',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  itemSelected: {
    backgroundColor: '#FDEBEB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  itemMatched: {
    backgroundColor: '#D4EDDA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#28A745',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    opacity: 0.6,
  },
  itemIncorrect: {
    backgroundColor: '#F8D7DA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#DC3545',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  itemText: {
    fontSize: 16,
    color: '#2C3E50',
    textAlign: 'center',
    fontWeight: '500',
  },
  itemTextSelected: {
    fontSize: 16,
    color: '#C62828',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  itemTextMatched: {
    fontSize: 16,
    color: '#155724',
    textAlign: 'center',
    fontWeight: '600',
  },
  itemTextIncorrect: {
    fontSize: 16,
    color: '#721C24',
    textAlign: 'center',
    fontWeight: '500',
  },
  scoreContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 15,
    color: '#7F8C8D',
    fontWeight: '600',
  },
});

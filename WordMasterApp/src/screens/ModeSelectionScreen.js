import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WORD_COUNT_OPTIONS = [20, 50, 100];

export default function ModeSelectionScreen({ navigation }) {
  const [wordsPerSession, setWordsPerSession] = useState(20);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Choose Exercise</Text>
        <Text style={styles.subtitle}>
          Pick how you want to practice your vocabulary
        </Text>

        {/* Word count selector */}
        <View style={styles.wordCountSection}>
          <Text style={styles.wordCountLabel}>Words per session</Text>
          <View style={styles.wordCountRow}>
            {WORD_COUNT_OPTIONS.map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.wordCountPill,
                  wordsPerSession === count && styles.wordCountPillActive,
                ]}
                onPress={() => setWordsPerSession(count)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.wordCountPillText,
                    wordsPerSession === count && styles.wordCountPillTextActive,
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Multiple Choice */}
        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => navigation.navigate('Learning', { wordsPerSession })}
          activeOpacity={0.8}
        >
          <View style={styles.modeIconContainer}>
            <Text style={styles.modeIcon}>ABCD</Text>
          </View>
          <View style={styles.modeInfo}>
            <Text style={styles.modeName}>Multiple Choice</Text>
            <Text style={styles.modeDescription}>
              See a word and pick the correct translation from four options.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Matching Pairs */}
        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => navigation.navigate('MatchingPairs', { wordsPerSession })}
          activeOpacity={0.8}
        >
          <View style={[styles.modeIconContainer, styles.modeIconMatching]}>
            <Text style={styles.modeIcon}>||</Text>
          </View>
          <View style={styles.modeInfo}>
            <Text style={styles.modeName}>Matching Pairs</Text>
            <Text style={styles.modeDescription}>
              Two columns of words -- match each word with its translation.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Type Translation */}
        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => navigation.navigate('TypeTranslation', { wordsPerSession })}
          activeOpacity={0.8}
        >
          <View style={[styles.modeIconContainer, styles.modeIconTyping]}>
            <Text style={styles.modeIcon}>⌨</Text>
          </View>
          <View style={styles.modeInfo}>
            <Text style={styles.modeName}>Type Translation</Text>
            <Text style={styles.modeDescription}>
              See a word and type the correct translation yourself.
            </Text>
          </View>
        </TouchableOpacity>
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
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  wordCountSection: {
    marginBottom: 28,
  },
  wordCountLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 12,
  },
  wordCountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  wordCountPill: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'white',
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: '#E0E6ED',
  },
  wordCountPillActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  wordCountPillText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7F8C8D',
  },
  wordCountPillTextActive: {
    color: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 40,
  },
  modeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#E0E6ED',
  },
  modeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FDEBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeIconMatching: {
    backgroundColor: '#E8F8F5',
  },
  modeIconTyping: {
    backgroundColor: '#EDE7F6',
  },
  modeIcon: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E53935',
  },
  modeInfo: {
    flex: 1,
  },
  modeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
});

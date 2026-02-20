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

        {/* Fill in the Blank */}
        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => navigation.navigate('FillInBlank', { wordsPerSession })}
          activeOpacity={0.8}
        >
          <View style={[styles.modeIconContainer, styles.modeIconGrammar]}>
            <Text style={styles.modeIcon}>_ab</Text>
          </View>
          <View style={styles.modeInfo}>
            <Text style={styles.modeName}>Fill in the Blank</Text>
            <Text style={styles.modeDescription}>
              Complete sentences by choosing the correct missing word. Trains grammar in context.
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
    padding: 16,
    justifyContent: 'center',
  },
  wordCountSection: {
    marginBottom: 18,
  },
  wordCountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  wordCountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  wordCountPill: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 18,
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#7F8C8D',
  },
  wordCountPillTextActive: {
    color: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 20,
  },
  modeCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#E0E6ED',
  },
  modeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FDEBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modeIconMatching: {
    backgroundColor: '#E8F8F5',
  },
  modeIconTyping: {
    backgroundColor: '#EDE7F6',
  },
  modeIconGrammar: {
    backgroundColor: '#F3E5F5',
  },
  modeIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E53935',
  },
  modeInfo: {
    flex: 1,
  },
  modeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  modeDescription: {
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
  },
});

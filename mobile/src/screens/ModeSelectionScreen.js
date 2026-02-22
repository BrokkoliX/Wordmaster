import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllCategories } from '../services/database';

const WORD_COUNT_OPTIONS = [20, 50, 100];

export default function ModeSelectionScreen({ navigation }) {
  const [wordsPerSession, setWordsPerSession] = useState(20);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await getAllCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const navParams = { wordsPerSession, category: selectedCategory };

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);
  const categoryLabel =
    selectedCategory === 'all'
      ? 'All Categories'
      : selectedCategoryObj?.name || selectedCategory;

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

        {/* Category selector */}
        <View style={styles.categorySection}>
          <Text style={styles.wordCountLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            <TouchableOpacity
              style={[
                styles.categoryPill,
                selectedCategory === 'all' && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory('all')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === 'all' && styles.categoryPillTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  selectedCategory === cat.id && styles.categoryPillActive,
                  selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategory === cat.id && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.icon} {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Multiple Choice */}
        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => navigation.navigate('Learning', navParams)}
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
          onPress={() => navigation.navigate('MatchingPairs', navParams)}
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
          onPress={() => navigation.navigate('TypeTranslation', navParams)}
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
          onPress={() => navigation.navigate('FillInBlank', navParams)}
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
  categorySection: {
    marginBottom: 18,
  },
  categoryRow: {
    paddingHorizontal: 2,
  },
  categoryPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'white',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#E0E6ED',
  },
  categoryPillActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  categoryPillTextActive: {
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

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView
} from 'react-native';
import hapticService from '../services/HapticService';

const FAQ_ITEMS = [
  {
    id: 1,
    question: 'How does spaced repetition work?',
    answer: 'WordMaster uses the SM-2 algorithm to show you words at optimal intervals. When you answer correctly, the interval increases. When you miss a word, we show it more frequently until you master it.'
  },
  {
    id: 2,
    question: 'What are CEFR levels?',
    answer: 'CEFR (Common European Framework) levels range from A1 (beginner) to C2 (mastery). Start with A1 if you\'re new to Spanish, or choose a higher level if you have experience.'
  },
  {
    id: 3,
    question: 'How do streaks work?',
    answer: 'Complete at least one learning session per day to maintain your streak. Streaks reset if you miss a day, but your longest streak is always saved!'
  },
  {
    id: 4,
    question: 'What are achievements?',
    answer: 'Achievements reward your progress! There are 32 achievements across 7 categories, from first steps to legendary streaks. Each achievement awards points and recognition.'
  },
  {
    id: 5,
    question: 'How many words should I learn per day?',
    answer: 'We recommend 20 words per session. Consistency is more important than quantity - daily practice with 20 words is better than cramming 100 words once a week.'
  },
  {
    id: 6,
    question: 'What does confidence level mean?',
    answer: 'Confidence level (0-100) shows how well you know a word. It increases with correct answers and time. Words reach "mastered" status at 71+ confidence.'
  },
  {
    id: 7,
    question: 'Can I use the app offline?',
    answer: 'Yes! WordMaster works 100% offline. All 6,423 words are stored locally on your device, so you can learn anywhere, anytime.'
  },
  {
    id: 8,
    question: 'How do I change my CEFR level?',
    answer: 'Go to Settings (⚙️ icon) and select your desired CEFR level. Your progress in other levels is saved, so you can switch freely.'
  },
];

export default function HelpScreen({ navigation }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    hapticService.light();
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>❓ Help & FAQ</Text>
          <Text style={styles.headerSubtitle}>
            Everything you need to know about WordMaster
          </Text>
        </View>

        {/* Quick Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Quick Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>🎯</Text>
            <Text style={styles.tipText}>
              Practice daily for best results - even 5 minutes helps!
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>🔊</Text>
            <Text style={styles.tipText}>
              Tap the speaker icon to hear word pronunciation
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>🏆</Text>
            <Text style={styles.tipText}>
              Check achievements to see your progress and goals
            </Text>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Frequently Asked Questions</Text>
          {FAQ_ITEMS.map((item) => (
            <View key={item.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQuestionText}>{item.question}</Text>
                <Text style={styles.faqIcon}>
                  {expandedId === item.id ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
              {expandedId === item.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{item.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Features Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Features</Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• 6,423 Spanish-English words</Text>
            <Text style={styles.featureItem}>• Spaced Repetition (SM-2 algorithm)</Text>
            <Text style={styles.featureItem}>• CEFR levels A1-C2</Text>
            <Text style={styles.featureItem}>• 32 achievements</Text>
            <Text style={styles.featureItem}>• Daily streak tracking</Text>
            <Text style={styles.featureItem}>• Text-to-speech pronunciation</Text>
            <Text style={styles.featureItem}>• 100% offline functionality</Text>
            <Text style={styles.featureItem}>• 52 themed categories</Text>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📧 Need More Help?</Text>
          <Text style={styles.contactText}>
            Have questions or feedback? We'd love to hear from you!
          </Text>
          <TouchableOpacity style={styles.contactButton}>
            <Text style={styles.contactButtonText}>Send Feedback</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>WordMaster v1.0</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ for language learners</Text>
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
  header: {
    backgroundColor: '#3498DB',
    padding: 30,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tipEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22,
  },
  faqItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginRight: 12,
  },
  faqIcon: {
    fontSize: 14,
    color: '#3498DB',
  },
  faqAnswer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  faqAnswerText: {
    fontSize: 15,
    color: '#7F8C8D',
    lineHeight: 22,
  },
  featureList: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureItem: {
    fontSize: 15,
    color: '#2C3E50',
    marginBottom: 10,
    lineHeight: 22,
  },
  contactText: {
    fontSize: 15,
    color: '#7F8C8D',
    marginBottom: 16,
    lineHeight: 22,
  },
  contactButton: {
    backgroundColor: '#3498DB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 30,
  },
  footerText: {
    fontSize: 14,
    color: '#95A5A6',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#BDC3C7',
    marginTop: 4,
  },
});

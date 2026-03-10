import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMistakes, getMistakeSummary } from '../services/mistakeJournalService';

export default function MistakeJournalScreen({ navigation }) {
  const [mistakes, setMistakes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [mistakeList, summaryData] = await Promise.all([
        getMistakes(50),
        getMistakeSummary(),
      ]);
      setMistakes(mistakeList);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading mistake data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handlePracticeMistakes = () => {
    navigation.navigate('Learn', {
      screen: 'Learning',
      params: { source: 'mistakes', wordsPerSession: Math.min(mistakes.length, 20) },
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'mastered':
      case 'retired':
        return '#27AE60';
      case 'familiar':
        return '#F39C12';
      case 'learning':
        return '#3498DB';
      default:
        return '#E74C3C';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Analyzing your mistakes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (mistakes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>No mistakes yet!</Text>
          <Text style={styles.emptySubtitle}>
            Keep practicing and any words you get wrong will appear here for focused review.
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => navigation.navigate('Learn', { screen: 'ModeSelection' })}
          >
            <Text style={styles.startButtonText}>Start Learning</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Card */}
        {summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Mistake Overview</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryNumber}>{summary.totalMistakeWords}</Text>
                <Text style={styles.summaryLabel}>Words</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryNumber}>{summary.totalIncorrectAnswers}</Text>
                <Text style={styles.summaryLabel}>Total Errors</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryNumber}>{summary.avgErrorRate}%</Text>
                <Text style={styles.summaryLabel}>Avg Error Rate</Text>
              </View>
            </View>
            {summary.worstCategory && (
              <Text style={styles.summaryDetail}>
                Hardest category: {summary.worstCategory.icon} {summary.worstCategory.name}
              </Text>
            )}
            {summary.worstLevel && (
              <Text style={styles.summaryDetail}>
                Most errors at: {summary.worstLevel.level} level
              </Text>
            )}
          </View>
        )}

        {/* Practice Button */}
        <TouchableOpacity style={styles.practiceButton} onPress={handlePracticeMistakes}>
          <Text style={styles.practiceButtonText}>Practice Mistakes</Text>
          <Text style={styles.practiceButtonSub}>
            Review your {Math.min(mistakes.length, 20)} most-missed words
          </Text>
        </TouchableOpacity>

        {/* Mistake List */}
        <Text style={styles.sectionTitle}>
          All Mistakes ({mistakes.length})
        </Text>

        {mistakes.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.wordCard}
              onPress={() => setExpandedId(isExpanded ? null : item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.wordHeader}>
                <View style={styles.wordMain}>
                  <Text style={styles.wordText}>{item.word}</Text>
                  <Text style={styles.translationText}>{item.translation}</Text>
                </View>
                <View style={styles.wordStats}>
                  <Text style={styles.errorRateText}>{item.error_rate}%</Text>
                  <Text style={styles.errorRateLabel}>errors</Text>
                </View>
              </View>

              {isExpanded && (
                <View style={styles.wordDetail}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Times shown:</Text>
                    <Text style={styles.detailValue}>{item.times_shown}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Correct:</Text>
                    <Text style={[styles.detailValue, { color: '#27AE60' }]}>{item.times_correct}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Incorrect:</Text>
                    <Text style={[styles.detailValue, { color: '#E74C3C' }]}>{item.times_incorrect}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '22' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Level:</Text>
                    <Text style={styles.detailValue}>{item.cefr_level}</Text>
                  </View>
                  {item.last_reviewed_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Last reviewed:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(item.last_reviewed_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 30 }} />
      </ScrollView>
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
    padding: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryCard: {
    backgroundColor: '#E74C3C',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  summaryDetail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  practiceButton: {
    backgroundColor: '#3498DB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  practiceButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  practiceButtonSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34495E',
    marginBottom: 12,
  },
  wordCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordMain: {
    flex: 1,
  },
  wordText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  translationText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 2,
  },
  wordStats: {
    alignItems: 'center',
    marginLeft: 12,
  },
  errorRateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  errorRateLabel: {
    fontSize: 11,
    color: '#95A5A6',
  },
  wordDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECF0F1',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

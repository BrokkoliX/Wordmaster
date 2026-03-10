import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import analyticsService from '../services/analyticsService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const STATUS_COLORS = {
  unseen: '#BDC3C7',
  new: '#95A5A6',
  learning: '#3498DB',
  familiar: '#F39C12',
  mastered: '#27AE60',
  retired: '#8E44AD',
};

export default function AnalyticsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const snapshot = await analyticsService.getAnalyticsSnapshot();
      setData(snapshot);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.loadingText}>Crunching your numbers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { velocity, cefrProgress, categoryPerformance, distribution, weeklyStats, accuracyTrend } = data;

  // Weekly chart: max value for scaling
  const maxWeeklyWords = Math.max(...weeklyStats.map(w => w.words_reviewed || 0), 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Velocity Card */}
        <View style={styles.velocityCard}>
          <Text style={styles.velocityTitle}>Learning Velocity</Text>
          <View style={styles.velocityRow}>
            <View style={styles.velocityStat}>
              <Text style={styles.velocityNumber}>{velocity.wordsPerDay}</Text>
              <Text style={styles.velocityLabel}>words/day</Text>
            </View>
            <View style={styles.velocityDivider} />
            <View style={styles.velocityStat}>
              <Text style={styles.velocityNumber}>{velocity.totalMastered}</Text>
              <Text style={styles.velocityLabel}>mastered</Text>
            </View>
            <View style={styles.velocityDivider} />
            <View style={styles.velocityStat}>
              <Text style={styles.velocityNumber}>{velocity.remaining}</Text>
              <Text style={styles.velocityLabel}>remaining</Text>
            </View>
          </View>
          {velocity.estimatedDays && (
            <Text style={styles.velocityEstimate}>
              At this pace, ~{velocity.estimatedDays} days to master all words
            </Text>
          )}
        </View>

        {/* Weekly Activity */}
        {weeklyStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Activity</Text>
            <View style={styles.chartContainer}>
              {weeklyStats.map((week, i) => (
                <View key={i} style={styles.barColumn}>
                  <Text style={styles.barValue}>{week.words_reviewed || 0}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${((week.words_reviewed || 0) / maxWeeklyWords) * 100}%`,
                          backgroundColor: '#3498DB',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>W{i + 1}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Accuracy Trend */}
        {accuracyTrend.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accuracy Trend (30 days)</Text>
            <View style={styles.trendContainer}>
              {accuracyTrend.map((point, i) => {
                const height = Math.max(point.accuracy, 5);
                const color = point.accuracy >= 80 ? '#27AE60' :
                              point.accuracy >= 60 ? '#F39C12' : '#E74C3C';
                return (
                  <View
                    key={i}
                    style={[
                      styles.trendBar,
                      {
                        height: `${height}%`,
                        backgroundColor: color,
                        width: Math.max((SCREEN_WIDTH - 64) / accuracyTrend.length - 1, 2),
                      },
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.trendLabels}>
              <Text style={styles.trendLabel}>{accuracyTrend[0]?.date?.slice(5)}</Text>
              <Text style={styles.trendLabel}>
                {accuracyTrend[accuracyTrend.length - 1]?.date?.slice(5)}
              </Text>
            </View>
          </View>
        )}

        {/* Word Status Distribution */}
        {distribution.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Word Status Distribution</Text>
            <View style={styles.distContainer}>
              {distribution
                .filter(d => d.count > 0)
                .map((d) => {
                  const total = distribution.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                  return (
                    <View key={d.status} style={styles.distRow}>
                      <View style={styles.distLabel}>
                        <View style={[styles.distDot, { backgroundColor: STATUS_COLORS[d.status] || '#BDC3C7' }]} />
                        <Text style={styles.distText}>{d.status}</Text>
                      </View>
                      <View style={styles.distBarTrack}>
                        <View
                          style={[
                            styles.distBarFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: STATUS_COLORS[d.status] || '#BDC3C7',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.distCount}>{d.count}</Text>
                    </View>
                  );
                })}
            </View>
          </View>
        )}

        {/* CEFR Progress */}
        {cefrProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CEFR Level Progress</Text>
            {cefrProgress.map((level) => {
              const pct = level.total_words > 0
                ? Math.round((level.mastered / level.total_words) * 100) : 0;
              return (
                <View key={level.cefr_level} style={styles.levelRow}>
                  <Text style={styles.levelLabel}>{level.cefr_level}</Text>
                  <View style={styles.levelBarTrack}>
                    <View
                      style={[styles.levelBarFill, { width: `${pct}%` }]}
                    />
                  </View>
                  <Text style={styles.levelPct}>{pct}%</Text>
                  <Text style={styles.levelAccuracy}>({level.accuracy}% acc)</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Category Performance */}
        {categoryPerformance.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Performance</Text>
            {categoryPerformance.slice(0, 10).map((cat) => {
              const accColor = cat.accuracy >= 80 ? '#27AE60' :
                               cat.accuracy >= 60 ? '#F39C12' : '#E74C3C';
              return (
                <TouchableOpacity
                  key={cat.category}
                  style={styles.catCard}
                  onPress={() => navigation.navigate('Learn', {
                    screen: 'Learning',
                    params: { category: cat.category, wordsPerSession: 20 },
                  })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.catIcon}>{cat.category_icon || '📁'}</Text>
                  <View style={styles.catInfo}>
                    <Text style={styles.catName} numberOfLines={1}>
                      {cat.category_name || cat.category}
                    </Text>
                    <Text style={styles.catMeta}>
                      {cat.total_words} words, {cat.mastered} mastered
                    </Text>
                  </View>
                  <View style={[styles.catAccBadge, { backgroundColor: accColor + '22' }]}>
                    <Text style={[styles.catAccText, { color: accColor }]}>
                      {cat.accuracy}%
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#7F8C8D' },
  velocityCard: {
    backgroundColor: '#3498DB',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  velocityTitle: { fontSize: 16, fontWeight: 'bold', color: 'white', marginBottom: 12 },
  velocityRow: { flexDirection: 'row', marginBottom: 8 },
  velocityStat: { flex: 1, alignItems: 'center' },
  velocityNumber: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  velocityLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  velocityDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  velocityEstimate: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 8 },
  section: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2C3E50', marginBottom: 14 },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  barColumn: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 11, color: '#7F8C8D', marginBottom: 4 },
  barTrack: {
    width: 28,
    height: 80,
    backgroundColor: '#ECF0F1',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 12, color: '#95A5A6', marginTop: 4 },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 1,
  },
  trendBar: { borderRadius: 2, minHeight: 2 },
  trendLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  trendLabel: { fontSize: 11, color: '#95A5A6' },
  distContainer: { gap: 8 },
  distRow: { flexDirection: 'row', alignItems: 'center' },
  distLabel: { flexDirection: 'row', alignItems: 'center', width: 80 },
  distDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  distText: { fontSize: 13, color: '#2C3E50', textTransform: 'capitalize' },
  distBarTrack: { flex: 1, height: 12, backgroundColor: '#ECF0F1', borderRadius: 6, overflow: 'hidden', marginHorizontal: 8 },
  distBarFill: { height: '100%', borderRadius: 6 },
  distCount: { fontSize: 13, color: '#7F8C8D', width: 40, textAlign: 'right' },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  levelLabel: { fontSize: 14, fontWeight: '600', color: '#2C3E50', width: 30 },
  levelBarTrack: { flex: 1, height: 14, backgroundColor: '#ECF0F1', borderRadius: 7, overflow: 'hidden', marginHorizontal: 8 },
  levelBarFill: { height: '100%', backgroundColor: '#27AE60', borderRadius: 7 },
  levelPct: { fontSize: 13, fontWeight: '600', color: '#2C3E50', width: 32, textAlign: 'right' },
  levelAccuracy: { fontSize: 11, color: '#95A5A6', width: 60, textAlign: 'right' },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  catIcon: { fontSize: 20, marginRight: 10 },
  catInfo: { flex: 1 },
  catName: { fontSize: 14, fontWeight: '600', color: '#2C3E50' },
  catMeta: { fontSize: 12, color: '#95A5A6', marginTop: 1 },
  catAccBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catAccText: { fontSize: 13, fontWeight: '600' },
});

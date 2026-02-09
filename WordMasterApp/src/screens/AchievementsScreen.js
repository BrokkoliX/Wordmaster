import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import achievementService from '../services/AchievementService';

const { width } = Dimensions.get('window');

const RARITY_COLORS = {
  common: '#9CA3AF',      // Gray
  uncommon: '#10B981',    // Green
  rare: '#3B82F6',        // Blue
  epic: '#8B5CF6',        // Purple
  legendary: '#F59E0B'    // Gold
};

const RARITY_LABELS = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
};

const CATEGORY_NAMES = {
  first_steps: '🌱 First Steps',
  streaks: '🔥 Streak Warriors',
  mastery: '📚 Word Mastery',
  speed: '⚡ Speed Learning',
  accuracy: '🎯 Perfect Performance',
  explorer: '🌍 Language Explorer',
  special: '✨ Special'
};

function AchievementsScreen({ navigation }) {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unlocked', 'locked'
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const [achievementsData, statsData] = await Promise.all([
        achievementService.getAllUserAchievements(),
        achievementService.getStats()
      ]);
      
      setAchievements(achievementsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAchievements = () => {
    let filtered = achievements;

    // Filter by unlock status
    if (filter === 'unlocked') {
      filtered = filtered.filter(a => a.unlocked);
    } else if (filter === 'locked') {
      filtered = filtered.filter(a => !a.unlocked);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(a => a.category === categoryFilter);
    }

    // Hide hidden achievements if locked
    filtered = filtered.filter(a => !a.hidden || a.unlocked);

    return filtered;
  };

  const groupByCategory = (achievementsList) => {
    const grouped = {};
    achievementsList.forEach(ach => {
      if (!grouped[ach.category]) {
        grouped[ach.category] = [];
      }
      grouped[ach.category].push(ach);
    });
    return grouped;
  };

  const renderAchievementCard = (achievement) => {
    const rarityColor = RARITY_COLORS[achievement.rarity] || '#9CA3AF';
    const isUnlocked = achievement.unlocked;
    const progressPercent = achievement.progressMax > 0 
      ? Math.min(100, (achievement.progress / achievement.progressMax) * 100)
      : 0;

    return (
      <View
        key={achievement.id}
        style={[
          styles.achievementCard,
          { borderLeftColor: rarityColor },
          !isUnlocked && styles.lockedCard
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.icon, !isUnlocked && styles.lockedIcon]}>
            {achievement.icon}
          </Text>
          <View style={styles.cardInfo}>
            <Text style={[styles.title, !isUnlocked && styles.lockedText]}>
              {achievement.title}
            </Text>
            <Text style={[styles.description, !isUnlocked && styles.lockedText]}>
              {achievement.description}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.rarityBadge}>
            <Text style={[styles.rarityText, { color: rarityColor }]}>
              {RARITY_LABELS[achievement.rarity]}
            </Text>
          </View>
          <Text style={styles.points}>
            {achievement.points} pts
          </Text>
        </View>

        {!isUnlocked && progressPercent > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%`, backgroundColor: rarityColor }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progressPercent)}%
            </Text>
          </View>
        )}

        {isUnlocked && achievement.unlocked_at && (
          <Text style={styles.unlockedDate}>
            Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  const renderCategorySection = (category, categoryAchievements) => {
    const unlockedCount = categoryAchievements.filter(a => a.unlocked).length;
    const totalCount = categoryAchievements.length;

    return (
      <View key={category} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>
            {CATEGORY_NAMES[category] || category}
          </Text>
          <Text style={styles.categoryProgress}>
            {unlockedCount}/{totalCount}
          </Text>
        </View>
        {categoryAchievements.map(achievement => renderAchievementCard(achievement))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading achievements...</Text>
      </View>
    );
  }

  const filteredAchievements = getFilteredAchievements();
  const groupedAchievements = groupByCategory(filteredAchievements);

  return (
    <View style={styles.container}>
      {/* Header with Stats */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Achievements</Text>
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.unlocked}</Text>
              <Text style={styles.statLabel}>Unlocked</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.percentComplete}%</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalPoints.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'unlocked' && styles.filterButtonActive]}
            onPress={() => setFilter('unlocked')}
          >
            <Text style={[styles.filterText, filter === 'unlocked' && styles.filterTextActive]}>
              Unlocked
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'locked' && styles.filterButtonActive]}
            onPress={() => setFilter('locked')}
          >
            <Text style={[styles.filterText, filter === 'locked' && styles.filterTextActive]}>
              Locked
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Achievement List */}
      <ScrollView style={styles.scrollView}>
        {Object.keys(groupedAchievements).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {filter === 'unlocked' 
                ? 'No achievements unlocked yet. Keep learning!' 
                : 'No achievements found'}
            </Text>
          </View>
        ) : (
          Object.keys(groupedAchievements)
            .sort((a, b) => {
              const orderMap = {
                first_steps: 1,
                streaks: 2,
                mastery: 3,
                speed: 4,
                accuracy: 5,
                explorer: 6,
                special: 7
              };
              return (orderMap[a] || 99) - (orderMap[b] || 99);
            })
            .map(category => 
              renderCategorySection(category, groupedAchievements[category])
            )
        )}
      </ScrollView>
    </View>
  );
}

export default React.memo(AchievementsScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280'
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statBox: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8
  },
  filterButtonActive: {
    backgroundColor: '#007AFF'
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600'
  },
  filterTextActive: {
    color: '#FFFFFF'
  },
  scrollView: {
    flex: 1
  },
  categorySection: {
    marginTop: 16,
    paddingHorizontal: 16
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827'
  },
  categoryProgress: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600'
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  lockedCard: {
    opacity: 0.6
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  icon: {
    fontSize: 40,
    marginRight: 12
  },
  lockedIcon: {
    opacity: 0.5
  },
  cardInfo: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20
  },
  lockedText: {
    color: '#9CA3AF'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F9FAFB'
  },
  rarityText: {
    fontSize: 12,
    fontWeight: '600'
  },
  points: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F59E0B'
  },
  progressContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8
  },
  progressFill: {
    height: '100%',
    borderRadius: 3
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    width: 40,
    textAlign: 'right'
  },
  unlockedDate: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 8,
    fontStyle: 'italic'
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center'
  }
});

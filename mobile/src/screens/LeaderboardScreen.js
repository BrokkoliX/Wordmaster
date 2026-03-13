import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import leaderboardService from '../services/leaderboardService';
import { getLocalTotal } from '../services/xpService';
import { syncProgressToServer } from '../services/progressSyncService';

const SCOPE_OPTIONS = [
  { key: 'all_time', label: 'All Time' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const AUDIENCE_OPTIONS = [
  { key: 'global', label: 'Global' },
  { key: 'friends', label: 'Friends' },
];

export default function LeaderboardScreen({ navigation }) {
  const { user, isGuest } = useAuth();

  const [scope, setScope] = useState('all_time');
  const [audience, setAudience] = useState('global');
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [localXp, setLocalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (isGuest) return;

    try {
      setError(null);

      const [xp, rankResult] = await Promise.all([
        getLocalTotal(),
        leaderboardService.getMyRank(scope),
      ]);
      setLocalXp(xp);
      if (rankResult.data) setMyRank(rankResult.data);

      let boardResult;
      if (audience === 'global') {
        boardResult = await leaderboardService.getGlobal(scope, 50, 0);
      } else {
        boardResult = await leaderboardService.getFriends(scope);
      }

      if (boardResult.error) {
        setError(boardResult.error);
        setLeaderboard([]);
      } else {
        setLeaderboard(boardResult.data || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [scope, audience, isGuest]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncProgressToServer().catch(() => {});
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ────────────── Renderers ──────────────

  const renderToggle = (options, selected, onSelect) => (
    <View style={styles.toggleRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.toggleButton, selected === opt.key && styles.toggleButtonActive]}
          onPress={() => onSelect(opt.key)}
        >
          <Text style={[styles.toggleText, selected === opt.key && styles.toggleTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  };

  const xpColumn = (row) => {
    if (scope === 'weekly') return row.weekly_xp;
    if (scope === 'monthly') return row.monthly_xp;
    return row.total_xp;
  };

  const renderRow = (item, isCurrentUser) => (
    <View
      key={`${item.user_id}-${item.rank}`}
      style={[styles.row, isCurrentUser && styles.rowHighlighted]}
    >
      <Text style={styles.rankText}>{renderMedal(Number(item.rank))}</Text>
      <View style={styles.userAvatar}>
        <Text style={styles.avatarText}>
          {(item.username || '?')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.username, isCurrentUser && styles.usernameHighlighted]}>
          {isCurrentUser ? 'You' : `@${item.username}`}
        </Text>
      </View>
      <Text style={styles.xpText}>{(xpColumn(item) || 0).toLocaleString()} XP</Text>
    </View>
  );

  // ────────────── Guest gate ──────────────

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestContainer}>
          <Text style={styles.guestIcon}>🏆</Text>
          <Text style={styles.guestTitle}>Sign in to compete</Text>
          <Text style={styles.guestSubtitle}>
            Create an account to earn XP and climb the leaderboard.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ────────────── Main render ──────────────

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Scope toggle */}
        {renderToggle(SCOPE_OPTIONS, scope, setScope)}

        {/* Audience toggle */}
        {renderToggle(AUDIENCE_OPTIONS, audience, setAudience)}

        {/* User card */}
        <View style={styles.userCard}>
          <Text style={styles.userCardLabel}>Your XP</Text>
          <Text style={styles.userCardXp}>{localXp.toLocaleString()}</Text>
          {myRank && (
            <Text style={styles.userCardRank}>
              Global #{myRank.globalRank}  |  Friends #{myRank.friendsRank}
            </Text>
          )}
        </View>

        {/* Leaderboard list */}
        {loading ? (
          <ActivityIndicator size="large" color="#3498DB" style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyTitle}>{error}</Text>
          </View>
        ) : leaderboard.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {audience === 'friends' ? '👥' : '🏆'}
            </Text>
            <Text style={styles.emptyTitle}>
              {audience === 'friends'
                ? 'No friends on the leaderboard yet'
                : 'No leaderboard data yet'}
            </Text>
            {audience === 'friends' && (
              <TouchableOpacity
                style={styles.findButton}
                onPress={() => navigation.navigate('Profile', { screen: 'ProfileMain' })}
              >
                <Text style={styles.findButtonText}>Find People</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {leaderboard.map((item) =>
              renderRow(item, user && item.user_id === user.id)
            )}
          </View>
        )}
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

  // Guest
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  guestIcon: { fontSize: 48, marginBottom: 16 },
  guestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Toggles
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  toggleButtonActive: {
    backgroundColor: '#3498DB',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#95A5A6',
  },
  toggleTextActive: {
    color: '#fff',
  },

  // User card
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498DB',
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  userCardLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  userCardXp: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498DB',
  },
  userCardRank: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 6,
  },

  // List
  listContainer: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  rowHighlighted: {
    borderWidth: 2,
    borderColor: '#3498DB',
    backgroundColor: '#EBF5FB',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    width: 36,
    textAlign: 'center',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D5E8F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498DB',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
  },
  usernameHighlighted: {
    color: '#3498DB',
  },
  xpText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F39C12',
    marginLeft: 8,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 12,
  },
  findButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  findButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

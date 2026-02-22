import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import followService from '../services/followService';

const TABS = {
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
  REQUESTS: 'requests',
  SEARCH: 'search',
};

export default function ProfileScreen({ navigation }) {
  const { user, isGuest } = useAuth();

  // Counts
  const [counts, setCounts] = useState({
    followers_count: 0,
    following_count: 0,
    pending_count: 0,
  });

  // Active tab
  const [activeTab, setActiveTab] = useState(TABS.FOLLOWERS);

  // Lists
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // userId being acted on

  // ------------------------------------------------------------------
  // Data fetching
  // ------------------------------------------------------------------

  const loadCounts = useCallback(async () => {
    if (isGuest) return;
    const { data } = await followService.getCounts();
    if (data) setCounts(data);
  }, [isGuest]);

  const loadFollowers = useCallback(async () => {
    if (isGuest) return;
    const { data } = await followService.getFollowers();
    if (data) setFollowers(data);
  }, [isGuest]);

  const loadFollowing = useCallback(async () => {
    if (isGuest) return;
    const { data } = await followService.getFollowing();
    if (data) setFollowing(data);
  }, [isGuest]);

  const loadPendingRequests = useCallback(async () => {
    if (isGuest) return;
    const { data } = await followService.getPendingRequests();
    if (data) setPendingRequests(data);
  }, [isGuest]);

  const loadSentRequests = useCallback(async () => {
    if (isGuest) return;
    const { data } = await followService.getSentRequests();
    if (data) setSentRequests(data);
  }, [isGuest]);

  const loadActiveTab = useCallback(async () => {
    setLoading(true);
    try {
      await loadCounts();
      switch (activeTab) {
        case TABS.FOLLOWERS:
          await loadFollowers();
          break;
        case TABS.FOLLOWING:
          await loadFollowing();
          break;
        case TABS.REQUESTS:
          await Promise.all([loadPendingRequests(), loadSentRequests()]);
          break;
        default:
          break;
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadCounts, loadFollowers, loadFollowing, loadPendingRequests, loadSentRequests]);

  useEffect(() => {
    loadActiveTab();
  }, [loadActiveTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActiveTab();
    setRefreshing(false);
  }, [loadActiveTab]);

  // ------------------------------------------------------------------
  // Search
  // ------------------------------------------------------------------

  const handleSearch = useCallback(async (text) => {
    setSearchQuery(text);
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    const { data, error } = await followService.searchUsers(text.trim());
    setSearchLoading(false);
    if (error) {
      console.error('Search error:', error);
      return;
    }
    setSearchResults(data || []);
  }, []);

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  const handleFollow = async (userId) => {
    setActionLoading(userId);
    const { error } = await followService.followUser(userId);
    setActionLoading(null);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    Alert.alert('Sent', 'Follow request sent.');
    await loadCounts();
    // Refresh search results to reflect new state
    if (searchQuery.trim().length >= 2) {
      await handleSearch(searchQuery);
    }
  };

  const handleUnfollow = async (userId) => {
    Alert.alert('Unfollow', 'Are you sure you want to unfollow this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unfollow',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(userId);
          const { error } = await followService.unfollowUser(userId);
          setActionLoading(null);
          if (error) {
            Alert.alert('Error', error);
            return;
          }
          await loadActiveTab();
        },
      },
    ]);
  };

  const handleAccept = async (userId) => {
    setActionLoading(userId);
    const { error } = await followService.acceptRequest(userId);
    setActionLoading(null);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    await loadActiveTab();
  };

  const handleReject = async (userId) => {
    setActionLoading(userId);
    const { error } = await followService.rejectRequest(userId);
    setActionLoading(null);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    await loadActiveTab();
  };

  // ------------------------------------------------------------------
  // Renderers
  // ------------------------------------------------------------------

  const displayName = (item) => {
    if (item.first_name || item.last_name) {
      return `${item.first_name || ''} ${item.last_name || ''}`.trim();
    }
    return item.username;
  };

  const avatarLetter = (item) => {
    return (item.username || item.first_name || '?')[0].toUpperCase();
  };

  const renderUserRow = (item, actions) => (
    <View style={styles.userRow} key={item.id}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{avatarLetter(item)}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.displayName}>{displayName(item)}</Text>
      </View>
      <View style={styles.actionContainer}>
        {actionLoading === item.id ? (
          <ActivityIndicator size="small" color="#3498DB" />
        ) : (
          actions
        )}
      </View>
    </View>
  );

  // ──────── Tab content ────────

  const renderFollowers = () => {
    if (followers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No followers yet</Text>
          <Text style={styles.emptySubtitle}>
            Invite friends to follow you and learn together.
          </Text>
        </View>
      );
    }

    return followers.map((item) =>
      renderUserRow(
        item,
        <TouchableOpacity
          style={styles.buttonOutline}
          onPress={() => handleUnfollow(item.id)}
        >
          <Text style={styles.buttonOutlineText}>Remove</Text>
        </TouchableOpacity>
      )
    );
  };

  const renderFollowing = () => {
    if (following.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Not following anyone</Text>
          <Text style={styles.emptySubtitle}>
            Use the Search tab to find other learners.
          </Text>
        </View>
      );
    }

    return following.map((item) =>
      renderUserRow(
        item,
        <TouchableOpacity
          style={styles.buttonDanger}
          onPress={() => handleUnfollow(item.id)}
        >
          <Text style={styles.buttonDangerText}>Unfollow</Text>
        </TouchableOpacity>
      )
    );
  };

  const renderRequests = () => {
    const hasPending = pendingRequests.length > 0;
    const hasSent = sentRequests.length > 0;

    if (!hasPending && !hasSent) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📬</Text>
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptySubtitle}>
            All caught up! New follow requests will appear here.
          </Text>
        </View>
      );
    }

    return (
      <>
        {hasPending && (
          <>
            <Text style={styles.listSectionTitle}>Incoming Requests</Text>
            {pendingRequests.map((item) =>
              renderUserRow(
                item,
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.buttonPrimary}
                    onPress={() => handleAccept(item.id)}
                  >
                    <Text style={styles.buttonPrimaryText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.buttonOutline}
                    onPress={() => handleReject(item.id)}
                  >
                    <Text style={styles.buttonOutlineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </>
        )}

        {hasSent && (
          <>
            <Text style={[styles.listSectionTitle, hasPending && { marginTop: 24 }]}>
              Sent Requests
            </Text>
            {sentRequests.map((item) =>
              renderUserRow(
                item,
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              )
            )}
          </>
        )}
      </>
    );
  };

  const renderSearch = () => (
    <>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username or name..."
          placeholderTextColor="#95A5A6"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchLoading && (
          <ActivityIndicator
            size="small"
            color="#3498DB"
            style={styles.searchSpinner}
          />
        )}
      </View>

      {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
        <Text style={styles.searchHint}>Type at least 2 characters to search.</Text>
      )}

      {searchResults.length > 0 &&
        searchResults.map((item) => {
          const isFollowed = following.some((f) => f.id === item.id);
          const isPending = sentRequests.some((r) => r.id === item.id);

          let action;
          if (isFollowed) {
            action = (
              <View style={styles.followingBadge}>
                <Text style={styles.followingBadgeText}>Following</Text>
              </View>
            );
          } else if (isPending) {
            action = (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Pending</Text>
              </View>
            );
          } else {
            action = (
              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={() => handleFollow(item.id)}
              >
                <Text style={styles.buttonPrimaryText}>Follow</Text>
              </TouchableOpacity>
            );
          }

          return renderUserRow(item, action);
        })}

      {searchQuery.trim().length >= 2 &&
        !searchLoading &&
        searchResults.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔎</Text>
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>
              Try a different username or name.
            </Text>
          </View>
        )}
    </>
  );

  // ------------------------------------------------------------------
  // Guest gate
  // ------------------------------------------------------------------

  if (isGuest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestContainer}>
          <Text style={styles.guestIcon}>🔒</Text>
          <Text style={styles.guestTitle}>Sign in to connect</Text>
          <Text style={styles.guestSubtitle}>
            Create an account to follow other learners and get followed back.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------------
  // Main render
  // ------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {(user?.username || user?.displayName || '?')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {user?.displayName || user?.username}
          </Text>
          {user?.username && (
            <Text style={styles.profileUsername}>@{user.username}</Text>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => setActiveTab(TABS.FOLLOWERS)}
          >
            <Text style={styles.statCount}>{counts.followers_count}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => setActiveTab(TABS.FOLLOWING)}
          >
            <Text style={styles.statCount}>{counts.following_count}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => setActiveTab(TABS.REQUESTS)}
          >
            <Text style={styles.statCount}>{counts.pending_count}</Text>
            <Text style={styles.statLabel}>Requests</Text>
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {[
            { key: TABS.FOLLOWERS, label: 'Followers' },
            { key: TABS.FOLLOWING, label: 'Following' },
            { key: TABS.REQUESTS, label: 'Requests' },
            { key: TABS.SEARCH, label: 'Search' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {tab.key === TABS.REQUESTS && counts.pending_count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{counts.pending_count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {loading && activeTab !== TABS.SEARCH ? (
            <ActivityIndicator
              size="large"
              color="#3498DB"
              style={{ marginTop: 40 }}
            />
          ) : (
            <>
              {activeTab === TABS.FOLLOWERS && renderFollowers()}
              {activeTab === TABS.FOLLOWING && renderFollowing()}
              {activeTab === TABS.REQUESTS && renderRequests()}
              {activeTab === TABS.SEARCH && renderSearch()}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    padding: 20,
  },

  // Guest state
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

  // Profile header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  profileUsername: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#ECF0F1',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498DB',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#95A5A6',
  },
  tabTextActive: {
    color: '#3498DB',
  },
  badge: {
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  tabContent: {
    minHeight: 200,
    paddingBottom: 30,
  },

  // Section titles inside request tab
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34495E',
    marginBottom: 12,
  },

  // User row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D5E8F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
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
  displayName: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 1,
  },
  actionContainer: {
    marginLeft: 8,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: '#BDC3C7',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  buttonOutlineText: {
    color: '#7F8C8D',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonDanger: {
    backgroundColor: '#FDEDEC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonDangerText: {
    color: '#E74C3C',
    fontSize: 13,
    fontWeight: '600',
  },

  // Request dual-action
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },

  // Status badges
  pendingBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pendingBadgeText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
  },
  followingBadge: {
    backgroundColor: '#D4EDDA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followingBadgeText: {
    color: '#155724',
    fontSize: 12,
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#2C3E50',
  },
  searchSpinner: {
    marginLeft: 8,
  },
  searchHint: {
    fontSize: 13,
    color: '#95A5A6',
    marginBottom: 12,
    textAlign: 'center',
  },

  // Empty states
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
});

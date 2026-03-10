import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import wordListService from '../services/wordListService';

export default function WordListDetailScreen({ route, navigation }) {
  const { listId, listName } = route.params;
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWords = useCallback(async () => {
    try {
      const listWords = await wordListService.getListWords(listId);
      setWords(listWords);
    } catch (error) {
      console.error('Error loading list words:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listId]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadWords();
    });
    return unsubscribe;
  }, [navigation, loadWords]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWords();
  }, [loadWords]);

  const handleRemoveWord = (wordId, wordText) => {
    Alert.alert(
      'Remove Word',
      `Remove "${wordText}" from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await wordListService.removeWordFromList(listId, wordId);
            loadWords();
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      const jsonString = await wordListService.exportList(listId);
      await Share.share({
        message: jsonString,
        title: `WordMaster List: ${listName}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not export list');
    }
  };

  const handlePractice = () => {
    if (words.length === 0) {
      Alert.alert('Empty List', 'Add some words first.');
      return;
    }
    navigation.navigate('Learn', {
      screen: 'Learning',
      params: {
        source: 'list',
        listId,
        wordsPerSession: Math.min(words.length, 20),
      },
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'mastered': case 'retired': return '#27AE60';
      case 'familiar': return '#F39C12';
      case 'learning': return '#3498DB';
      default: return '#95A5A6';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498DB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordCount}>
            {words.length} {words.length === 1 ? 'word' : 'words'}
          </Text>
          <View style={styles.headerActions}>
            {words.length > 0 && (
              <TouchableOpacity style={styles.actionBtn} onPress={handlePractice}>
                <Text style={styles.actionBtnText}>Practice</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
              <Text style={styles.exportBtnText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        {words.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No words yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the bookmark icon during practice to add words to this list.
            </Text>
          </View>
        ) : (
          words.map((item) => (
            <View key={item.id} style={styles.wordCard}>
              <View style={styles.wordInfo}>
                <Text style={styles.wordText}>{item.word}</Text>
                <Text style={styles.translationText}>{item.translation}</Text>
                <View style={styles.wordMeta}>
                  {item.cefr_level && (
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelText}>{item.cefr_level}</Text>
                    </View>
                  )}
                  {item.status && item.status !== 'new' && (
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                  )}
                  {item.times_shown > 0 && (
                    <Text style={styles.metaText}>
                      {item.times_correct}/{item.times_shown} correct
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemoveWord(item.id, item.word)}
              >
                <Text style={styles.removeBtnText}>x</Text>
              </TouchableOpacity>
            </View>
          ))
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  wordCount: { fontSize: 16, color: '#7F8C8D', fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  exportBtn: {
    borderWidth: 1.5,
    borderColor: '#BDC3C7',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  exportBtnText: { color: '#7F8C8D', fontSize: 14, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#7F8C8D', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  wordCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  wordInfo: { flex: 1 },
  wordText: { fontSize: 16, fontWeight: '600', color: '#2C3E50' },
  translationText: { fontSize: 14, color: '#7F8C8D', marginTop: 2 },
  wordMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  levelBadge: {
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: { fontSize: 11, fontWeight: '600', color: '#3498DB' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { fontSize: 12, color: '#95A5A6' },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDEDEC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeBtnText: { color: '#E74C3C', fontSize: 16, fontWeight: 'bold' },
});

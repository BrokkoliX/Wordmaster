import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import wordListService from '../services/wordListService';

const ICON_OPTIONS = ['📝', '⭐', '📚', '✈️', '🏠', '💼', '🎯', '🔥', '💎', '🌍', '🎓', '🧠'];
const COLOR_OPTIONS = ['#3498DB', '#E74C3C', '#27AE60', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E'];

export default function WordListsScreen({ navigation }) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('📝');
  const [newListColor, setNewListColor] = useState('#3498DB');

  const loadLists = useCallback(async () => {
    try {
      const allLists = await wordListService.getAllLists();
      setLists(allLists);
    } catch (error) {
      console.error('Error loading lists:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadLists();
    });
    return unsubscribe;
  }, [navigation, loadLists]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLists();
  }, [loadLists]);

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }
    try {
      await wordListService.createList(newListName.trim(), '', newListIcon, newListColor);
      setShowCreateModal(false);
      setNewListName('');
      setNewListIcon('📝');
      setNewListColor('#3498DB');
      loadLists();
    } catch (error) {
      Alert.alert('Error', 'Could not create list');
    }
  };

  const handleDeleteList = (list) => {
    if (list.id === '__favorites__') return;
    Alert.alert(
      'Delete List',
      `Are you sure you want to delete "${list.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await wordListService.deleteList(list.id);
            loadLists();
          },
        },
      ]
    );
  };

  const handlePractice = (list) => {
    if (list.word_count === 0) {
      Alert.alert('Empty List', 'Add some words to this list before practicing.');
      return;
    }
    navigation.navigate('Learn', {
      screen: 'Learning',
      params: {
        source: 'list',
        listId: list.id,
        wordsPerSession: Math.min(list.word_count, 20),
      },
    });
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
        <Text style={styles.title}>My Word Lists</Text>
        <Text style={styles.subtitle}>
          Organize and practice your vocabulary collections
        </Text>

        {lists.map((list) => (
          <TouchableOpacity
            key={list.id}
            style={styles.listCard}
            onPress={() => navigation.navigate('WordListDetail', { listId: list.id, listName: list.name })}
            onLongPress={() => handleDeleteList(list)}
            activeOpacity={0.7}
          >
            <View style={[styles.listIcon, { backgroundColor: list.color + '22' }]}>
              <Text style={styles.listIconText}>{list.icon}</Text>
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listName}>{list.name}</Text>
              <Text style={styles.listCount}>
                {list.word_count} {list.word_count === 1 ? 'word' : 'words'}
              </Text>
              {list.description ? (
                <Text style={styles.listDescription} numberOfLines={1}>{list.description}</Text>
              ) : null}
            </View>
            {list.word_count > 0 && (
              <TouchableOpacity
                style={[styles.practiceBtn, { backgroundColor: list.color }]}
                onPress={() => handlePractice(list)}
              >
                <Text style={styles.practiceBtnText}>Practice</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}

        {/* Create new list button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonIcon}>+</Text>
          <Text style={styles.createButtonText}>Create New List</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Create List Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Word List</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="List name..."
              placeholderTextColor="#95A5A6"
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />

            <Text style={styles.modalLabel}>Icon</Text>
            <View style={styles.iconRow}>
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconOption, newListIcon === icon && styles.iconOptionSelected]}
                  onPress={() => setNewListIcon(icon)}
                >
                  <Text style={styles.iconOptionText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newListColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewListColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCreate}
                onPress={handleCreateList}
              >
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { flex: 1, padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2C3E50', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#7F8C8D', marginBottom: 20 },
  listCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listIconText: { fontSize: 22 },
  listInfo: { flex: 1 },
  listName: { fontSize: 16, fontWeight: '600', color: '#2C3E50' },
  listCount: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  listDescription: { fontSize: 12, color: '#95A5A6', marginTop: 2 },
  practiceBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  practiceBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#3498DB',
    borderStyle: 'dashed',
    marginTop: 6,
  },
  createButtonIcon: { fontSize: 22, color: '#3498DB', marginRight: 8, fontWeight: 'bold' },
  createButtonText: { fontSize: 16, color: '#3498DB', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E0E6ED',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 16,
  },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#34495E', marginBottom: 8 },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  iconOptionSelected: { backgroundColor: '#D6EAF8', borderWidth: 2, borderColor: '#3498DB' },
  iconOptionText: { fontSize: 20 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 10 },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionSelected: { borderWidth: 3, borderColor: '#2C3E50' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: '#7F8C8D', fontSize: 15, fontWeight: '600' },
  modalCreate: {
    backgroundColor: '#3498DB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalCreateText: { color: 'white', fontSize: 15, fontWeight: '600' },
});

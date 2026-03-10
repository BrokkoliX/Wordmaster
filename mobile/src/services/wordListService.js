/**
 * Word List Service
 *
 * Manages user-created word lists (favorites, custom collections).
 * All data is stored locally in SQLite.
 */

import db from './db';

const FAVORITES_LIST_ID = '__favorites__';

/**
 * Create a new word list.
 */
export const createList = async (name, description = '', icon = '📝', color = '#3498DB') => {
  try {
    const id = `list_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await db.runAsync(
      'INSERT INTO word_lists (id, name, description, icon, color) VALUES (?, ?, ?, ?, ?)',
      [id, name, description, icon, color]
    );
    return { id, name, description, icon, color };
  } catch (error) {
    console.error('Error creating list:', error);
    throw error;
  }
};

/**
 * Update an existing word list's metadata.
 */
export const updateList = async (listId, fields) => {
  try {
    const sets = [];
    const params = [];
    if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
    if (fields.description !== undefined) { sets.push('description = ?'); params.push(fields.description); }
    if (fields.icon !== undefined) { sets.push('icon = ?'); params.push(fields.icon); }
    if (fields.color !== undefined) { sets.push('color = ?'); params.push(fields.color); }
    sets.push("updated_at = datetime('now')");
    params.push(listId);

    await db.runAsync(
      `UPDATE word_lists SET ${sets.join(', ')} WHERE id = ?`,
      params
    );
  } catch (error) {
    console.error('Error updating list:', error);
    throw error;
  }
};

/**
 * Delete a word list and its items. Cannot delete the favorites list.
 */
export const deleteList = async (listId) => {
  if (listId === FAVORITES_LIST_ID) {
    throw new Error('Cannot delete the Favorites list');
  }
  try {
    await db.runAsync('DELETE FROM word_list_items WHERE list_id = ?', [listId]);
    await db.runAsync('DELETE FROM word_lists WHERE id = ?', [listId]);
  } catch (error) {
    console.error('Error deleting list:', error);
    throw error;
  }
};

/**
 * Get all word lists with item counts.
 */
export const getAllLists = async () => {
  try {
    const lists = await db.getAllAsync(`
      SELECT wl.*,
             COUNT(wli.id) as word_count
      FROM word_lists wl
      LEFT JOIN word_list_items wli ON wl.id = wli.list_id
      GROUP BY wl.id
      ORDER BY
        CASE WHEN wl.id = '__favorites__' THEN 0 ELSE 1 END,
        wl.created_at DESC
    `);
    return lists;
  } catch (error) {
    console.error('Error getting all lists:', error);
    return [];
  }
};

/**
 * Get words in a specific list, joined with word and progress data.
 */
export const getListWords = async (listId) => {
  try {
    const words = await db.getAllAsync(`
      SELECT w.*, wli.added_at,
             p.id as progress_id, p.status, p.confidence_level,
             p.consecutive_correct, p.ease_factor, p.interval_days,
             p.times_shown, p.times_correct, p.times_incorrect
      FROM word_list_items wli
      INNER JOIN words w ON wli.word_id = w.id
      LEFT JOIN user_word_progress p ON w.id = p.word_id
      WHERE wli.list_id = ?
      ORDER BY wli.added_at DESC
    `, [listId]);
    return words;
  } catch (error) {
    console.error('Error getting list words:', error);
    return [];
  }
};

/**
 * Add a word to a list.
 */
export const addWordToList = async (listId, wordId) => {
  try {
    const id = `wli_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await db.runAsync(
      'INSERT OR IGNORE INTO word_list_items (id, list_id, word_id) VALUES (?, ?, ?)',
      [id, listId, wordId]
    );
    await db.runAsync(
      "UPDATE word_lists SET updated_at = datetime('now') WHERE id = ?",
      [listId]
    );
    return true;
  } catch (error) {
    console.error('Error adding word to list:', error);
    return false;
  }
};

/**
 * Remove a word from a list.
 */
export const removeWordFromList = async (listId, wordId) => {
  try {
    await db.runAsync(
      'DELETE FROM word_list_items WHERE list_id = ? AND word_id = ?',
      [listId, wordId]
    );
    await db.runAsync(
      "UPDATE word_lists SET updated_at = datetime('now') WHERE id = ?",
      [listId]
    );
    return true;
  } catch (error) {
    console.error('Error removing word from list:', error);
    return false;
  }
};

/**
 * Toggle a word in the Favorites list.
 */
export const toggleFavorite = async (wordId) => {
  try {
    const existing = await db.getFirstAsync(
      'SELECT id FROM word_list_items WHERE list_id = ? AND word_id = ?',
      [FAVORITES_LIST_ID, wordId]
    );
    if (existing) {
      await removeWordFromList(FAVORITES_LIST_ID, wordId);
      return false; // was removed
    } else {
      await addWordToList(FAVORITES_LIST_ID, wordId);
      return true; // was added
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
};

/**
 * Check if a word is in the Favorites list.
 */
export const isWordFavorited = async (wordId) => {
  try {
    const row = await db.getFirstAsync(
      'SELECT id FROM word_list_items WHERE list_id = ? AND word_id = ?',
      [FAVORITES_LIST_ID, wordId]
    );
    return !!row;
  } catch (error) {
    console.error('Error checking favorite:', error);
    return false;
  }
};

/**
 * Export a list as a JSON object.
 */
export const exportList = async (listId) => {
  try {
    const list = await db.getFirstAsync('SELECT * FROM word_lists WHERE id = ?', [listId]);
    const items = await db.getAllAsync(`
      SELECT w.word, w.translation, w.cefr_level, w.category, w.source_lang, w.target_lang
      FROM word_list_items wli
      INNER JOIN words w ON wli.word_id = w.id
      WHERE wli.list_id = ?
    `, [listId]);

    return JSON.stringify({
      name: list.name,
      description: list.description,
      icon: list.icon,
      color: list.color,
      words: items,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  } catch (error) {
    console.error('Error exporting list:', error);
    throw error;
  }
};

/**
 * Import a list from a JSON string. Words are matched by word+translation
 * against the local words table; unmatched words are skipped.
 */
export const importList = async (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    const newList = await createList(
      data.name || 'Imported List',
      data.description || '',
      data.icon || '📥',
      data.color || '#3498DB'
    );

    let matched = 0;
    for (const w of (data.words || [])) {
      const localWord = await db.getFirstAsync(
        'SELECT id FROM words WHERE word = ? AND translation = ? LIMIT 1',
        [w.word, w.translation]
      );
      if (localWord) {
        await addWordToList(newList.id, localWord.id);
        matched++;
      }
    }

    return { listId: newList.id, matched, total: (data.words || []).length };
  } catch (error) {
    console.error('Error importing list:', error);
    throw error;
  }
};

export default {
  createList,
  updateList,
  deleteList,
  getAllLists,
  getListWords,
  addWordToList,
  removeWordFromList,
  toggleFavorite,
  isWordFavorited,
  exportList,
  importList,
  FAVORITES_LIST_ID,
};

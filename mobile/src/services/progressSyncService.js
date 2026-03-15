/**
 * Progress Sync Service
 *
 * Syncs local SQLite word progress to the backend PostgreSQL after each
 * session. Only sends records that changed since the last successful sync
 * (delta sync) to minimize payload size and server load.
 *
 * Runs in the background -- never blocks the UI.  If the sync fails
 * (offline, server error), the unsent delta accumulates locally and is
 * picked up on the next successful sync.
 */

import api from './api';
import db from './sqliteConnection';
import AsyncStorage from '@react-native-async-storage/async-storage';
import xpService from './xpService';
import { syncPendingHeartUses } from './heartsService';

const SYNC_TIMESTAMP_KEY = 'lastProgressSyncAt';
const MAX_BATCH_SIZE = 200;

/**
 * Sync progress that changed since the last successful sync.
 * Call this after every completed session.
 *
 * @returns {{ synced: number }} Number of records synced, or 0 on failure.
 */
export const syncProgressToServer = async () => {
  try {
    // Only sync if the user is logged in
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      return { synced: 0 };
    }

    const lastSync = await AsyncStorage.getItem(SYNC_TIMESTAMP_KEY);

    // Find progress records updated since last sync
    let rows;
    if (lastSync) {
      rows = await db.getAllAsync(
        `SELECT * FROM user_word_progress
         WHERE last_reviewed_at > ?
         ORDER BY last_reviewed_at ASC
         LIMIT ?`,
        [lastSync, MAX_BATCH_SIZE]
      );
    } else {
      // First sync ever -- send everything
      rows = await db.getAllAsync(
        `SELECT * FROM user_word_progress
         ORDER BY last_reviewed_at ASC
         LIMIT ?`,
        [MAX_BATCH_SIZE]
      );
    }

    if (rows.length === 0) {
      return { synced: 0 };
    }

    // Map local column names to the backend's expected payload shape
    const progress = rows.map((r) => ({
      wordId: r.word_id,
      status: r.status,
      confidenceLevel: r.confidence_level,
      consecutiveCorrect: r.consecutive_correct,
      easeFactor: r.ease_factor,
      intervalDays: r.interval_days,
      nextReviewDate: r.next_review_date,
      timesShown: r.times_shown,
      timesCorrect: r.times_correct,
      timesIncorrect: r.times_incorrect,
      lastReviewed: r.last_reviewed_at,
    }));

    // Drain pending XP events from the local queue
    const pendingXpEvents = await xpService.flushQueue();

    await api.post('/progress/sync', {
      progress,
      xpEvents: pendingXpEvents.length > 0 ? pendingXpEvents : undefined,
    });

    // Record the timestamp of the newest synced record so next time
    // we only send what changed after this point.
    const newestTimestamp = rows[rows.length - 1].last_reviewed_at;
    if (newestTimestamp) {
      await AsyncStorage.setItem(SYNC_TIMESTAMP_KEY, newestTimestamp);
    }

    // Purge old synced XP events to keep SQLite lean
    await xpService.purgeOldEvents();

    // Flush any queued heart-use events from offline sessions.
    await syncPendingHeartUses().catch(() => {});

    console.log(`Synced ${rows.length} progress records to server`);
    return { synced: rows.length };
  } catch (error) {
    // Non-fatal: the delta stays in SQLite and will be picked up next time.
    // Roll back XP queue so events are retried on next sync.
    await xpService.resetQueue();
    console.warn('Progress sync failed (will retry later):', error.message);
    return { synced: 0 };
  }
};

/**
 * Pull progress from the server and merge into local SQLite.
 * Useful after login or when restoring on a new device.
 */
export const pullProgressFromServer = async () => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      return { merged: 0 };
    }

    const { data } = await api.get('/progress/export');
    const serverProgress = data?.data?.progress || [];

    if (serverProgress.length === 0) {
      return { merged: 0 };
    }

    let merged = 0;

    for (const sp of serverProgress) {
      const local = await db.getFirstAsync(
        'SELECT * FROM user_word_progress WHERE word_id = ?',
        [sp.word_id]
      );

      if (!local) {
        // Server has a record we don't -- insert it
        const progressId = `progress_${sp.word_id}_${Date.now()}`;
        await db.runAsync(
          `INSERT INTO user_word_progress
           (id, word_id, status, confidence_level, consecutive_correct,
            ease_factor, interval_days, next_review_date,
            times_shown, times_correct, times_incorrect, last_reviewed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            progressId,
            sp.word_id,
            sp.status,
            sp.confidence_level,
            sp.consecutive_correct,
            sp.ease_factor,
            sp.interval_days,
            sp.next_review_date,
            sp.times_shown,
            sp.times_correct,
            sp.times_incorrect,
            sp.last_reviewed,
          ]
        );
        merged++;
      } else if (sp.last_reviewed && (!local.last_reviewed_at || sp.last_reviewed > local.last_reviewed_at)) {
        // Server record is newer -- update local
        await db.runAsync(
          `UPDATE user_word_progress SET
            status = ?, confidence_level = ?, consecutive_correct = ?,
            ease_factor = ?, interval_days = ?, next_review_date = ?,
            times_shown = ?, times_correct = ?, times_incorrect = ?,
            last_reviewed_at = ?
           WHERE word_id = ?`,
          [
            sp.status,
            sp.confidence_level,
            sp.consecutive_correct,
            sp.ease_factor,
            sp.interval_days,
            sp.next_review_date,
            sp.times_shown,
            sp.times_correct,
            sp.times_incorrect,
            sp.last_reviewed,
            sp.word_id,
          ]
        );
        merged++;
      }
      // If local is same or newer, keep local (it will sync up next push)
    }

    console.log(`Merged ${merged} progress records from server`);
    return { merged };
  } catch (error) {
    console.warn('Progress pull failed:', error.message);
    return { merged: 0 };
  }
};

export default {
  syncProgressToServer,
  pullProgressFromServer,
};

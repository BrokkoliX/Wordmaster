/**
 * Hearts Service
 *
 * Manages heart state for the monetization system. Hearts are authoritative
 * on the server; this service caches the latest known state locally for
 * offline display and queues heart-use events for sync on reconnect.
 *
 * Plus/Super users bypass the hearts system entirely. The server returns
 * { hearts_enabled: false } for those tiers.
 */

import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEARTS_CACHE_KEY = 'hearts_state';
const HEARTS_QUEUE_KEY = 'hearts_pending_uses';

// ─── Server communication ────────────────────────────────────────────────────

/**
 * Fetch the current heart state from the server (applies passive refills).
 * Caches the result locally. Returns null if the request fails (offline).
 */
export const fetchHearts = async () => {
  try {
    const { data } = await api.get('/hearts');
    await AsyncStorage.setItem(HEARTS_CACHE_KEY, JSON.stringify(data));
    return data;
  } catch (error) {
    console.warn('Failed to fetch hearts from server:', error.message);
    return null;
  }
};

/**
 * Notify the server that a heart was used (incorrect answer).
 * If offline, queues the event for later sync.
 *
 * @returns {Object|null} Updated heart state from server, or null if queued.
 */
export const useHeart = async () => {
  try {
    const { data } = await api.post('/hearts/use');
    await AsyncStorage.setItem(HEARTS_CACHE_KEY, JSON.stringify(data));
    return data;
  } catch (error) {
    console.warn('Failed to report heart use to server, queuing:', error.message);
    await queueHeartUse();
    // Optimistically deduct from local cache.
    return await deductLocalHeart();
  }
};

/**
 * Request an ad-based heart refill from the server.
 * Should only be called after a rewarded video completes.
 *
 * @returns {Object} Updated heart state from server.
 * @throws {Error} if daily cap is reached or request fails.
 */
export const adRefill = async () => {
  const { data } = await api.post('/hearts/ad-refill');
  await AsyncStorage.setItem(HEARTS_CACHE_KEY, JSON.stringify(data));
  return data;
};

// ─── Local cache ─────────────────────────────────────────────────────────────

/**
 * Return the locally cached heart state. Used for immediate UI rendering
 * before the server response arrives, and when offline.
 *
 * @returns {Object|null}
 */
export const getCachedHearts = async () => {
  try {
    const raw = await AsyncStorage.getItem(HEARTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Optimistically deduct one heart from the local cache.
 * Used when the server is unreachable.
 */
const deductLocalHeart = async () => {
  const cached = await getCachedHearts();
  if (!cached || !cached.hearts_enabled) return cached;

  const updated = {
    ...cached,
    current_hearts: Math.max(0, (cached.current_hearts || 0) - 1),
    hearts_depleted: (cached.current_hearts || 0) - 1 <= 0,
  };
  await AsyncStorage.setItem(HEARTS_CACHE_KEY, JSON.stringify(updated));
  return updated;
};

// ─── Offline queue ───────────────────────────────────────────────────────────

/**
 * Queue one heart-use event for sync when connectivity returns.
 */
const queueHeartUse = async () => {
  try {
    const raw = await AsyncStorage.getItem(HEARTS_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ timestamp: new Date().toISOString() });
    await AsyncStorage.setItem(HEARTS_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to queue heart use:', error);
  }
};

/**
 * Flush queued heart-use events to the server.
 * Called from progressSyncService on reconnect.
 *
 * @returns {number} Number of events successfully synced.
 */
export const syncPendingHeartUses = async () => {
  try {
    const raw = await AsyncStorage.getItem(HEARTS_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    if (queue.length === 0) return 0;

    let synced = 0;
    for (const _event of queue) {
      try {
        await api.post('/hearts/use');
        synced++;
      } catch (error) {
        // Stop on first failure — remaining events stay queued.
        break;
      }
    }

    if (synced > 0) {
      const remaining = queue.slice(synced);
      await AsyncStorage.setItem(HEARTS_QUEUE_KEY, JSON.stringify(remaining));
    }

    return synced;
  } catch (error) {
    console.error('Failed to sync pending heart uses:', error);
    return 0;
  }
};

/**
 * Clear the local hearts cache and queue. Called on logout.
 */
export const clearHeartsData = async () => {
  await AsyncStorage.multiRemove([HEARTS_CACHE_KEY, HEARTS_QUEUE_KEY]);
};

export default {
  fetchHearts,
  useHeart,
  adRefill,
  getCachedHearts,
  syncPendingHeartUses,
  clearHeartsData,
};

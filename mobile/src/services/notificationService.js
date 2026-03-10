/**
 * Notification Service
 *
 * Wraps expo-notifications for scheduling local review reminders.
 * Falls back gracefully if expo-notifications is not installed.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWordsDueCount } from './database';

const REMINDER_ENABLED_KEY = 'reminders_enabled';
const REMINDER_TIME_KEY = 'reminder_time';

let Notifications = null;

/**
 * Lazy-load expo-notifications so the app doesn't crash if the
 * package hasn't been installed yet.
 */
const getNotifications = async () => {
  if (Notifications) return Notifications;
  try {
    Notifications = require('expo-notifications');
    return Notifications;
  } catch {
    console.warn('expo-notifications not installed -- reminders disabled');
    return null;
  }
};

/**
 * Request notification permissions.
 * Returns true if granted.
 */
export const requestPermissions = async () => {
  const Notif = await getNotifications();
  if (!Notif) return false;
  try {
    const { status: existingStatus } = await Notif.getPermissionsAsync();
    if (existingStatus === 'granted') return true;
    const { status } = await Notif.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Schedule a daily review reminder.
 *
 * @param {object} settings
 * @param {boolean} settings.enabled
 * @param {number}  settings.preferredHour - hour of day 0-23
 */
export const scheduleReviewReminder = async (settings) => {
  const Notif = await getNotifications();
  if (!Notif) return;

  try {
    // Cancel all existing scheduled notifications
    await Notif.cancelAllScheduledNotificationsAsync();

    if (!settings.enabled) return;

    const dueCount = await getWordsDueCount();
    const bodyLines = [
      dueCount > 0
        ? `You have ${dueCount} words due for review today`
        : 'Keep your streak alive -- 5 min practice',
      'A quick session keeps your memory sharp',
      'Your vocabulary is waiting for you',
    ];
    const body = bodyLines[Math.floor(Math.random() * bodyLines.length)];

    await Notif.scheduleNotificationAsync({
      content: {
        title: 'WordMaster Reminder',
        body,
        sound: true,
      },
      trigger: {
        type: 'daily',
        hour: settings.preferredHour ?? 9,
        minute: 0,
      },
    });
  } catch (error) {
    console.error('Error scheduling reminder:', error);
  }
};

/**
 * Update the notification content (call on app foreground).
 */
export const updateNotificationContent = async () => {
  try {
    const enabled = await AsyncStorage.getItem(REMINDER_ENABLED_KEY);
    if (enabled !== 'true') return;

    const hourStr = await AsyncStorage.getItem(REMINDER_TIME_KEY);
    const preferredHour = hourStr ? parseInt(hourStr, 10) : 9;

    await scheduleReviewReminder({ enabled: true, preferredHour });
  } catch (error) {
    console.error('Error updating notification content:', error);
  }
};

/**
 * Cancel all reminders.
 */
export const cancelAllReminders = async () => {
  const Notif = await getNotifications();
  if (!Notif) return;
  try {
    await Notif.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling reminders:', error);
  }
};

/**
 * Get current reminder settings.
 */
export const getReminderSettings = async () => {
  const enabled = (await AsyncStorage.getItem(REMINDER_ENABLED_KEY)) === 'true';
  const hourStr = await AsyncStorage.getItem(REMINDER_TIME_KEY);
  return {
    enabled,
    preferredHour: hourStr ? parseInt(hourStr, 10) : 9,
  };
};

/**
 * Save reminder settings and reschedule.
 */
export const saveReminderSettings = async (enabled, preferredHour) => {
  await AsyncStorage.setItem(REMINDER_ENABLED_KEY, enabled ? 'true' : 'false');
  await AsyncStorage.setItem(REMINDER_TIME_KEY, String(preferredHour));
  await scheduleReviewReminder({ enabled, preferredHour });
};

export default {
  requestPermissions,
  scheduleReviewReminder,
  updateNotificationContent,
  cancelAllReminders,
  getReminderSettings,
  saveReminderSettings,
};

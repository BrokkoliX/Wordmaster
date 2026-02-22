import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Haptic Feedback Service
 * Provides tactile feedback for user interactions
 */

class HapticService {
  constructor() {
    this.isEnabled = true;
    this.isSupported = Platform.OS === 'ios' || Platform.OS === 'android';
    this.loadSettings();
  }

  /**
   * Load haptic settings
   */
  async loadSettings() {
    try {
      const enabled = await AsyncStorage.getItem('haptics_enabled');
      if (enabled !== null) {
        this.isEnabled = enabled === 'true';
      }
    } catch (error) {
      console.error('Error loading haptic settings:', error);
    }
  }

  /**
   * Save haptic settings
   */
  async saveSettings() {
    try {
      await AsyncStorage.setItem('haptics_enabled', this.isEnabled.toString());
    } catch (error) {
      console.error('Error saving haptic settings:', error);
    }
  }

  /**
   * Trigger haptic feedback
   * @private
   */
  async trigger(type) {
    if (!this.isEnabled || !this.isSupported) {
      return;
    }

    try {
      await type();
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }

  /**
   * Light impact (for taps, selections)
   */
  async light() {
    await this.trigger(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  }

  /**
   * Medium impact (for buttons, switches)
   */
  async medium() {
    await this.trigger(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  }

  /**
   * Heavy impact (for major actions)
   */
  async heavy() {
    await this.trigger(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  }

  /**
   * Selection feedback (for swipes, picker changes)
   */
  async selection() {
    await this.trigger(() => Haptics.selectionAsync());
  }

  /**
   * Success notification (correct answer, achievement)
   */
  async success() {
    await this.trigger(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  }

  /**
   * Warning notification
   */
  async warning() {
    await this.trigger(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  }

  /**
   * Error notification (wrong answer, failed action)
   */
  async error() {
    await this.trigger(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  }

  /**
   * Celebration feedback (achievement unlock)
   * Combination of multiple haptics for special moments
   */
  async celebration() {
    if (!this.isEnabled || !this.isSupported) return;

    try {
      await this.success();
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.success();
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.success();
    } catch (error) {
      console.error('Celebration haptic error:', error);
    }
  }

  /**
   * Enable haptic feedback
   */
  async enable() {
    this.isEnabled = true;
    await this.saveSettings();
    await this.light(); // Give feedback that it's enabled
  }

  /**
   * Disable haptic feedback
   */
  async disable() {
    this.isEnabled = false;
    await this.saveSettings();
  }

  /**
   * Toggle haptic feedback
   */
  async toggle() {
    if (this.isEnabled) {
      await this.disable();
    } else {
      await this.enable();
    }
    return this.isEnabled;
  }

  /**
   * Check if haptics are supported
   */
  isHapticsSupported() {
    return this.isSupported;
  }

  /**
   * Check if haptics are enabled
   */
  isHapticsEnabled() {
    return this.isEnabled && this.isSupported;
  }
}

// Export singleton instance
const hapticService = new HapticService();
export default hapticService;

import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Text-to-Speech Service
 * Handles pronunciation of words in different languages
 */

class TTSService {
  constructor() {
    this.isSpeaking = false;
    this.isEnabled = false; // Off by default; user enables via Settings
    this.rate = 0.75; // Slower for learning (0.5 = slow, 1.0 = normal)
    this.loadSettings();
  }

  /**
   * Load TTS settings from storage
   */
  async loadSettings() {
    try {
      const enabled = await AsyncStorage.getItem('tts_enabled');
      const rate = await AsyncStorage.getItem('tts_rate');
      
      if (enabled !== null) {
        this.isEnabled = enabled === 'true';
      }
      
      if (rate !== null) {
        this.rate = parseFloat(rate);
      }
    } catch (error) {
      console.error('Error loading TTS settings:', error);
    }
  }

  /**
   * Save TTS settings
   */
  async saveSettings() {
    try {
      await AsyncStorage.setItem('tts_enabled', this.isEnabled.toString());
      await AsyncStorage.setItem('tts_rate', this.rate.toString());
    } catch (error) {
      console.error('Error saving TTS settings:', error);
    }
  }

  /**
   * Speak a word in the specified language
   * 
   * @param {string} text - The text to speak
   * @param {string} language - Language code (e.g., 'es-ES', 'en-US')
   * @param {object} options - Additional options
   */
  async speak(text, language = 'es-ES', options = {}) {
    if (!this.isEnabled && !options.force) {
      return;
    }

    if (!text) {
      console.warn('No text to speak');
      return;
    }

    try {
      // Stop any currently playing speech
      await this.stop();

      const speechOptions = {
        language: language,
        pitch: options.pitch || 1.0,
        rate: options.rate || this.rate,
        onStart: () => {
          this.isSpeaking = true;
          if (options.onStart) options.onStart();
        },
        onDone: () => {
          this.isSpeaking = false;
          if (options.onDone) options.onDone();
        },
        onStopped: () => {
          this.isSpeaking = false;
          if (options.onStopped) options.onStopped();
        },
        onError: (error) => {
          this.isSpeaking = false;
          console.error('TTS Error:', error);
          if (options.onError) options.onError(error);
        }
      };

      Speech.speak(text, speechOptions);
    } catch (error) {
      console.error('Error in TTS speak:', error);
      this.isSpeaking = false;
    }
  }

  /**
   * Speak a word in Spanish (learning language)
   */
  async speakSpanish(text, options = {}) {
    return this.speak(text, 'es-ES', options);
  }

  /**
   * Speak a word in English (known language)
   */
  async speakEnglish(text, options = {}) {
    return this.speak(text, 'en-US', options);
  }

  /**
   * Stop current speech
   */
  async stop() {
    try {
      if (this.isSpeaking) {
        await Speech.stop();
        this.isSpeaking = false;
      }
    } catch (error) {
      console.error('Error stopping TTS:', error);
    }
  }

  /**
   * Pause current speech
   */
  async pause() {
    try {
      if (this.isSpeaking) {
        await Speech.pause();
      }
    } catch (error) {
      console.error('Error pausing TTS:', error);
    }
  }

  /**
   * Resume paused speech
   */
  async resume() {
    try {
      await Speech.resume();
    } catch (error) {
      console.error('Error resuming TTS:', error);
    }
  }

  /**
   * Check if TTS is currently speaking
   */
  isSpeakingNow() {
    return this.isSpeaking;
  }

  /**
   * Enable TTS
   */
  async enable() {
    this.isEnabled = true;
    await this.saveSettings();
  }

  /**
   * Disable TTS
   */
  async disable() {
    this.isEnabled = false;
    await this.stop();
    await this.saveSettings();
  }

  /**
   * Toggle TTS on/off
   */
  async toggle() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      await this.stop();
    }
    await this.saveSettings();
    return this.isEnabled;
  }

  /**
   * Set speech rate
   * @param {number} rate - Speech rate (0.5 = slow, 1.0 = normal, 2.0 = fast)
   */
  async setRate(rate) {
    this.rate = Math.max(0.1, Math.min(2.0, rate)); // Clamp between 0.1 and 2.0
    await this.saveSettings();
  }

  /**
   * Get available voices for a language
   */
  async getAvailableVoices() {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices;
    } catch (error) {
      console.error('Error getting voices:', error);
      return [];
    }
  }

  /**
   * Check if TTS is available
   */
  async isAvailable() {
    try {
      const voices = await this.getAvailableVoices();
      return voices.length > 0;
    } catch (error) {
      console.error('Error checking TTS availability:', error);
      return false;
    }
  }

  /**
   * Get language code from language pair
   * @param {string} language - Language code (e.g., 'es', 'en', 'fr')
   * @returns {string} - Full language code (e.g., 'es-ES', 'en-US')
   */
  getLanguageCode(language) {
    const languageCodes = {
      'es': 'es-ES',  // Spanish (Spain)
      'en': 'en-US',  // English (US)
      'fr': 'fr-FR',  // French (France)
      'de': 'de-DE',  // German (Germany)
      'hu': 'hu-HU',  // Hungarian (Hungary) - ADDED
      'it': 'it-IT',  // Italian (Italy)
      'pt': 'pt-BR',  // Portuguese (Brazil)
      'ru': 'ru-RU',  // Russian
      'ja': 'ja-JP',  // Japanese
      'zh': 'zh-CN',  // Chinese (Simplified)
      'ko': 'ko-KR',  // Korean
      'ar': 'ar-SA',  // Arabic (Saudi Arabia)
      'hi': 'hi-IN',  // Hindi (India)
    };

    return languageCodes[language] || language;
  }

  /**
   * Speak word with automatic language detection
   * @param {string} word - Word to speak
   * @param {string} languageCode - Short language code ('es', 'en', etc.)
   */
  async speakWord(word, languageCode) {
    const fullLanguageCode = this.getLanguageCode(languageCode);
    return this.speak(word, fullLanguageCode);
  }
}

// Export singleton instance
const ttsService = new TTSService();
export default ttsService;

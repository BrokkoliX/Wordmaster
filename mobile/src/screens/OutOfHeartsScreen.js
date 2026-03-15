import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import hapticService from '../services/HapticService';
import { adRefill } from '../services/heartsService';

/**
 * Shown when a free-tier user runs out of hearts during a learning session.
 * Offers three recovery paths: watch a rewarded ad, wait for passive refill,
 * or upgrade to a paid tier.
 *
 * Route params:
 *   - heartsMax          {number}  Maximum hearts for this tier.
 *   - nextRefillAt       {string}  ISO timestamp of the next passive refill.
 *   - adsRemaining       {number}  Rewarded ad refills left today.
 *   - onRefill           {function} Callback when hearts are restored (passed via navigation).
 */
export default function OutOfHeartsScreen({ route, navigation }) {
  const {
    heartsMax = 5,
    nextRefillAt = null,
    adsRemaining = 0,
  } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canWatchAd = adsRemaining > 0;

  // Format the next refill time for display.
  const formatRefillTime = () => {
    if (!nextRefillAt) return 'soon';
    const ms = new Date(nextRefillAt).getTime() - Date.now();
    if (ms <= 0) return 'now';
    const minutes = Math.ceil(ms / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMin = minutes % 60;
    return remainingMin > 0 ? `${hours}h ${remainingMin}m` : `${hours}h`;
  };

  const handleWatchAd = async () => {
    if (!canWatchAd) return;
    setLoading(true);
    setError(null);

    try {
      // TODO: Integrate AdMob rewarded video here.
      // After the ad completes, call the server to grant hearts.
      // For now, call adRefill directly (simulate ad completion).
      const result = await adRefill();

      hapticService.success();

      // Return to the learning session with restored hearts.
      if (route.params?.onRefillRoute) {
        navigation.navigate(route.params.onRefillRoute, {
          heartsRefilled: true,
          currentHearts: result.current_hearts,
        });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to process ad refill';
      setError(msg);
      hapticService.error();
    } finally {
      setLoading(false);
    }
  };

  const handleWait = () => {
    // Go back to home — the user chose to wait.
    navigation.navigate('Home', { screen: 'Dashboard' });
  };

  const handleUpgrade = () => {
    // Navigate to settings where subscription info lives.
    navigation.navigate('Settings');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Heart icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.heartIcon}>💔</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Out of hearts</Text>
        <Text style={styles.subtitle}>
          You've used all your hearts for now.
        </Text>

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Options */}
        <View style={styles.optionsContainer}>
          {/* Watch ad */}
          <TouchableOpacity
            style={[
              styles.optionButton,
              styles.adButton,
              !canWatchAd && styles.optionDisabled,
            ]}
            onPress={handleWatchAd}
            disabled={!canWatchAd || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.optionEmoji}>🎬</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Watch a video</Text>
                  <Text style={styles.optionDescription}>
                    {canWatchAd
                      ? `Get 3 more hearts and keep learning`
                      : `Daily limit reached (${adsRemaining} remaining)`}
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Wait for refill */}
          <TouchableOpacity style={styles.optionButton} onPress={handleWait}>
            <Text style={styles.optionEmoji}>⏳</Text>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Wait for refill</Text>
              <Text style={styles.optionDescription}>
                Next heart in ~{formatRefillTime()}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Upgrade */}
          <TouchableOpacity
            style={[styles.optionButton, styles.upgradeButton]}
            onPress={handleUpgrade}
          >
            <Text style={styles.optionEmoji}>⭐</Text>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, styles.upgradeTitle]}>
                Upgrade to Plus
              </Text>
              <Text style={styles.optionDescription}>
                Unlimited hearts, no ads
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  heartIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 32,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#F8D7DA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#721C24',
    fontSize: 14,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E6ED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  adButton: {
    borderColor: '#3498DB',
    backgroundColor: '#3498DB',
  },
  upgradeButton: {
    borderColor: '#F39C12',
    backgroundColor: '#FFF9E6',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 2,
  },
  upgradeTitle: {
    color: '#E67E22',
  },
  optionDescription: {
    fontSize: 14,
    color: '#7F8C8D',
  },
});

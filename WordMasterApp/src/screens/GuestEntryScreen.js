/**
 * GuestEntryScreen - Continue without account
 * Original WordMaster implementation
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert
} from 'react';
import { useAuth } from '../contexts/AuthContext';

const GuestEntryScreen = ({ navigation }) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { continueAsGuest } = useAuth();

  const handleContinueAsGuest = React.useCallback(async () => {
    setIsProcessing(true);
    
    try {
      const result = await continueAsGuest();
      
      if (result.error) {
        Alert.alert('Error', result.error);
      }
      // Success - navigation handled by App.js
    } catch (error) {
      Alert.alert('Error', 'Failed to continue. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [continueAsGuest]);

  const guestLimitations = [
    {
      icon: '✓',
      text: 'Access all vocabulary',
      available: true
    },
    {
      icon: '✓',
      text: 'Track local progress',
      available: true
    },
    {
      icon: '✓',
      text: 'Earn achievements',
      available: true
    },
    {
      icon: '✗',
      text: 'Cloud sync across devices',
      available: false
    },
    {
      icon: '✗',
      text: 'Compete on leaderboards',
      available: false
    },
    {
      icon: '✗',
      text: 'Social features',
      available: false
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Header */}
        <View style={styles.headerArea}>
          <Text style={styles.headerEmoji}>👤</Text>
          <Text style={styles.headerTitle}>Guest Mode</Text>
          <Text style={styles.headerSubtitle}>
            Try WordMaster without creating an account
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionLabel}>What you get as a guest:</Text>
          
          {guestLimitations.map((item, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={[
                styles.featureIcon,
                item.available ? styles.iconAvailable : styles.iconUnavailable
              ]}>
                {item.icon}
              </Text>
              <Text style={[
                styles.featureText,
                !item.available && styles.featureTextDisabled
              ]}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            You can create an account later to unlock cloud sync and social features
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsArea}>
          <TouchableOpacity
            style={[styles.mainAction, isProcessing && styles.mainActionDisabled]}
            onPress={handleContinueAsGuest}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <Text style={styles.mainActionText}>
              {isProcessing ? 'Loading...' : 'Continue as Guest'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => navigation.navigate('Signup')}
            disabled={isProcessing}
          >
            <Text style={styles.secondaryActionText}>Create Account Instead</Text>
          </TouchableOpacity>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backControl}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Text style={styles.backControlText}>← Back</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 50,
    paddingBottom: 40,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 17,
    color: '#6C6C70',
    textAlign: 'center',
    lineHeight: 23,
  },
  featuresSection: {
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 15,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  iconAvailable: {
    color: '#34C759',
  },
  iconUnavailable: {
    color: '#FF3B30',
  },
  featureText: {
    fontSize: 16,
    color: '#1C1C1E',
    flex: 1,
  },
  featureTextDisabled: {
    color: '#8E8E93',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  actionsArea: {
    marginBottom: 20,
  },
  mainAction: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 13,
    alignItems: 'center',
    marginBottom: 12,
  },
  mainActionDisabled: {
    backgroundColor: '#8E8E93',
  },
  mainActionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryAction: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  backControl: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backControlText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
});

export default GuestEntryScreen;

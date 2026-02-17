import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ModeSelectionScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Choose Exercise</Text>
        <Text style={styles.subtitle}>
          Pick how you want to practice your vocabulary
        </Text>

        {/* Multiple Choice */}
        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => navigation.navigate('Learning')}
          activeOpacity={0.8}
        >
          <View style={styles.modeIconContainer}>
            <Text style={styles.modeIcon}>ABCD</Text>
          </View>
          <View style={styles.modeInfo}>
            <Text style={styles.modeName}>Multiple Choice</Text>
            <Text style={styles.modeDescription}>
              See a word and pick the correct translation from four options.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Matching Pairs */}
        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => navigation.navigate('MatchingPairs')}
          activeOpacity={0.8}
        >
          <View style={[styles.modeIconContainer, styles.modeIconMatching]}>
            <Text style={styles.modeIcon}>||</Text>
          </View>
          <View style={styles.modeInfo}>
            <Text style={styles.modeName}>Matching Pairs</Text>
            <Text style={styles.modeDescription}>
              Two columns of words -- match each word with its translation.
            </Text>
          </View>
        </TouchableOpacity>
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
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 40,
  },
  modeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#E0E6ED',
  },
  modeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FDEBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeIconMatching: {
    backgroundColor: '#E8F8F5',
  },
  modeIcon: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E53935',
  },
  modeInfo: {
    flex: 1,
  },
  modeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
});

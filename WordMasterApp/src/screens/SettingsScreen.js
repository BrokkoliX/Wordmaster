import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CEFR_LEVELS = [
  { id: 'A1', name: 'A1 - Beginner', description: '500 most common words', wordCount: 500 },
  { id: 'A2', name: 'A2 - Elementary', description: 'Everyday conversations', wordCount: 1000 },
  { id: 'B1', name: 'B1 - Intermediate', description: 'Independent user', wordCount: 1500 },
  { id: 'B2', name: 'B2 - Upper Intermediate', description: 'Complex topics', wordCount: 3000 },
  { id: 'C1', name: 'C1 - Advanced', description: 'Professional fluency', wordCount: 6000 },
  { id: 'C2', name: 'C2 - Mastery', description: 'Near-native level', wordCount: 18000 }
];

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
];

export default function SettingsScreen({ navigation }) {
  const [knownLanguage, setKnownLanguage] = useState('en');
  const [learningLanguage, setLearningLanguage] = useState('es');
  const [cefrLevel, setCefrLevel] = useState('A1');
  const [showKnownLanguagePicker, setShowKnownLanguagePicker] = useState(false);
  const [showLearningLanguagePicker, setShowLearningLanguagePicker] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedKnownLang = await AsyncStorage.getItem('knownLanguage');
      const savedLearningLang = await AsyncStorage.getItem('learningLanguage');
      const savedLevel = await AsyncStorage.getItem('cefrLevel');

      if (savedKnownLang) setKnownLanguage(savedKnownLang);
      if (savedLearningLang) setLearningLanguage(savedLearningLang);
      if (savedLevel) setCefrLevel(savedLevel);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      // Validate language pair
      if (knownLanguage === learningLanguage) {
        Alert.alert(
          'Invalid Selection',
          'Known language and learning language must be different!'
        );
        return;
      }

      await AsyncStorage.setItem('knownLanguage', knownLanguage);
      await AsyncStorage.setItem('learningLanguage', learningLanguage);
      await AsyncStorage.setItem('cefrLevel', cefrLevel);

      // Check if this language pair is available
      const isAvailable = knownLanguage === 'en' && learningLanguage === 'es';
      
      if (!isAvailable) {
        Alert.alert(
          'Language Pair Not Available Yet',
          `Sorry! We currently only have English → Spanish available.\n\nYour settings have been saved for future use, but for now please choose:\n• I speak: English 🇬🇧\n• I want to learn: Spanish 🇪🇸`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home')
            }
          ]
        );
      } else {
        Alert.alert(
          'Settings Saved!',
          `You're learning ${LANGUAGES.find(l => l.code === learningLanguage)?.name} at ${cefrLevel} level`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Could not save settings');
    }
  };

  const getLanguageName = (code) => {
    return LANGUAGES.find(l => l.code === code)?.name || code;
  };

  const getLanguageFlag = (code) => {
    return LANGUAGES.find(l => l.code === code)?.flag || '🌍';
  };

  const getLevelInfo = (level) => {
    return CEFR_LEVELS.find(l => l.id === level);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Learning Settings</Text>
          <Text style={styles.subtitle}>Choose your language pair and level</Text>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Currently Available:</Text>
            <Text style={styles.infoText}>English 🇬🇧 → Spanish 🇪🇸 (6,423 words)</Text>
            <Text style={styles.infoSubtext}>More language pairs coming soon!</Text>
          </View>
        </View>

        {/* Known Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I speak...</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowKnownLanguagePicker(!showKnownLanguagePicker)}
          >
            <Text style={styles.selectorLabel}>Known Language</Text>
            <View style={styles.selectorValue}>
              <Text style={styles.flag}>{getLanguageFlag(knownLanguage)}</Text>
              <Text style={styles.selectorText}>{getLanguageName(knownLanguage)}</Text>
              <Text style={styles.arrow}>▼</Text>
            </View>
          </TouchableOpacity>

          {showKnownLanguagePicker && (
            <View style={styles.pickerContainer}>
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.pickerOption,
                    knownLanguage === lang.code && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    setKnownLanguage(lang.code);
                    setShowKnownLanguagePicker(false);
                  }}
                >
                  <Text style={styles.pickerFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.pickerText,
                    knownLanguage === lang.code && styles.pickerTextSelected
                  ]}>
                    {lang.name}
                  </Text>
                  {knownLanguage === lang.code && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Learning Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I want to learn...</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowLearningLanguagePicker(!showLearningLanguagePicker)}
          >
            <Text style={styles.selectorLabel}>Learning Language</Text>
            <View style={styles.selectorValue}>
              <Text style={styles.flag}>{getLanguageFlag(learningLanguage)}</Text>
              <Text style={styles.selectorText}>{getLanguageName(learningLanguage)}</Text>
              <Text style={styles.arrow}>▼</Text>
            </View>
          </TouchableOpacity>

          {showLearningLanguagePicker && (
            <View style={styles.pickerContainer}>
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.pickerOption,
                    learningLanguage === lang.code && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    setLearningLanguage(lang.code);
                    setShowLearningLanguagePicker(false);
                  }}
                >
                  <Text style={styles.pickerFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.pickerText,
                    learningLanguage === lang.code && styles.pickerTextSelected
                  ]}>
                    {lang.name}
                  </Text>
                  {learningLanguage === lang.code && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* CEFR Level */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My level</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowLevelPicker(!showLevelPicker)}
          >
            <Text style={styles.selectorLabel}>CEFR Level</Text>
            <View style={styles.selectorValue}>
              <Text style={styles.selectorText}>{getLevelInfo(cefrLevel)?.name}</Text>
              <Text style={styles.arrow}>▼</Text>
            </View>
          </TouchableOpacity>

          {showLevelPicker && (
            <View style={styles.pickerContainer}>
              {CEFR_LEVELS.map(level => (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.pickerOption,
                    cefrLevel === level.id && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    setCefrLevel(level.id);
                    setShowLevelPicker(false);
                  }}
                >
                  <View style={styles.levelOption}>
                    <Text style={[
                      styles.levelName,
                      cefrLevel === level.id && styles.pickerTextSelected
                    ]}>
                      {level.name}
                    </Text>
                    <Text style={styles.levelDescription}>{level.description}</Text>
                    <Text style={styles.levelWordCount}>
                      {level.wordCount.toLocaleString()} words
                    </Text>
                  </View>
                  {cefrLevel === level.id && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Current Selection Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Your Learning Path</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>From:</Text>
              <Text style={styles.summaryValue}>
                {getLanguageFlag(knownLanguage)} {getLanguageName(knownLanguage)}
              </Text>
            </View>
            <Text style={styles.summaryArrow}>↓</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>To:</Text>
              <Text style={styles.summaryValue}>
                {getLanguageFlag(learningLanguage)} {getLanguageName(learningLanguage)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Level:</Text>
              <Text style={styles.summaryValue}>{cefrLevel}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Words:</Text>
              <Text style={styles.summaryValue}>
                {getLevelInfo(cefrLevel)?.wordCount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
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
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  infoBanner: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 2,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34495E',
    marginBottom: 12,
  },
  selector: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  selectorValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  selectorText: {
    flex: 1,
    fontSize: 18,
    color: '#2C3E50',
    fontWeight: '600',
  },
  arrow: {
    fontSize: 12,
    color: '#95A5A6',
  },
  pickerContainer: {
    marginTop: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  pickerOptionSelected: {
    backgroundColor: '#EBF5FB',
  },
  pickerFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },
  pickerTextSelected: {
    fontWeight: 'bold',
    color: '#3498DB',
  },
  checkmark: {
    fontSize: 18,
    color: '#3498DB',
    fontWeight: 'bold',
  },
  levelOption: {
    flex: 1,
  },
  levelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  levelDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  levelWordCount: {
    fontSize: 12,
    color: '#95A5A6',
  },
  summaryContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34495E',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#3498DB',
    borderRadius: 16,
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryArrow: {
    fontSize: 24,
    color: 'white',
    textAlign: 'center',
    marginVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 12,
  },
  saveButton: {
    backgroundColor: '#27AE60',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#7F8C8D',
    fontSize: 16,
  },
});

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ScrollView,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import hapticService from '../services/HapticService';

const { width, height } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    id: 1,
    emoji: '🌍',
    title: 'Welcome to WordMaster',
    description: 'Learn Spanish vocabulary with spaced repetition and achieve mastery!',
    color: '#3498DB'
  },
  {
    id: 2,
    emoji: '🎯',
    title: 'Smart Learning',
    description: 'Our SM-2 algorithm adapts to your pace, showing words when you need to review them.',
    color: '#2ECC71'
  },
  {
    id: 3,
    emoji: '🔥',
    title: 'Build Streaks',
    description: 'Practice daily to build your streak and unlock achievements along the way!',
    color: '#E74C3C'
  },
  {
    id: 4,
    emoji: '🏆',
    title: '32 Achievements',
    description: 'Complete challenges, build streaks, and master words to unlock all achievements!',
    color: '#F39C12'
  }
];

export default function OnboardingScreen({ navigation }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    hapticService.light();
    
    if (currentSlide < ONBOARDING_SLIDES.length - 1) {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Move to next slide
        const nextSlide = currentSlide + 1;
        setCurrentSlide(nextSlide);
        scrollViewRef.current?.scrollTo({
          x: width * nextSlide,
          animated: true
        });
        
        // Animate in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          })
        ]).start();
      });
    } else {
      handleFinish();
    }
  };

  const handleSkip = async () => {
    hapticService.light();
    await handleFinish();
  };

  const handleFinish = async () => {
    try {
      // Mark onboarding as complete
      await AsyncStorage.setItem('onboarding_completed', 'true');
      
      // Navigate to home
      navigation.replace('Home');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      navigation.replace('Home');
    }
  };

  const slide = ONBOARDING_SLIDES[currentSlide];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: slide.color }]}>
      <View style={styles.content}>
        {/* Skip button */}
        {currentSlide < ONBOARDING_SLIDES.length - 1 && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Slide content */}
        <Animated.View 
          style={[
            styles.slideContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.emoji}>{slide.emoji}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </Animated.View>

        {/* Pagination dots */}
        <View style={styles.pagination}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentSlide === index && styles.dotActive
              ]}
            />
          ))}
        </View>

        {/* Next/Finish button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentSlide === ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 12,
  },
  skipText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emoji: {
    fontSize: 120,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 6,
  },
  dotActive: {
    width: 30,
    backgroundColor: 'white',
  },
  nextButton: {
    backgroundColor: 'white',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
});

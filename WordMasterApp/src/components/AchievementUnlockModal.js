import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

const RARITY_COLORS = {
  common: '#9CA3AF',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B'
};

export default function AchievementUnlockModal({ 
  visible, 
  achievement, 
  onClose 
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0)
    }))
  ).current;

  useEffect(() => {
    if (visible && achievement) {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      confettiAnims.forEach(anim => {
        anim.x.setValue(0);
        anim.y.setValue(0);
        anim.rotate.setValue(0);
      });

      // Start entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();

      // Start confetti animation
      confettiAnims.forEach((anim, i) => {
        const randomX = (Math.random() - 0.5) * width;
        const randomY = -Math.random() * 400 - 100;
        const randomRotate = Math.random() * 720;

        Animated.parallel([
          Animated.timing(anim.x, {
            toValue: randomX,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true
          }),
          Animated.timing(anim.y, {
            toValue: randomY,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true
          }),
          Animated.timing(anim.rotate, {
            toValue: randomRotate,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true
          })
        ]).start();
      });

      // Auto-dismiss after 5 seconds
      const timeout = setTimeout(() => {
        handleClose();
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [visible, achievement]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      onClose();
    });
  };

  if (!achievement) return null;

  const rarityColor = RARITY_COLORS[achievement.rarity] || '#9CA3AF';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Confetti */}
        {confettiAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.confetti,
              {
                backgroundColor: i % 2 === 0 ? rarityColor : '#F59E0B',
                transform: [
                  { translateX: anim.x },
                  { translateY: anim.y },
                  { rotate: anim.rotate.interpolate({
                    inputRange: [0, 720],
                    outputRange: ['0deg', '720deg']
                  })}
                ]
              }
            ]}
          />
        ))}

        {/* Achievement Card */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim
            }
          ]}
        >
          <View style={[styles.cardHeader, { backgroundColor: rarityColor }]}>
            <Text style={styles.headerText}>🎉 Achievement Unlocked! 🎉</Text>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.icon}>{achievement.icon}</Text>
            <Text style={styles.title}>{achievement.title}</Text>
            <Text style={styles.description}>{achievement.description}</Text>
            
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>
                +{achievement.points} points
              </Text>
            </View>

            <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
              <Text style={styles.rarityText}>
                {achievement.rarity.toUpperCase()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  confetti: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 10,
    height: 10,
    borderRadius: 2
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  cardHeader: {
    padding: 16,
    alignItems: 'center'
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  cardBody: {
    padding: 32,
    alignItems: 'center'
  },
  icon: {
    fontSize: 80,
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center'
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24
  },
  pointsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F59E0B'
  },
  rarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  rarityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  }
});

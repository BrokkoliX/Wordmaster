import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Loading State Component
 * Shows loading indicators with optional messages
 */

export function LoadingSpinner({ size = 'large', color = '#3498DB', message = null }) {
  return (
    <View style={styles.spinnerContainer}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.loadingMessage}>{message}</Text>}
    </View>
  );
}

export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.overlayMessage}>{message}</Text>
      </View>
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
      <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
      <View style={[styles.skeletonLine, styles.skeletonLineLong]} />
    </View>
  );
}

export function SkeletonText({ width = '100%', height = 16 }) {
  return <View style={[styles.skeletonLine, { width, height }]} />;
}

export function EmptyState({ emoji = '📚', title, message }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  // Spinner styles
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingMessage: {
    marginTop: 12,
    fontSize: 16,
    color: '#7F8C8D',
  },

  // Overlay styles
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  overlayMessage: {
    marginTop: 16,
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
  },

  // Skeleton styles
  skeletonCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  skeletonLine: {
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonLineShort: {
    width: '40%',
    height: 16,
  },
  skeletonLineMedium: {
    width: '70%',
    height: 16,
  },
  skeletonLineLong: {
    width: '100%',
    height: 16,
  },

  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default {
  LoadingSpinner,
  LoadingOverlay,
  SkeletonCard,
  SkeletonText,
  EmptyState,
};

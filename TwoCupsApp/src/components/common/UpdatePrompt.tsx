import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

export function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web') return;

    const handleUpdate = () => {
      setUpdateAvailable(true);
      // Slide in animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    };

    // Listen for service worker update event
    window.addEventListener('swUpdate', handleUpdate);

    return () => {
      window.removeEventListener('swUpdate', handleUpdate);
    };
  }, [slideAnim]);

  const handleRefresh = () => {
    // Tell service worker to skip waiting and activate
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    // Reload the page
    window.location.reload();
  };

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setUpdateAvailable(false);
    });
  };

  if (!updateAvailable || Platform.OS !== 'web') {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>✨</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Update Available</Text>
          <Text style={styles.message}>A new version is ready!</Text>
        </View>
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity onPress={handleDismiss} style={styles.laterButton}>
          <Text style={styles.laterText}>Later</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  laterButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  laterText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  refreshButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  refreshText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import { useNetwork } from '../../context/NetworkContext';

export function OfflineBanner() {
  const { isOnline, pendingWritesCount, hasPendingWrites } = useNetwork();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const showBanner = !isOnline || hasPendingWrites;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: showBanner ? 0 : -100,
      useNativeDriver: true,
      tension: 100,
      friction: 10
    }).start();
  }, [showBanner, slideAnim]);

  useEffect(() => {
    if (!isOnline) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline, pulseAnim]);

  if (!showBanner) {
    return null;
  }

  const getMessage = () => {
    if (!isOnline) {
      if (pendingWritesCount > 0) {
        return `📡 Offline • ${pendingWritesCount} action${pendingWritesCount > 1 ? 's' : ''} pending`;
      }
      return "📡 You're offline • Data will sync when connected";
    }
    if (hasPendingWrites) {
      return `⏳ Syncing ${pendingWritesCount} action${pendingWritesCount > 1 ? 's' : ''}...`;
    }
    return '';
  };

  const bannerColor = !isOnline ? colors.warning : colors.primary;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: bannerColor + '15',
          borderBottomColor: bannerColor,
          paddingTop: insets.top + spacing.xs
        }
      ]}
    >
      <Animated.View style={[styles.content, { opacity: pulseAnim }]}>
        <View style={[styles.indicator, { backgroundColor: bannerColor }]} />
        <Text style={[styles.text, { color: bannerColor }]}>
          {getMessage()}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    zIndex: 1000
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm
  },
  text: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '500'
  }
});

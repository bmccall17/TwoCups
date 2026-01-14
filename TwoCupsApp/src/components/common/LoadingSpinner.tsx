import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Animated } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  minDisplayTime?: number;
  inline?: boolean;
}

const MIN_LOADING_DISPLAY_TIME = 300;

export function LoadingSpinner({
  message,
  size = 'large',
  minDisplayTime = MIN_LOADING_DISPLAY_TIME,
  inline = false,
}: LoadingSpinnerProps) {
  const [visible, setVisible] = useState(minDisplayTime === 0);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (minDisplayTime === 0) {
      fadeAnim.setValue(1);
      return;
    }
    
    const timer = setTimeout(() => {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, 50);

    return () => clearTimeout(timer);
  }, [fadeAnim, minDisplayTime]);

  if (!visible && minDisplayTime > 0) {
    return <View style={inline ? styles.inlineContainer : styles.container} />;
  }

  return (
    <Animated.View
      style={[
        inline ? styles.inlineContainer : styles.container,
        { opacity: fadeAnim },
      ]}
    >
      <ActivityIndicator size={size} color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </Animated.View>
  );
}

export function useMinLoadingTime(isLoading: boolean, minTime = MIN_LOADING_DISPLAY_TIME) {
  const [showLoading, setShowLoading] = useState(false);
  const loadingStartRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      loadingStartRef.current = Date.now();
      setShowLoading(true);
    } else if (loadingStartRef.current !== null) {
      const elapsed = Date.now() - loadingStartRef.current;
      const remaining = Math.max(0, minTime - elapsed);
      
      if (remaining > 0) {
        const timer = setTimeout(() => setShowLoading(false), remaining);
        return () => clearTimeout(timer);
      } else {
        setShowLoading(false);
      }
      loadingStartRef.current = null;
    }
  }, [isLoading, minTime]);

  return showLoading;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  inlineContainer: {
    padding: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});

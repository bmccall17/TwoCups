import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast, ToastMessage, ToastType } from '../../context/ToastContext';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  celebration: '🎉',
};

const TOAST_COLORS: Record<ToastType, { background: string; border: string; text: string }> = {
  success: {
    background: colors.success + '20',
    border: colors.success,
    text: colors.success,
  },
  error: {
    background: colors.error + '20',
    border: colors.error,
    text: colors.error,
  },
  info: {
    background: colors.primary + '20',
    border: colors.primary,
    text: colors.primary,
  },
  celebration: {
    background: colors.cupFilled + '30',
    border: colors.cupFilled,
    text: colors.cupFilled,
  },
};

interface ToastItemProps {
  toast: ToastMessage;
  onHide: (id: string) => void;
}

function ToastItem({ toast, onHide }: ToastItemProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(toast.id);
    });
  };

  const toastColors = TOAST_COLORS[toast.type];
  const icon = TOAST_ICONS[toast.type];

  return (
    <Animated.View
      style={[
        styles.toastItem,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: toastColors.background,
          borderColor: toastColors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={handleDismiss}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: toastColors.border }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={3}>
          {toast.message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastContainer() {
  const { toasts, hideToast } = useToast();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + spacing.md }]} pointerEvents="box-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onHide={hideToast} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastItem: {
    width: '100%',
    maxWidth: 400,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    ...shadows.md,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: 14,
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
  message: {
    ...typography.body,
    flex: 1,
    fontWeight: '500',
  },
});

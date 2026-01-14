import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast, ToastMessage, ToastType, GemReward } from '../../context/ToastContext';
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
  const hasGemReward = toast.gemReward && toast.gemReward.amount > 0;

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
        hasGemReward && styles.toastItemWithGems,
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={handleDismiss}
        activeOpacity={0.8}
      >
        {hasGemReward ? (
          <View style={styles.gemIconContainer}>
            <Text style={styles.gemIcon}>💎</Text>
          </View>
        ) : (
          <View style={[styles.iconContainer, { backgroundColor: toastColors.border }]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        )}
        <View style={styles.messageContainer}>
          <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={2}>
            {toast.message}
          </Text>
          {hasGemReward && (
            <GemRewardDisplay gemReward={toast.gemReward!} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function GemRewardDisplay({ gemReward }: { gemReward: GemReward }) {
  const { amount, isBonus, partnerAmount } = gemReward;
  
  return (
    <View style={styles.gemRewardContainer}>
      <View style={styles.gemRewardRow}>
        <Text style={styles.gemRewardIcon}>💎</Text>
        <Text style={styles.gemRewardAmount}>+{amount}</Text>
        {isBonus && (
          <View style={styles.bonusBadge}>
            <Text style={styles.bonusText}>BONUS</Text>
          </View>
        )}
      </View>
      {partnerAmount !== undefined && partnerAmount > 0 && (
        <View style={styles.partnerGemsRow}>
          <Text style={styles.partnerGemsText}>
            💎 +{partnerAmount} to partner
          </Text>
        </View>
      )}
    </View>
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
  toastItemWithGems: {
    borderColor: colors.gem,
    backgroundColor: colors.gem + '25',
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
  gemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.gem + '30',
  },
  gemIcon: {
    fontSize: 20,
  },
  icon: {
    fontSize: 14,
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
  messageContainer: {
    flex: 1,
  },
  message: {
    ...typography.body,
    fontWeight: '500',
  },
  gemRewardContainer: {
    marginTop: spacing.xs,
  },
  gemRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gemRewardIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  gemRewardAmount: {
    ...typography.h3,
    color: colors.gem,
    fontWeight: '700',
  },
  bonusBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  bonusText: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 10,
  },
  partnerGemsRow: {
    marginTop: spacing.xs,
  },
  partnerGemsText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

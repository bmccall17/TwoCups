import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface StatusSnapshotCardProps {
  type: 'waiting' | 'acknowledged';
  count: number;
  onPress?: () => void;
}

export const StatusSnapshotCard = React.memo(function StatusSnapshotCard({
  type,
  count,
  onPress,
}: StatusSnapshotCardProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (type === 'waiting' && count > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [type, count, pulseAnim]);

  const isWaiting = type === 'waiting';
  const icon = isWaiting ? '⏳' : '✨';
  const label = isWaiting ? 'Waiting' : 'Acknowledged';

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          isWaiting ? styles.waitingCard : styles.acknowledgedCard,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <View style={styles.content}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>

        {count > 0 && (
          <View style={[
            styles.badge,
            isWaiting ? styles.waitingBadge : styles.acknowledgedBadge
          ]}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    minHeight: 100,
    position: 'relative',
  },
  waitingCard: {
    backgroundColor: colors.amber500 + '15',
    borderWidth: 1,
    borderColor: colors.amber500 + '30',
  },
  acknowledgedCard: {
    backgroundColor: colors.emerald500 + '15',
    borderWidth: 1,
    borderColor: colors.emerald500 + '30',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minWidth: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs + 2,
  },
  waitingBadge: {
    backgroundColor: colors.amber500,
  },
  acknowledgedBadge: {
    backgroundColor: colors.emerald500,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 11,
  },
});

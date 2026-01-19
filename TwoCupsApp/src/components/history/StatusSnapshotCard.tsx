import React, { useRef, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { AppText } from '../common';

interface StatusSnapshotCardProps {
  type: 'waiting' | 'acknowledged';
  count: number;
  onPress?: () => void;
}

// Bouncing Dots Component for Waiting card
const BouncingDots = React.memo(function BouncingDots() {
  const bounceAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const animations = bounceAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150), // Stagger: 0ms, 150ms, 300ms
          Animated.timing(anim, {
            toValue: -10,
            duration: 300,
            easing: Easing.bezier(0.8, 0, 1, 1), // Ease out
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            easing: Easing.bezier(0, 0, 0.2, 1), // Ease in
            useNativeDriver: true,
          }),
          Animated.delay((2 - index) * 150), // Wait for others
        ])
      )
    );

    animations.forEach((animation) => animation.start());

    return () => animations.forEach((animation) => animation.stop());
  }, [bounceAnims]);

  return (
    <View style={styles.bouncingDotsContainer}>
      {bounceAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bouncingDot,
            { transform: [{ translateY: anim }] },
          ]}
        />
      ))}
    </View>
  );
});

// Rainbow colors as hex (green through rainbow spectrum)
const CONFETTI_COLORS = [
  '#22C55E', // green
  '#10B981', // emerald
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#0EA5E9', // sky
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#A855F7', // purple
  '#D946EF', // fuchsia
  '#EC4899', // pink
  '#F43F5E', // rose
];

// Confetti Component for Acknowledged card
const Confetti = React.memo(function Confetti() {
  // Fixed positions (percentage of 64px container)
  const confettiPositions = useMemo(
    () => [
      { top: 8, left: 12 },
      { top: 16, left: 48 },
      { top: 6, left: 32 },
      { top: 24, left: 8 },
      { top: 12, left: 52 },
      { top: 20, left: 28 },
      { top: 4, left: 44 },
      { top: 28, left: 16 },
      { top: 10, left: 56 },
      { top: 22, left: 40 },
      { top: 14, left: 4 },
      { top: 18, left: 60 },
    ],
    []
  );

  const bounceAnims = useRef(
    confettiPositions.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = bounceAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 50), // Stagger 0-550ms
          Animated.timing(anim, {
            toValue: -8,
            duration: 750,
            easing: Easing.bezier(0.8, 0, 1, 1),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 750,
            easing: Easing.bezier(0, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ])
      )
    );

    animations.forEach((animation) => animation.start());

    return () => animations.forEach((animation) => animation.stop());
  }, [bounceAnims]);

  return (
    <View style={styles.confettiContainer}>
      {confettiPositions.map((pos, index) => (
        <Animated.View
          key={index}
          style={[
            styles.confettiParticle,
            {
              top: pos.top,
              left: pos.left,
              backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
              transform: [{ translateY: bounceAnims[index] }],
            },
          ]}
        />
      ))}
      <View style={styles.confettiEmoji}>
        <AppText style={styles.partyEmoji}>🎉</AppText>
      </View>
    </View>
  );
});

export const StatusSnapshotCard = React.memo(function StatusSnapshotCard({
  type,
  count,
  onPress,
}: StatusSnapshotCardProps) {
  const isWaiting = type === 'waiting';
  const label = isWaiting ? 'Waiting' : 'Acknowledgements';

  return (
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
        <View style={styles.iconContainer}>
          {isWaiting ? <BouncingDots /> : <Confetti />}
        </View>
        <AppText style={styles.label}>{label}</AppText>
      </View>

      <View
        style={[
          styles.badge,
          isWaiting ? styles.waitingBadge : styles.acknowledgedBadge,
        ]}
      >
        <AppText style={styles.badgeText}>{count}</AppText>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    minHeight: 120,
    position: 'relative',
  },
  waitingCard: {
    backgroundColor: colors.amber500 + '15',
    borderWidth: 1,
    borderColor: colors.amber400 + '20',
  },
  acknowledgedCard: {
    backgroundColor: colors.emerald500 + '15',
    borderWidth: 1,
    borderColor: colors.emerald400 + '20',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs + 2,
    borderWidth: 1,
  },
  waitingBadge: {
    backgroundColor: colors.amber500 + '30',
    borderColor: colors.amber400 + '40',
  },
  acknowledgedBadge: {
    backgroundColor: colors.emerald500 + '30',
    borderColor: colors.emerald400 + '40',
  },
  badgeText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  // Bouncing Dots styles
  bouncingDotsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bouncingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.amber400,
  },
  // Confetti styles
  confettiContainer: {
    width: 64,
    height: 64,
    position: 'relative',
  },
  confettiParticle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  confettiEmoji: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyEmoji: {
    fontSize: 32,
  },
});

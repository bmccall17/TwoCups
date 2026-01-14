import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

interface GemCounterProps {
  myGems: number;
  partnerGems: number;
  myName?: string;
  partnerName?: string;
}

interface AnimatedGemDisplayProps {
  count: number;
  label: string;
  isLeft?: boolean;
}

function AnimatedGemDisplay({ count, label, isLeft = true }: AnimatedGemDisplayProps) {
  const [displayCount, setDisplayCount] = useState(count);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const previousCount = useRef(count);

  // Count-up animation when value changes
  useEffect(() => {
    if (count !== previousCount.current) {
      const startCount = previousCount.current;
      const endCount = count;
      previousCount.current = count;

      // Reset animation
      animatedValue.setValue(0);

      // Animate the count and scale
      Animated.parallel([
        // Count animation
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false, // We need to update text, can't use native driver
        }),
        // Scale pop effect
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
        ]),
        // Glow pulse
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: false,
          }),
        ]),
      ]).start();

      // Update display count during animation
      const listener = animatedValue.addListener(({ value }) => {
        const currentCount = Math.round(startCount + (endCount - startCount) * value);
        setDisplayCount(currentCount);
      });

      return () => {
        animatedValue.removeListener(listener);
      };
    }
  }, [count, animatedValue, scaleAnim, glowAnim]);

  // Continuous subtle sparkle animation
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const sparkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    sparkleLoop.start();
    return () => sparkleLoop.stop();
  }, [sparkleAnim]);

  // Interpolate sparkle for subtle pulsing glow
  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  // Interpolate glow for change effect
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.gem, colors.primary],
  });

  return (
    <View style={[styles.gemDisplay, isLeft ? styles.gemDisplayLeft : styles.gemDisplayRight]}>
      <Text style={styles.playerLabel}>{label}</Text>
      
      <View style={styles.gemRow}>
        {/* Gem icon with sparkle effect */}
        <View style={styles.gemIconContainer}>
          {/* Sparkle glow behind gem */}
          <Animated.View
            style={[
              styles.gemGlow,
              {
                opacity: sparkleOpacity,
              },
            ]}
          />
          {/* Active glow on change */}
          <Animated.View
            style={[
              styles.gemGlowActive,
              {
                opacity: glowOpacity,
                backgroundColor: glowColor,
              },
            ]}
          />
          <Text style={styles.gemEmoji}>💎</Text>
        </View>

        {/* Animated count */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Text style={styles.gemCountText}>{displayCount.toLocaleString()}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

export function GemCounter({ myGems, partnerGems, myName = 'Me', partnerName = 'Partner' }: GemCounterProps) {
  const { width } = Dimensions.get('window');
  const isSmallScreen = width < 360;

  return (
    <View style={[styles.container, isSmallScreen && styles.containerSmall]}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>✨</Text>
        <Text style={styles.headerText}>Gem Treasury</Text>
        <Text style={styles.headerIcon}>✨</Text>
      </View>

      <View style={styles.countersRow}>
        <AnimatedGemDisplay count={myGems} label={myName} isLeft={true} />
        
        <View style={styles.divider} />
        
        <AnimatedGemDisplay count={partnerGems} label={partnerName} isLeft={false} />
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Together:</Text>
        <Text style={styles.totalIcon}>💎</Text>
        <Text style={styles.totalCount}>{(myGems + partnerGems).toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gem + '40',
    ...shadows.md,
  },
  containerSmall: {
    padding: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerIcon: {
    fontSize: 14,
    marginHorizontal: spacing.xs,
  },
  headerText: {
    ...typography.bodySmall,
    color: colors.gem,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gemDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  gemDisplayLeft: {
    paddingRight: spacing.sm,
  },
  gemDisplayRight: {
    paddingLeft: spacing.sm,
  },
  playerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  gemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gemIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  gemGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gem,
  },
  gemGlowActive: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  gemEmoji: {
    fontSize: 24,
  },
  gemCountText: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  totalIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  totalCount: {
    ...typography.h3,
    color: colors.gem,
    fontWeight: '700',
  },
});

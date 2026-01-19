import React, { useRef, useEffect, memo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing } from '../../theme';
import { AppText } from '../common';

interface SpinningGeometryHeaderProps {
  title?: string;
  subtitle?: string;
}

// Single circle component
const GeometryCircle = memo(function GeometryCircle({
  size,
  borderOpacity,
  fillOpacity,
  style,
}: {
  size: number;
  borderOpacity: number;
  fillOpacity: number;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: colors.primary + Math.round(borderOpacity * 255).toString(16).padStart(2, '0'),
          backgroundColor: colors.primary + Math.round(fillOpacity * 255).toString(16).padStart(2, '0'),
          position: 'absolute',
        },
        style,
      ]}
    />
  );
});

export const SpinningGeometryHeader = memo(function SpinningGeometryHeader({
  title = 'Connection',
  subtitle = 'Last 7 days',
}: SpinningGeometryHeaderProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Slow rotation - 20 seconds per full rotation
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000, // 20 seconds
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Pulse animation for center glow
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    rotateLoop.start();
    pulseLoop.start();

    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
    };
  }, [rotateAnim, pulseAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Outer circles positioned at 60° intervals
  // Using translateY(-10) then rotating to position around center
  const outerCircleAngles = [0, 60, 120, 180, 240, 300];

  return (
    <View style={styles.container}>
      {/* Geometry container */}
      <View style={styles.geometryContainer}>
        {/* Layer 1: Outer circles (rotating) */}
        <Animated.View
          style={[
            styles.rotatingLayer,
            { transform: [{ rotate: rotation }] },
          ]}
        >
          {outerCircleAngles.map((angle) => (
            <View
              key={angle}
              style={[
                styles.outerCircleWrapper,
                {
                  transform: [
                    { rotate: `${angle}deg` },
                    { translateY: -10 },
                  ],
                },
              ]}
            >
              <GeometryCircle
                size={32}
                borderOpacity={0.4}
                fillOpacity={0.05}
              />
            </View>
          ))}
        </Animated.View>

        {/* Layer 2: Center circle (static) */}
        <View style={styles.centerLayer}>
          <GeometryCircle
            size={32}
            borderOpacity={0.6}
            fillOpacity={0.1}
          />
        </View>

        {/* Layer 3: Center glow (pulsing) */}
        <Animated.View
          style={[
            styles.glowLayer,
            { opacity: pulseAnim },
          ]}
        >
          <View style={styles.glowDot} />
        </Animated.View>
      </View>

      {/* Text labels */}
      <AppText style={styles.title}>{title}</AppText>
      <AppText style={styles.subtitle}>{subtitle}</AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  geometryContainer: {
    width: 80,
    height: 80,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  rotatingLayer: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircleWrapper: {
    position: 'absolute',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLayer: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowLayer: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    // React Native doesn't support blur directly, so we use shadow for glow effect
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '300',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    letterSpacing: 1,
    opacity: 0.6,
  },
});

import React, { useRef, useEffect, memo, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { colors } from '../../theme';

interface SacredGeometryBackgroundProps {
  variant?: 'seedOfLife' | 'vesicaPiscis' | 'flowerOfLife' | 'sixPetalRosette';
  opacity?: number;
  animate?: boolean;
  color?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Single circle component for building patterns
const Circle = memo(({
  size,
  top,
  left,
  opacity = 0.1,
  borderColor = colors.primary,
  borderWidth = 1,
}: {
  size: number;
  top: number;
  left: number;
  opacity?: number;
  borderColor?: string;
  borderWidth?: number;
}) => (
  <View
    style={[
      styles.circle,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        top,
        left,
        borderColor: borderColor,
        borderWidth,
        opacity,
      },
    ]}
  />
));

// Seed of Life pattern - 7 interlocking circles (as shown in reference)
const SeedOfLifePattern = memo(({ size, opacity, color }: { size: number; opacity: number; color: string }) => {
  const circleSize = size * 0.5;
  const radius = circleSize / 2;
  const centerX = size / 2 - radius;
  const centerY = size / 2 - radius;

  // Center circle + 6 surrounding circles at 60 degree intervals
  const circles = useMemo(() => {
    const result = [{ top: centerY, left: centerX }]; // Center
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      result.push({
        top: centerY - radius * Math.sin(angle),
        left: centerX + radius * Math.cos(angle),
      });
    }
    return result;
  }, [centerX, centerY, radius]);

  return (
    <View style={{ width: size, height: size }}>
      {circles.map((pos, i) => (
        <Circle
          key={i}
          size={circleSize}
          top={pos.top}
          left={pos.left}
          opacity={opacity}
          borderColor={color}
          borderWidth={1.5}
        />
      ))}
    </View>
  );
});

// Vesica Piscis pattern - two interlocking circles representing union of two souls
const VesicaPiscisPattern = memo(({ size, opacity, color }: { size: number; opacity: number; color: string }) => {
  const circleSize = size * 0.6;
  const radius = circleSize / 2;
  // Circles overlap by half their radius to create the classic vesica piscis
  const offset = radius * 0.5;
  const centerY = (size - circleSize) / 2;

  return (
    <View style={{ width: size, height: size }}>
      {/* Left circle - represents one partner */}
      <Circle
        size={circleSize}
        top={centerY}
        left={size / 2 - radius - offset}
        opacity={opacity}
        borderColor={color}
        borderWidth={2}
      />
      {/* Right circle - represents other partner */}
      <Circle
        size={circleSize}
        top={centerY}
        left={size / 2 - radius + offset}
        opacity={opacity}
        borderColor={color}
        borderWidth={2}
      />
    </View>
  );
});

// Flower of Life pattern - extended Seed of Life with more circles
const FlowerOfLifePattern = memo(({ size, opacity, color }: { size: number; opacity: number; color: string }) => {
  const circleSize = size * 0.3;
  const radius = circleSize / 2;
  const centerX = size / 2 - radius;
  const centerY = size / 2 - radius;

  // Generate positions for flower of life (19 circles)
  const circles = useMemo(() => {
    const result: Array<{ top: number; left: number }> = [];

    // Center
    result.push({ top: centerY, left: centerX });

    // First ring (6 circles)
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      result.push({
        top: centerY - radius * Math.sin(angle),
        left: centerX + radius * Math.cos(angle),
      });
    }

    // Second ring (12 circles)
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      // Outer circles at 2x radius
      result.push({
        top: centerY - radius * 2 * Math.sin(angle),
        left: centerX + radius * 2 * Math.cos(angle),
      });
      // In-between circles
      const angle2 = ((i * 60 + 30) * Math.PI) / 180;
      result.push({
        top: centerY - radius * 1.732 * Math.sin(angle2),
        left: centerX + radius * 1.732 * Math.cos(angle2),
      });
    }

    return result;
  }, [centerX, centerY, radius]);

  return (
    <View style={{ width: size, height: size }}>
      {circles.map((pos, i) => (
        <Circle
          key={i}
          size={circleSize}
          top={pos.top}
          left={pos.left}
          opacity={opacity * (i < 7 ? 1 : 0.6)}
          borderColor={color}
          borderWidth={1}
        />
      ))}
    </View>
  );
});

// Six Petal Rosette - simple and elegant flower pattern
const SixPetalRosettePattern = memo(({ size, opacity, color }: { size: number; opacity: number; color: string }) => {
  const circleSize = size * 0.45;
  const radius = circleSize / 2;
  const centerX = size / 2 - radius;
  const centerY = size / 2 - radius;

  // 6 circles arranged to create petal effect
  const circles = useMemo(() => {
    const result: Array<{ top: number; left: number }> = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      result.push({
        top: centerY - radius * 0.5 * Math.sin(angle),
        left: centerX + radius * 0.5 * Math.cos(angle),
      });
    }
    return result;
  }, [centerX, centerY, radius]);

  return (
    <View style={{ width: size, height: size }}>
      {/* Outer boundary circle */}
      <Circle
        size={circleSize * 1.5}
        top={centerY - circleSize * 0.25}
        left={centerX - circleSize * 0.25}
        opacity={opacity * 0.5}
        borderColor={color}
        borderWidth={1}
      />
      {/* Petal circles */}
      {circles.map((pos, i) => (
        <Circle
          key={i}
          size={circleSize}
          top={pos.top}
          left={pos.left}
          opacity={opacity}
          borderColor={color}
          borderWidth={1.5}
        />
      ))}
    </View>
  );
});

export const SacredGeometryBackground = memo(function SacredGeometryBackground({
  variant = 'seedOfLife',
  opacity = 0.12,
  animate = true,
  color = colors.primary,
}: SacredGeometryBackgroundProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animate) return;

    // Slow rotation animation
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 180000, // 3 minutes for full rotation - very slow and meditative
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Subtle breathing animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 5000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 5000,
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
  }, [animate, rotateAnim, pulseAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const patternSize = SCREEN_WIDTH * 0.85;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.patternContainer,
          {
            transform: [
              { rotate: rotation },
              { scale: pulseAnim },
            ],
          },
        ]}
      >
        {variant === 'seedOfLife' && (
          <SeedOfLifePattern size={patternSize} opacity={opacity} color={color} />
        )}
        {variant === 'vesicaPiscis' && (
          <VesicaPiscisPattern size={patternSize} opacity={opacity} color={color} />
        )}
        {variant === 'flowerOfLife' && (
          <FlowerOfLifePattern size={patternSize} opacity={opacity} color={color} />
        )}
        {variant === 'sixPetalRosette' && (
          <SixPetalRosettePattern size={patternSize} opacity={opacity} color={color} />
        )}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  patternContainer: {
    position: 'absolute',
  },
  circle: {
    position: 'absolute',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
});

import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

export interface SectionDividerProps {
  /** Opacity of the rosette pattern (default: 0.20) */
  opacity?: number;
  /** Color of the pattern (default: colors.primary) */
  color?: string;
  /** Whether to show flanking horizontal lines (default: true) */
  showLines?: boolean;
  /** Size of the rosette (default: 36) */
  size?: number;
}

// Circle component for building the rosette
const Circle = memo(({
  size,
  top,
  left,
  opacity,
  borderColor,
}: {
  size: number;
  top: number;
  left: number;
  opacity: number;
  borderColor: string;
}) => (
  <View
    style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      top,
      left,
      borderColor,
      borderWidth: 1,
      backgroundColor: 'transparent',
      opacity,
    }}
  />
));

// Compact Six Petal Rosette for dividers
const MiniRosette = memo(({ size, opacity, color }: { size: number; opacity: number; color: string }) => {
  const circleSize = size * 0.5;
  const radius = circleSize / 2;
  const centerX = size / 2 - radius;
  const centerY = size / 2 - radius;

  const circles = useMemo(() => {
    const result: Array<{ top: number; left: number }> = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      result.push({
        top: centerY - radius * 0.4 * Math.sin(angle),
        left: centerX + radius * 0.4 * Math.cos(angle),
      });
    }
    return result;
  }, [centerX, centerY, radius]);

  return (
    <View style={{ width: size, height: size }}>
      {/* Outer boundary circle */}
      <Circle
        size={circleSize * 1.3}
        top={centerY - circleSize * 0.15}
        left={centerX - circleSize * 0.15}
        opacity={opacity * 0.6}
        borderColor={color}
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
        />
      ))}
    </View>
  );
});

export const SectionDivider = memo(function SectionDivider({
  opacity = 0.20,
  color = colors.primary,
  showLines = true,
  size = 36,
}: SectionDividerProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      {showLines && (
        <View style={[styles.line, { backgroundColor: color, opacity: opacity * 0.5 }]} />
      )}
      <View style={styles.rosetteWrapper}>
        <MiniRosette size={size} opacity={opacity} color={color} />
      </View>
      {showLines && (
        <View style={[styles.line, { backgroundColor: color, opacity: opacity * 0.5 }]} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
    maxWidth: 80,
  },
  rosetteWrapper: {
    marginHorizontal: spacing.sm,
  },
});

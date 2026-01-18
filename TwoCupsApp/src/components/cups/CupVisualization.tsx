import React, { memo, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing, typography, borderRadius, fonts } from '../../theme';

interface CupVisualizationProps {
  level: number; // 0-100
  label: string;
  sublabel?: string;
  gemCount?: number;
  variant?: 'individual' | 'collective';
  size?: 'small' | 'large';
}

export const CupVisualization = memo(function CupVisualization({
  level,
  label,
  sublabel,
  gemCount,
  variant = 'individual',
  size = 'large',
}: CupVisualizationProps) {
  const clampedLevel = Math.min(100, Math.max(0, level));
  const fillAnim = useRef(new Animated.Value(0)).current;
  
  const fillColor = useMemo(() => 
    variant === 'collective' ? colors.primary : colors.cupFilled,
    [variant]
  );
  
  const dimensions = useMemo(() => ({
    cupHeight: size === 'large' ? 120 : 80,
    cupWidth: size === 'large' ? 80 : 60,
  }), [size]);

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: clampedLevel,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clampedLevel, fillAnim]);

  const animatedHeight = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.label, size === 'small' && styles.labelSmall]}>{label}</Text>
      {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      
      <View style={[styles.cupContainer, { height: dimensions.cupHeight, width: dimensions.cupWidth }]}>
        {/* Cup outline */}
        <View style={[styles.cup, { height: dimensions.cupHeight, width: dimensions.cupWidth }]}>
          {/* Fill level - animated */}
          <Animated.View
            style={[
              styles.fill,
              {
                height: animatedHeight,
                backgroundColor: fillColor,
              },
            ]}
          />
          {/* Level text overlay */}
          <View style={styles.levelOverlay}>
            <Text style={styles.levelText}>{clampedLevel}</Text>
          </View>
        </View>
      </View>

      {gemCount !== undefined && (
        <View style={styles.gemContainer}>
          <Text style={styles.gemIcon}>💎</Text>
          <Text style={styles.gemCount}>{gemCount}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  label: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  labelSmall: {
    ...typography.body,
  },
  sublabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cupContainer: {
    marginVertical: spacing.sm,
  },
  cup: {
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.cupEmpty,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  levelOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelText: {
    ...typography.h2,
    color: colors.textPrimary,
    fontFamily: fonts.bold,
  },
  gemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  gemIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  gemCount: {
    ...typography.body,
    color: colors.gem,
    fontFamily: fonts.bold,
  },
});

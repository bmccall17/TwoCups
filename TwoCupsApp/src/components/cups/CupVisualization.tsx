import React, { memo, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing, typography, borderRadius, fonts } from '../../theme';
import { GemBreakdown, EMPTY_GEM_BREAKDOWN } from '../../types';
import { GEM_VALUES, GEM_COLORS } from '../../services/api/actions';

interface CupVisualizationProps {
  level: number; // 0-100 (still used for backward compat and single-color mode)
  label: string;
  sublabel?: string;
  gemCount?: number;
  variant?: 'individual' | 'collective';
  size?: 'small' | 'large';
  // Gem economy props - NEW
  liquidBreakdown?: GemBreakdown; // For multi-layer mosaic rendering
  showMosaic?: boolean; // Enable mosaic mode (default: true if liquidBreakdown provided)
}

// Calculate total level from liquid breakdown
function calculateTotalLevel(breakdown: GemBreakdown): number {
  return (
    breakdown.emerald * GEM_VALUES.emerald +
    breakdown.sapphire * GEM_VALUES.sapphire +
    breakdown.ruby * GEM_VALUES.ruby +
    breakdown.diamond * GEM_VALUES.diamond
  );
}

// Calculate layer heights as percentages
function calculateLayerPercentages(breakdown: GemBreakdown, totalLevel: number): {
  emerald: number;
  sapphire: number;
  ruby: number;
  diamond: number;
} {
  if (totalLevel === 0) {
    return { emerald: 0, sapphire: 0, ruby: 0, diamond: 0 };
  }

  const emeraldValue = breakdown.emerald * GEM_VALUES.emerald;
  const sapphireValue = breakdown.sapphire * GEM_VALUES.sapphire;
  const rubyValue = breakdown.ruby * GEM_VALUES.ruby;
  const diamondValue = breakdown.diamond * GEM_VALUES.diamond;

  return {
    emerald: (emeraldValue / totalLevel) * 100,
    sapphire: (sapphireValue / totalLevel) * 100,
    ruby: (rubyValue / totalLevel) * 100,
    diamond: (diamondValue / totalLevel) * 100,
  };
}

export const CupVisualization = memo(function CupVisualization({
  level,
  label,
  sublabel,
  gemCount,
  variant = 'individual',
  size = 'large',
  liquidBreakdown,
  showMosaic,
}: CupVisualizationProps) {
  // Determine if we should use mosaic mode
  const useMosaic = showMosaic ?? (liquidBreakdown !== undefined);
  const breakdown = liquidBreakdown || EMPTY_GEM_BREAKDOWN;

  // Calculate level from breakdown if using mosaic, otherwise use provided level
  const calculatedLevel = useMosaic ? calculateTotalLevel(breakdown) : level;
  const displayLevel = Math.min(100, Math.max(0, calculatedLevel % 100)); // Wrap at 100

  const fillAnim = useRef(new Animated.Value(0)).current;

  const fillColor = useMemo(() =>
    variant === 'collective' ? colors.primary : colors.cupFilled,
    [variant]
  );

  const dimensions = useMemo(() => ({
    cupHeight: size === 'large' ? 120 : 80,
    cupWidth: size === 'large' ? 80 : 60,
  }), [size]);

  // Layer percentages for mosaic mode
  const layerPercentages = useMemo(() =>
    calculateLayerPercentages(breakdown, displayLevel),
    [breakdown, displayLevel]
  );

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: displayLevel,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [displayLevel, fillAnim]);

  const animatedHeight = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // Render mosaic layers (stacked from bottom: emerald, sapphire, ruby, diamond)
  const renderMosaicLayers = () => {
    const layers = [
      { type: 'emerald', color: GEM_COLORS.emerald, percent: layerPercentages.emerald },
      { type: 'sapphire', color: GEM_COLORS.sapphire, percent: layerPercentages.sapphire },
      { type: 'ruby', color: GEM_COLORS.ruby, percent: layerPercentages.ruby },
      { type: 'diamond', color: GEM_COLORS.diamond, percent: layerPercentages.diamond },
    ].filter(layer => layer.percent > 0);

    return (
      <Animated.View
        style={[
          styles.mosaicContainer,
          { height: animatedHeight },
        ]}
      >
        {layers.map((layer, index) => (
          <View
            key={layer.type}
            style={[
              styles.mosaicLayer,
              {
                backgroundColor: layer.color,
                flex: layer.percent,
              },
              index === 0 && styles.mosaicLayerBottom,
            ]}
          />
        ))}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, size === 'small' && styles.labelSmall]}>{label}</Text>
      {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}

      <View style={[styles.cupContainer, { height: dimensions.cupHeight, width: dimensions.cupWidth }]}>
        {/* Cup outline */}
        <View style={[styles.cup, { height: dimensions.cupHeight, width: dimensions.cupWidth }]}>
          {/* Fill level - mosaic or single color */}
          {useMosaic ? (
            renderMosaicLayers()
          ) : (
            <Animated.View
              style={[
                styles.fill,
                {
                  height: animatedHeight,
                  backgroundColor: fillColor,
                },
              ]}
            />
          )}
          {/* Level text overlay */}
          <View style={styles.levelOverlay}>
            <Text style={styles.levelText}>{displayLevel}</Text>
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
  mosaicContainer: {
    width: '100%',
    flexDirection: 'column-reverse', // Stack from bottom
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    overflow: 'hidden',
  },
  mosaicLayer: {
    width: '100%',
  },
  mosaicLayerBottom: {
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

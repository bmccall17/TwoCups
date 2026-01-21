import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { GemType, GemState } from '../../types';
import { GEM_COLORS } from '../../services/api/actions';
import { colors, spacing, borderRadius } from '../../theme';

interface GemIconProps {
  type: GemType;
  state?: GemState;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  style?: ViewStyle;
}

// Gem emoji mapping
const GEM_EMOJIS: Record<GemType, string> = {
  emerald: '💚',   // Green heart for emerald
  sapphire: '💙',  // Blue heart for sapphire
  ruby: '❤️',      // Red heart for ruby
  diamond: '💎',   // Diamond
};

// Gem labels
const GEM_LABELS: Record<GemType, string> = {
  emerald: 'Emerald',
  sapphire: 'Sapphire',
  ruby: 'Ruby',
  diamond: 'Diamond',
};

// Size dimensions
const SIZE_MAP = {
  small: { icon: 14, container: 24 },
  medium: { icon: 20, container: 32 },
  large: { icon: 28, container: 44 },
};

export const GemIcon = memo(function GemIcon({
  type,
  state = 'liquid',
  size = 'medium',
  showLabel = false,
  style,
}: GemIconProps) {
  const dimensions = SIZE_MAP[size];
  const gemColor = GEM_COLORS[type];

  // State-based opacity/effects
  const stateOpacity = state === 'coal' ? 0.4 : state === 'solid' ? 0.7 : 1;
  const isCoal = state === 'coal';

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.iconContainer,
          {
            width: dimensions.container,
            height: dimensions.container,
            backgroundColor: isCoal ? colors.textMuted : gemColor + '30',
            opacity: stateOpacity,
          },
        ]}
      >
        <Text style={[styles.icon, { fontSize: dimensions.icon }]}>
          {isCoal ? '�ite️' : GEM_EMOJIS[type]}
        </Text>
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: isCoal ? colors.textMuted : gemColor }]}>
          {isCoal ? 'Coal' : GEM_LABELS[type]}
        </Text>
      )}
    </View>
  );
});

// Gem breakdown display component
interface GemBreakdownDisplayProps {
  emerald?: number;
  sapphire?: number;
  ruby?: number;
  diamond?: number;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  showZeros?: boolean;
}

export const GemBreakdownDisplay = memo(function GemBreakdownDisplay({
  emerald = 0,
  sapphire = 0,
  ruby = 0,
  diamond = 0,
  size = 'small',
  showLabels = false,
  showZeros = false,
}: GemBreakdownDisplayProps) {
  const gems: { type: GemType; count: number }[] = [
    { type: 'emerald', count: emerald },
    { type: 'sapphire', count: sapphire },
    { type: 'ruby', count: ruby },
    { type: 'diamond', count: diamond },
  ].filter(gem => showZeros || gem.count > 0);

  if (gems.length === 0) return null;

  return (
    <View style={styles.breakdownContainer}>
      {gems.map(gem => (
        <View key={gem.type} style={styles.breakdownItem}>
          <GemIcon type={gem.type} size={size} />
          <Text style={[styles.breakdownCount, { color: GEM_COLORS[gem.type] }]}>
            {gem.count}
          </Text>
          {showLabels && (
            <Text style={styles.breakdownLabel}>{GEM_LABELS[gem.type]}</Text>
          )}
        </View>
      ))}
    </View>
  );
});

// Attempt gem indicator (shows gem type and state)
interface AttemptGemIndicatorProps {
  gemType?: GemType;
  gemState?: GemState;
  size?: 'small' | 'medium';
}

export const AttemptGemIndicator = memo(function AttemptGemIndicator({
  gemType = 'emerald',
  gemState = 'solid',
  size = 'small',
}: AttemptGemIndicatorProps) {
  const stateLabel = gemState === 'coal' ? 'Coal' : gemState === 'solid' ? 'Pending' : 'Complete';

  return (
    <View style={styles.attemptIndicator}>
      <GemIcon type={gemType} state={gemState} size={size} />
      <Text style={[
        styles.stateLabel,
        { color: gemState === 'coal' ? colors.textMuted : gemState === 'solid' ? colors.warning : colors.success }
      ]}>
        {stateLabel}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  iconContainer: {
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    textAlign: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  // Breakdown styles
  breakdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  breakdownCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Attempt indicator styles
  attemptIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stateLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});

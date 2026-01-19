import React, { ReactNode } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { spacing } from '../../theme';

type SpacingKey = keyof typeof spacing;

export interface RowProps {
  children: ReactNode;

  /** Gap between children. Use spacing key ('xs', 'sm', 'md', 'lg', 'xl') or number */
  gap?: SpacingKey | number;

  /** Vertical alignment of children */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';

  /** Horizontal distribution of children */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';

  /** Allow children to wrap to next line */
  wrap?: boolean;

  /** Additional style */
  style?: StyleProp<ViewStyle>;
}

const alignMap: Record<NonNullable<RowProps['align']>, ViewStyle['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

const justifyMap: Record<NonNullable<RowProps['justify']>, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

/**
 * Row - Horizontal layout with gap
 *
 * Replaces patterns like:
 * ```tsx
 * <View style={{ flexDirection: 'row', alignItems: 'center' }}>
 *   <View style={{ marginRight: spacing.md }}>...</View>
 *   <View>...</View>
 * </View>
 * ```
 *
 * With:
 * ```tsx
 * <Row gap="md" align="center">
 *   <View>...</View>
 *   <View>...</View>
 * </Row>
 * ```
 *
 * Usage:
 * ```tsx
 * <Row gap="sm" align="center">
 *   <Icon />
 *   <AppText>Label</AppText>
 * </Row>
 *
 * <Row justify="between">
 *   <AppText>Left</AppText>
 *   <AppText>Right</AppText>
 * </Row>
 *
 * <Row gap="md" wrap>
 *   {chips.map(chip => <Chip key={chip} />)}
 * </Row>
 * ```
 */
export function Row({
  children,
  gap = 0,
  align = 'center',
  justify,
  wrap = false,
  style,
}: RowProps) {
  const gapValue = typeof gap === 'number' ? gap : spacing[gap];

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    gap: gapValue,
    alignItems: alignMap[align],
    ...(justify && { justifyContent: justifyMap[justify] }),
    ...(wrap && { flexWrap: 'wrap' }),
  };

  return (
    <View style={[containerStyle, style]}>
      {children}
    </View>
  );
}

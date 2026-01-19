import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { spacing } from '../../theme';

type SpacingKey = keyof typeof spacing;

export interface StackProps {
  children: ReactNode;

  /** Gap between children. Use spacing key ('xs', 'sm', 'md', 'lg', 'xl') or number */
  gap?: SpacingKey | number;

  /** Horizontal alignment of children */
  align?: 'start' | 'center' | 'end' | 'stretch';

  /** Vertical distribution of children */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';

  /** Additional style */
  style?: StyleProp<ViewStyle>;
}

const alignMap: Record<NonNullable<StackProps['align']>, ViewStyle['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const justifyMap: Record<NonNullable<StackProps['justify']>, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

/**
 * Stack - Vertical layout with gap
 *
 * Replaces patterns like:
 * ```tsx
 * <View style={{ marginBottom: spacing.md }}>...</View>
 * <View style={{ marginBottom: spacing.md }}>...</View>
 * ```
 *
 * With:
 * ```tsx
 * <Stack gap="md">
 *   <View>...</View>
 *   <View>...</View>
 * </Stack>
 * ```
 *
 * Usage:
 * ```tsx
 * <Stack gap="lg">
 *   <AppText variant="h1">Title</AppText>
 *   <AppText variant="body">Content</AppText>
 * </Stack>
 *
 * <Stack gap="md" align="center">
 *   <Button title="Centered" />
 * </Stack>
 *
 * <Stack gap={24}>
 *   <Card>...</Card>
 * </Stack>
 * ```
 */
export function Stack({
  children,
  gap = 0,
  align,
  justify,
  style,
}: StackProps) {
  const gapValue = typeof gap === 'number' ? gap : spacing[gap];

  const containerStyle: ViewStyle = {
    flexDirection: 'column',
    gap: gapValue,
    ...(align && { alignItems: alignMap[align] }),
    ...(justify && { justifyContent: justifyMap[justify] }),
  };

  return (
    <View style={[containerStyle, style]}>
      {children}
    </View>
  );
}

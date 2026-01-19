import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useFontSize } from '../../context/FontSizeContext';
import { colors, fonts } from '../../theme';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'button';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  bold?: boolean;
  children: React.ReactNode;
}

export function AppText({
  variant = 'body',
  color,
  bold,
  style,
  children,
  ...props
}: AppTextProps) {
  const { scaledTypography } = useFontSize();

  const variantStyle = scaledTypography[variant];

  return (
    <Text
      style={[
        styles.base,
        {
          fontSize: variantStyle.fontSize,
          lineHeight: variantStyle.lineHeight,
          fontFamily: bold ? fonts.bold : variantStyle.fontFamily,
        },
        color && { color },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.textPrimary,
  },
});

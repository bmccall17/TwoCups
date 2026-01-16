import React from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TextInputProps as RNTextInputProps,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  showCharacterCount?: boolean;
}

export function TextInput({ label, error, style, showCharacterCount, maxLength, value, ...props }: TextInputProps) {
  const characterCount = value?.length ?? 0;
  const isNearLimit = maxLength && characterCount >= maxLength * 0.9;
  const isAtLimit = maxLength && characterCount >= maxLength;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.textMuted}
        maxLength={maxLength}
        value={value}
        {...props}
      />
      <View style={styles.bottomRow}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <View style={styles.spacer} />
        )}
        {showCharacterCount && maxLength && (
          <Text
            style={[
              styles.characterCount,
              isNearLimit && styles.characterCountWarning,
              isAtLimit && styles.characterCountLimit,
            ]}
          >
            {characterCount}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    minHeight: 16,
  },
  spacer: {
    flex: 1,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
  characterCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  characterCountWarning: {
    color: colors.warning,
  },
  characterCountLimit: {
    color: colors.error,
  },
});

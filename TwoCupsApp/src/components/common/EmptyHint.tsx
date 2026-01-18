import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';

/**
 * EmptyHint - Reusable hint component for empty list states
 *
 * Consolidates the repeated empty list hint pattern used in:
 * - AcknowledgeScreen (requests empty hint)
 * - AcknowledgeScreen (suggestions empty hint)
 *
 * @see docs/DOM_REFACTOR_ROLLBACK.md for rollback instructions
 */
export interface EmptyHintProps {
  /** Message to display */
  message: string;
}

export const EmptyHint = memo(function EmptyHint({ message }: EmptyHintProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface + '60',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  text: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

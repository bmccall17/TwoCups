import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';

/**
 * SectionHeader - Reusable header component for sections
 *
 * Consolidates the repeated icon + title + badge pattern used across:
 * - AcknowledgeScreen collapsibleTitleRow
 * - AcknowledgeScreen sectionHeader
 * - Can be extended to other screens
 *
 * @see docs/DOM_REFACTOR_ROLLBACK.md for rollback instructions
 */
export interface SectionHeaderProps {
  /** Emoji or icon to display */
  icon: string;
  /** Section title text */
  title: string;
  /** Optional count to display in badge */
  count?: number;
  /** Optional text to display after count (e.g., "active") */
  countSuffix?: string;
  /** Badge background color (defaults to primary) */
  accentColor?: string;
  /** Optional element to render on the right side */
  rightElement?: React.ReactNode;
  /** Use larger heading style (for prominent sections) */
  prominent?: boolean;
}

export const SectionHeader = memo(function SectionHeader({
  icon,
  title,
  count,
  countSuffix,
  accentColor = colors.primary,
  rightElement,
  prominent = false,
}: SectionHeaderProps) {
  const showBadge = count !== undefined && count > 0;
  const badgeText = countSuffix ? `${count} ${countSuffix}` : `${count}`;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, prominent && styles.titleProminent]}>{title}</Text>
      {showBadge && (
        <View style={[styles.badge, { backgroundColor: accentColor }]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}
      {rightElement}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  titleProminent: {
    ...typography.h3,
    flex: 1,
  },
  badge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
});

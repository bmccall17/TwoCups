import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { Attempt } from '../../types';

interface TimelineEntryCardProps {
  attempt: Attempt;
  isInitiatedByMe: boolean;
  initiatorName: string;
  recipientName: string;
  onSendReminder?: () => void;
}

export const TimelineEntryCard = React.memo(function TimelineEntryCard({
  attempt,
  isInitiatedByMe,
  initiatorName,
  recipientName,
  onSendReminder,
}: TimelineEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  const borderColor = isInitiatedByMe ? colors.primary : colors.emerald500;
  const initiatorColor = isInitiatedByMe ? colors.primary : colors.emerald400;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: borderColor }]}
      onPress={() => setIsExpanded(!isExpanded)}
      activeOpacity={0.7}
    >
      {/* Header: Who → Who + Timestamp */}
      <View style={styles.header}>
        <View style={styles.namesContainer}>
          <Text style={[styles.initiatorName, { color: initiatorColor }]}>
            {initiatorName}
          </Text>
          <Text style={styles.arrow}> → </Text>
          <Text style={styles.recipientName}>{recipientName}</Text>
        </View>
        <Text style={styles.timestamp}>{getTimeAgo(attempt.createdAt)}</Text>
      </View>

      {/* Main Content: Bid Description */}
      <Text style={styles.description}>{attempt.action}</Text>
      {attempt.description && (
        <Text style={styles.additionalDescription}>{attempt.description}</Text>
      )}

      {/* Footer: Category + Status */}
      <View style={styles.footer}>
        {attempt.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{attempt.category}</Text>
          </View>
        )}
        <View style={styles.statusContainer}>
          {attempt.acknowledged ? (
            <View style={styles.acknowledgedStatus}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.acknowledgedText}>Acknowledged</Text>
            </View>
          ) : (
            <Text style={styles.pendingText}>Pending</Text>
          )}
        </View>
      </View>

      {/* Expandable Details */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Logged:</Text>
              <Text style={styles.detailValue}>
                {attempt.createdAt.toLocaleString()}
              </Text>
            </View>
            {attempt.acknowledgedAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Acknowledged:</Text>
                <Text style={styles.detailValue}>
                  {attempt.acknowledgedAt.toLocaleString()}
                </Text>
              </View>
            )}
            {!attempt.acknowledged && onSendReminder && (
              <TouchableOpacity
                style={styles.reminderButton}
                onPress={onSendReminder}
                activeOpacity={0.7}
              >
                <Text style={styles.reminderButtonText}>Send Reminder</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Expand/Collapse Icon - Single element with conditional content */}
      <View style={styles.expandIcon}>
        <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  namesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  initiatorName: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  arrow: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  recipientName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  timestamp: {
    ...typography.caption,
    color: colors.textMuted,
  },
  description: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  additionalDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acknowledgedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkmark: {
    fontSize: 12,
    color: colors.emerald400,
  },
  acknowledgedText: {
    ...typography.caption,
    color: colors.emerald400,
    fontWeight: '600',
  },
  pendingText: {
    ...typography.caption,
    color: colors.amber400,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  detailsContainer: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  reminderButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  reminderButtonText: {
    ...typography.bodySmall,
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  expandIcon: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
  },
  chevron: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { AppText } from '../common';

export type DateRangeFilterType = 'today' | 'last7days' | 'last30days' | 'alltime';
export type StatusFilterType = 'all' | 'pending' | 'acknowledged';

interface CollapsibleFilterControlsProps {
  dateFilter: DateRangeFilterType;
  statusFilter: StatusFilterType;
  onDateFilterChange: (filter: DateRangeFilterType) => void;
  onStatusFilterChange: (filter: StatusFilterType) => void;
  defaultCollapsed?: boolean;
}

export const CollapsibleFilterControls = React.memo(function CollapsibleFilterControls({
  dateFilter,
  statusFilter,
  onDateFilterChange,
  onStatusFilterChange,
  defaultCollapsed = true,
}: CollapsibleFilterControlsProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  const getDateLabel = (filter: DateRangeFilterType): string => {
    switch (filter) {
      case 'today': return '1d';
      case 'last7days': return '7d';
      case 'last30days': return '30d';
      case 'alltime': return 'All';
    }
  };

  const getStatusLabel = (filter: StatusFilterType): string => {
    switch (filter) {
      case 'all': return 'All';
      case 'pending': return 'Waiting';
      case 'acknowledged': return 'Done';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <AppText style={styles.headerText}>Filters</AppText>
        <View style={styles.headerRight}>
          <View style={styles.currentFilters}>
            <AppText style={styles.filterBadge}>{getDateLabel(dateFilter)}</AppText>
            <AppText style={styles.filterBadge}>{getStatusLabel(statusFilter)}</AppText>
          </View>
          <AppText style={styles.chevron}>{isExpanded ? '▲' : '▼'}</AppText>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.filterContent}>
          {/* Period Filter */}
          <View style={styles.filterSection}>
            <AppText style={styles.filterLabel}>Period</AppText>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, dateFilter === 'last7days' && styles.filterOptionActive]}
                onPress={() => onDateFilterChange('last7days')}
                activeOpacity={0.7}
              >
                <AppText style={styles.filterOptionIcon}>📅</AppText>
                <AppText style={[styles.filterOptionText, dateFilter === 'last7days' && styles.filterOptionTextActive]}>
                  7d
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, dateFilter === 'last30days' && styles.filterOptionActive]}
                onPress={() => onDateFilterChange('last30days')}
                activeOpacity={0.7}
              >
                <AppText style={styles.filterOptionIcon}>📆</AppText>
                <AppText style={[styles.filterOptionText, dateFilter === 'last30days' && styles.filterOptionTextActive]}>
                  30d
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, dateFilter === 'alltime' && styles.filterOptionActive]}
                onPress={() => onDateFilterChange('alltime')}
                activeOpacity={0.7}
              >
                <AppText style={styles.filterOptionIcon}>∞</AppText>
                <AppText style={[styles.filterOptionText, dateFilter === 'alltime' && styles.filterOptionTextActive]}>
                  All
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <AppText style={styles.filterLabel}>Status</AppText>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, statusFilter === 'all' && styles.filterOptionActive]}
                onPress={() => onStatusFilterChange('all')}
                activeOpacity={0.7}
              >
                <AppText style={styles.filterOptionIcon}>✨</AppText>
                <AppText style={[styles.filterOptionText, statusFilter === 'all' && styles.filterOptionTextActive]}>
                  All
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, statusFilter === 'pending' && styles.filterOptionActive]}
                onPress={() => onStatusFilterChange('pending')}
                activeOpacity={0.7}
              >
                <AppText style={styles.filterOptionIcon}>⏳</AppText>
                <AppText style={[styles.filterOptionText, statusFilter === 'pending' && styles.filterOptionTextActive]}>
                  Waiting
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, statusFilter === 'acknowledged' && styles.filterOptionActive]}
                onPress={() => onStatusFilterChange('acknowledged')}
                activeOpacity={0.7}
              >
                <AppText style={styles.filterOptionIcon}>✓</AppText>
                <AppText style={[styles.filterOptionText, statusFilter === 'acknowledged' && styles.filterOptionTextActive]}>
                  Done
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  headerText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currentFilters: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterBadge: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    fontWeight: '600',
  },
  filterContent: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.md,
  },
  filterSection: {
    gap: spacing.sm,
  },
  filterLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.background + '80',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOptionActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterOptionIcon: {
    fontSize: 16,
  },
  filterOptionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

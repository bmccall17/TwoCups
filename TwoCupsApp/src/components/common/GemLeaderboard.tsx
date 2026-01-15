import React, { useEffect, useState, memo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { getWeeklyGemStats, WeeklyGemStats } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface GemLeaderboardProps {
  myGems: number;
  partnerGems: number;
  myPlayerId: string;
  partnerPlayerId: string;
  myName?: string;
  partnerName?: string;
}

type ViewMode = 'weekly' | 'allTime';

function getCollaborativeMessage(total: number): string {
  if (total === 0) {
    return "Your journey together is just beginning! 🌱";
  }
  if (total >= 100) {
    return "Y'all are building something beautiful together! 💕";
  }
  if (total >= 50) {
    return "Look at all this care flowing between you! ✨";
  }
  if (total >= 20) {
    return "You're finding your rhythm together! 🌊";
  }
  return "Every gem represents a moment of care! 💜";
}

export const GemLeaderboard = memo(function GemLeaderboard({
  myGems,
  partnerGems,
  myPlayerId,
  partnerPlayerId,
  myName = 'Me',
  partnerName = 'Partner',
}: GemLeaderboardProps) {
  const { userData } = useAuth();
  const coupleId = userData?.activeCoupleId;

  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [weeklyStats, setWeeklyStats] = useState<WeeklyGemStats | null>(null);
  const [loading, setLoading] = useState(false);

  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [viewMode, myGems, partnerGems, weeklyStats]);

  useEffect(() => {
    if (!coupleId || !myPlayerId || !partnerPlayerId) return;

    const fetchWeeklyStats = async () => {
      setLoading(true);
      try {
        const stats = await getWeeklyGemStats(coupleId, myPlayerId, partnerPlayerId);
        setWeeklyStats(stats);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyStats();
  }, [coupleId, myPlayerId, partnerPlayerId, myGems, partnerGems]);

  const displayMyGems = viewMode === 'weekly' ? (weeklyStats?.myWeeklyGems ?? 0) : myGems;
  const displayPartnerGems = viewMode === 'weekly' ? (weeklyStats?.partnerWeeklyGems ?? 0) : partnerGems;
  const combinedTotal = displayMyGems + displayPartnerGems;

  const maxGems = Math.max(displayMyGems, displayPartnerGems, 1);

  const myBarWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${(displayMyGems / maxGems) * 100}%`],
  });

  const partnerBarWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${(displayPartnerGems / maxGems) * 100}%`],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>💫</Text>
        <Text style={styles.headerText}>Our Shared Journey</Text>
        <Text style={styles.headerIcon}>💫</Text>
      </View>

      {/* Combined Total - Prominent */}
      <View style={styles.combinedTotalContainer}>
        <Text style={styles.combinedLabel}>Together</Text>
        <View style={styles.combinedValueRow}>
          <Text style={styles.combinedEmoji}>💎</Text>
          <Text style={styles.combinedValue}>{combinedTotal.toLocaleString()}</Text>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'weekly' && styles.toggleButtonActive]}
          onPress={() => setViewMode('weekly')}
        >
          <Text style={[styles.toggleText, viewMode === 'weekly' && styles.toggleTextActive]}>
            This Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'allTime' && styles.toggleButtonActive]}
          onPress={() => setViewMode('allTime')}
        >
          <Text style={[styles.toggleText, viewMode === 'allTime' && styles.toggleTextActive]}>
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bar Chart - Now collaborative, not competitive */}
      <View style={styles.chartContainer}>
        {/* My Bar */}
        <View style={styles.barRow}>
          <View style={styles.labelContainer}>
            <Text style={styles.playerLabel}>{myName}</Text>
          </View>
          <View style={styles.barContainer}>
            <Animated.View
              style={[
                styles.bar,
                styles.myBar,
                { width: myBarWidth },
              ]}
            />
            <Text style={styles.gemCount}>💎 {displayMyGems}</Text>
          </View>
        </View>

        {/* Partner Bar */}
        <View style={styles.barRow}>
          <View style={styles.labelContainer}>
            <Text style={styles.playerLabel}>{partnerName}</Text>
          </View>
          <View style={styles.barContainer}>
            <Animated.View
              style={[
                styles.bar,
                styles.partnerBar,
                { width: partnerBarWidth },
              ]}
            />
            <Text style={styles.gemCount}>💎 {displayPartnerGems}</Text>
          </View>
        </View>
      </View>

      {/* Collaborative Message */}
      <View style={styles.messageContainer}>
        <Text style={styles.message}>
          {loading && viewMode === 'weekly'
            ? '✨ Counting gems...'
            : getCollaborativeMessage(combinedTotal)
          }
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gem + '30',
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerIcon: {
    fontSize: 14,
    marginHorizontal: spacing.xs,
  },
  headerText: {
    ...typography.bodySmall,
    color: colors.gem,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  combinedTotalContainer: {
    alignItems: 'center',
    backgroundColor: colors.gem + '15',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  combinedLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  combinedValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  combinedEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  combinedValue: {
    ...typography.h2,
    color: colors.gem,
    fontWeight: '700',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  toggleButtonActive: {
    backgroundColor: colors.gem + '30',
  },
  toggleText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: colors.gem,
    fontWeight: '600',
  },
  chartContainer: {
    marginBottom: spacing.md,
  },
  barRow: {
    marginBottom: spacing.md,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  playerLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  barContainer: {
    height: 32,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  bar: {
    height: '100%',
    borderRadius: borderRadius.md,
    minWidth: 4,
  },
  myBar: {
    backgroundColor: colors.primary + '80',
  },
  partnerBar: {
    backgroundColor: colors.primaryLight + '80',
  },
  gemCount: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    position: 'absolute',
    right: spacing.sm,
  },
  messageContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  message: {
    ...typography.bodySmall,
    color: colors.primaryLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

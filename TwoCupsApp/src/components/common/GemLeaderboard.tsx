import React, { useEffect, useState } from 'react';
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

function getChampionMessage(myGems: number, partnerGems: number, myName: string, partnerName: string): string {
  const diff = Math.abs(myGems - partnerGems);
  
  if (myGems === partnerGems) {
    return "You're both Gem Champions! 🏆💕";
  }
  
  if (diff <= 5) {
    return "Neck and neck! What a team! 🤝";
  }
  
  if (myGems > partnerGems) {
    if (diff > 50) return "You're crushing it! 💪✨";
    if (diff > 20) return "You're on a roll! Keep going! 🌟";
    return "Nice lead! Every gem counts! 💎";
  } else {
    if (diff > 50) return `${partnerName} is on fire! 🔥`;
    if (diff > 20) return `${partnerName} is shining! ✨`;
    return `${partnerName} has a slight edge! 💜`;
  }
}

function getLeaderLabel(isLeading: boolean, isTied: boolean): string | null {
  if (isTied) return null;
  return isLeading ? '👑 Gem Champion' : null;
}

export function GemLeaderboard({
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
  
  const barAnim = React.useRef(new Animated.Value(0)).current;

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
  
  const maxGems = Math.max(displayMyGems, displayPartnerGems, 1);
  const isTied = displayMyGems === displayPartnerGems;
  const myLeading = displayMyGems > displayPartnerGems;
  const partnerLeading = displayPartnerGems > displayMyGems;

  const myBarWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${(displayMyGems / maxGems) * 100}%`],
  });

  const partnerBarWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${(displayPartnerGems / maxGems) * 100}%`],
  });

  const myLeaderLabel = getLeaderLabel(myLeading, isTied);
  const partnerLeaderLabel = getLeaderLabel(partnerLeading, isTied);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🏆</Text>
        <Text style={styles.headerText}>Gem Leaderboard</Text>
        <Text style={styles.headerIcon}>🏆</Text>
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

      {/* Bar Chart */}
      <View style={styles.chartContainer}>
        {/* My Bar */}
        <View style={styles.barRow}>
          <View style={styles.labelContainer}>
            <Text style={styles.playerLabel}>{myName}</Text>
            {myLeaderLabel && <Text style={styles.leaderBadge}>{myLeaderLabel}</Text>}
          </View>
          <View style={styles.barContainer}>
            <Animated.View
              style={[
                styles.bar,
                styles.myBar,
                { width: myBarWidth },
                myLeading && styles.leadingBar,
              ]}
            />
            <Text style={styles.gemCount}>💎 {displayMyGems}</Text>
          </View>
        </View>

        {/* Partner Bar */}
        <View style={styles.barRow}>
          <View style={styles.labelContainer}>
            <Text style={styles.playerLabel}>{partnerName}</Text>
            {partnerLeaderLabel && <Text style={styles.leaderBadge}>{partnerLeaderLabel}</Text>}
          </View>
          <View style={styles.barContainer}>
            <Animated.View
              style={[
                styles.bar,
                styles.partnerBar,
                { width: partnerBarWidth },
                partnerLeading && styles.leadingBar,
              ]}
            />
            <Text style={styles.gemCount}>💎 {displayPartnerGems}</Text>
          </View>
        </View>
      </View>

      {/* Playful Message */}
      <View style={styles.messageContainer}>
        <Text style={styles.message}>
          {loading && viewMode === 'weekly' 
            ? '✨ Counting gems...' 
            : getChampionMessage(displayMyGems, displayPartnerGems, myName, partnerName)
          }
        </Text>
      </View>
    </View>
  );
}

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
  leaderBadge: {
    ...typography.caption,
    color: colors.warning,
    marginLeft: spacing.sm,
    fontWeight: '600',
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
  leadingBar: {
    backgroundColor: colors.gem,
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

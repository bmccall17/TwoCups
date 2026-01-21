import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useMilestoneCelebration } from '../context/MilestoneCelebrationContext';
import { usePlayerData } from '../hooks';
import { Screen, Stack, Row, AppText, LoadingSpinner, ErrorState, SacredGeometryBackground, SectionDivider } from '../components/common';
import { CupVisualization } from '../components/cups';
import { GemBreakdownDisplay } from '../components/gems';
import { colors, spacing, borderRadius } from '../theme';
import { EMPTY_GEM_BREAKDOWN } from '../types';

interface HomeScreenProps {
  onNavigateToLogAttempt?: () => void;
  onNavigateToAcknowledge?: () => void;
  onNavigateToGemHistory?: () => void;
}

export function HomeScreen({
  onNavigateToLogAttempt,
  onNavigateToAcknowledge,
  onNavigateToGemHistory,
}: HomeScreenProps) {
  const { userData, coupleData } = useAuth();
  const { myPlayer, partnerPlayer, partnerName, loading, error, refresh } = usePlayerData();
  const { checkMilestone } = useMilestoneCelebration();
  const previousGemCount = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 500);
  }, [refresh]);

  const myName = useMemo(() => userData?.username || 'Me', [userData?.username]);
  const collectiveLevel = useMemo(() => coupleData?.collectiveCupLevel ?? 0, [coupleData?.collectiveCupLevel]);

  const myCupLevel = useMemo(() => myPlayer?.cupLevel ?? 0, [myPlayer?.cupLevel]);
  const partnerCupLevel = useMemo(() => partnerPlayer?.cupLevel ?? 0, [partnerPlayer?.cupLevel]);
  const myGemCount = useMemo(() => myPlayer?.gemCount ?? 0, [myPlayer?.gemCount]);
  const partnerGemCount = useMemo(() => partnerPlayer?.gemCount ?? 0, [partnerPlayer?.gemCount]);

  // Gem economy data
  const myLiquidBreakdown = useMemo(() => myPlayer?.liquidBreakdown ?? EMPTY_GEM_BREAKDOWN, [myPlayer?.liquidBreakdown]);
  const partnerLiquidBreakdown = useMemo(() => partnerPlayer?.liquidBreakdown ?? EMPTY_GEM_BREAKDOWN, [partnerPlayer?.liquidBreakdown]);
  const myGemBreakdown = useMemo(() => myPlayer?.gemBreakdown ?? EMPTY_GEM_BREAKDOWN, [myPlayer?.gemBreakdown]);

  useEffect(() => {
    if (myPlayer && previousGemCount.current !== null) {
      if (myPlayer.gemCount > previousGemCount.current) {
        checkMilestone(myPlayer.gemCount, myPlayer.achievedMilestones);
      }
    }
    if (myPlayer) {
      previousGemCount.current = myPlayer.gemCount;
    }
  }, [myPlayer?.gemCount, myPlayer?.achievedMilestones, checkMilestone]);

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (error) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={refresh} />
      </Screen>
    );
  }

  const totalGems = myGemCount + partnerGemCount;

  return (
    <Screen scroll onRefresh={handleRefresh} refreshing={refreshing}>
      {/* Sacred Geometry Background - Seed of Life at enhanced opacity */}
      <SacredGeometryBackground
        variant="seedOfLife"
        opacity={0.11}
        color={colors.primary}
      />

      <Stack gap="sm">
        {/* Compact Header */}
        <Stack align="center" gap={2}>
          <AppText variant="h2" style={styles.title}>Two Cups</AppText>
          <AppText variant="caption" color={colors.textSecondary}>Welcome, {myName}</AppText>
        </Stack>

        {/* Connection Section - Two cups with Vesica Piscis */}
        <View style={styles.cupsPairContainer}>
          {/* Vesica Piscis - sacred symbol of two becoming one */}
          <View style={styles.vesicaPiscisContainer}>
            <SacredGeometryBackground
              variant="vesicaPiscis"
              opacity={0.20}
              color={colors.primary}
              secondaryColor={colors.emerald400}
              size={200}
              animate={true}
              inline={true}
            />
          </View>

          {/* Two cups side by side */}
          <Row align="center" justify="center" gap="md" style={styles.cupsPair}>
            <CupVisualization
              level={myCupLevel}
              label={myName}
              size="small"
              liquidBreakdown={myLiquidBreakdown}
            />
            <Text style={styles.connectionHeart}>💕</Text>
            <CupVisualization
              level={partnerCupLevel}
              label={partnerName}
              size="small"
              liquidBreakdown={partnerLiquidBreakdown}
            />
          </Row>
        </View>

        {/* Section Divider */}
        <SectionDivider opacity={0.22} color={colors.primary} />

        {/* HERO: Collective Cup - Large and Prominent */}
        <View style={styles.collectiveHero}>
          {/* Seed of Life background behind collective cup */}
          <View style={styles.collectiveGeometryBackground}>
            <SacredGeometryBackground
              variant="seedOfLife"
              opacity={0.18}
              color={colors.primary}
              size={280}
              animate={true}
              inline={true}
            />
          </View>

          <Stack align="center" gap="sm" style={styles.collectiveContent}>
            <Row align="center" gap="sm">
              <Text style={styles.collectiveEmoji}>✨</Text>
              <AppText variant="body" color={colors.primary} bold style={styles.collectiveLabel}>Our Cup Together</AppText>
              <Text style={styles.collectiveEmoji}>✨</Text>
            </Row>

            <View style={styles.collectiveCupLarge}>
              <CupVisualization
                level={collectiveLevel}
                label=""
                variant="collective"
                size="large"
              />
            </View>

            <AppText variant="bodySmall" color={colors.textSecondary} style={styles.collectiveSublabel}>Fill it with love & care</AppText>
          </Stack>
        </View>

        {/* Simple Total Gems Display */}
        <TouchableOpacity
          style={styles.gemsSimple}
          onPress={onNavigateToGemHistory}
          activeOpacity={0.8}
        >
          <AppText variant="caption" color={colors.gem} style={styles.gemsLabel}>Shared Gems</AppText>
          <Row align="center" gap="sm">
            <Text style={styles.gemsIcon}>💎</Text>
            <AppText variant="h2" bold>{totalGems.toLocaleString()}</AppText>
          </Row>
          {/* Gem breakdown by type */}
          <View style={styles.gemBreakdownRow}>
            <GemBreakdownDisplay
              emerald={myGemBreakdown.emerald}
              sapphire={myGemBreakdown.sapphire}
              ruby={myGemBreakdown.ruby}
              diamond={myGemBreakdown.diamond}
              size="small"
            />
          </View>
        </TouchableOpacity>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Connection section - cups pair
  cupsPairContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  vesicaPiscisContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -100 }],
    zIndex: 0,
  },
  cupsPair: {
    zIndex: 1,
  },
  connectionHeart: {
    fontSize: 20,
  },
  // HERO: Collective Cup - Large and Prominent
  collectiveHero: {
    position: 'relative',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  collectiveGeometryBackground: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -140 }, { translateY: -140 }],
    zIndex: 0,
  },
  collectiveContent: {
    zIndex: 1,
  },
  collectiveEmoji: {
    fontSize: 16,
  },
  collectiveLabel: {
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  collectiveCupLarge: {
    // Container for cup
  },
  collectiveSublabel: {
    fontStyle: 'italic',
  },
  // Simple Gems Display
  gemsSimple: {
    backgroundColor: colors.surface + '60',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gem + '30',
  },
  gemsLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  gemsIcon: {
    fontSize: 24,
  },
  gemBreakdownRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

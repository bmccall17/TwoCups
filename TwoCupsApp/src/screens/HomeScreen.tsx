import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, RefreshControl, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useMilestoneCelebration } from '../context/MilestoneCelebrationContext';
import { usePlayerData } from '../hooks';
import { LoadingSpinner, ErrorState, SacredGeometryBackground, SectionDivider } from '../components/common';
import { CupVisualization } from '../components/cups';
import { colors, spacing, typography, borderRadius } from '../theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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
      <SafeAreaView style={styles.container}>
        <ErrorState error={error} onRetry={refresh} />
      </SafeAreaView>
    );
  }

  const totalGems = myGemCount + partnerGemCount;

  return (
    <SafeAreaView style={styles.container}>
      {/* Sacred Geometry Background - Seed of Life at enhanced opacity */}
      <SacredGeometryBackground
        variant="seedOfLife"
        opacity={0.11}
        color={colors.primary}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Compact Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Two Cups</Text>
          <Text style={styles.subtitle}>Welcome, {myName}</Text>
        </View>

        {/* Connection Section - Two cups with Vesica Piscis */}
        <View style={styles.connectionSection}>
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
            <View style={styles.cupsPair}>
              {/* My Cup */}
              <View style={styles.cupWrapper}>
                <CupVisualization
                  level={myCupLevel}
                  label={myName}
                  size="small"
                />
              </View>

              {/* Connection indicator */}
              <View style={styles.connectionIndicator}>
                <Text style={styles.connectionHeart}>💕</Text>
              </View>

              {/* Partner's Cup */}
              <View style={styles.cupWrapper}>
                <CupVisualization
                  level={partnerCupLevel}
                  label={partnerName}
                  size="small"
                />
              </View>
            </View>
          </View>
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

          <View style={styles.collectiveContent}>
            <View style={styles.collectiveHeader}>
              <Text style={styles.collectiveEmoji}>✨</Text>
              <Text style={styles.collectiveLabel}>Our Cup Together</Text>
              <Text style={styles.collectiveEmoji}>✨</Text>
            </View>

            <View style={styles.collectiveCupLarge}>
              <CupVisualization
                level={collectiveLevel}
                label=""
                variant="collective"
                size="large"
              />
            </View>

            <Text style={styles.collectiveSublabel}>Fill it with love & care</Text>
          </View>
        </View>

        {/* Simple Total Gems Display */}
        <TouchableOpacity
          style={styles.gemsSimple}
          onPress={onNavigateToGemHistory}
          activeOpacity={0.8}
        >
          <Text style={styles.gemsLabel}>Shared Gems</Text>
          <View style={styles.gemsRow}>
            <Text style={styles.gemsIcon}>💎</Text>
            <Text style={styles.gemsCount}>{totalGems.toLocaleString()}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: 100, // Space for tab bar
  },
  // Compact Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Connection section - compact
  connectionSection: {
    marginBottom: spacing.xs,
  },
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  cupWrapper: {
    alignItems: 'center',
  },
  connectionIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
  },
  connectionHeart: {
    fontSize: 20,
  },
  // HERO: Collective Cup - Large and Prominent
  collectiveHero: {
    position: 'relative',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginVertical: spacing.sm,
  },
  collectiveGeometryBackground: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -140 }, { translateY: -140 }],
    zIndex: 0,
  },
  collectiveContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  collectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  collectiveEmoji: {
    fontSize: 16,
  },
  collectiveLabel: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginHorizontal: spacing.sm,
  },
  collectiveCupLarge: {
    marginVertical: spacing.sm,
  },
  collectiveSublabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  // Simple Gems Display
  gemsSimple: {
    backgroundColor: colors.surface + '60',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gem + '30',
    marginTop: spacing.sm,
  },
  gemsLabel: {
    ...typography.caption,
    color: colors.gem,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  gemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gemsIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  gemsCount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, RefreshControl, ScrollView, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useMilestoneCelebration } from '../context/MilestoneCelebrationContext';
import { usePlayerData } from '../hooks';
import { LoadingSpinner, ErrorState, GemCounter, SacredGeometryBackground } from '../components/common';
import { CupVisualization } from '../components/cups';
import { colors, spacing, typography, borderRadius } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Sacred Geometry Background */}
      <SacredGeometryBackground
        variant="flowerOfLife"
        opacity={0.06}
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>💜</Text>
          <Text style={styles.title}>Two Cups</Text>
          <Text style={styles.subtitle}>Welcome, {myName}</Text>
        </View>

        {/* Connection Section */}
        <View style={styles.connectionSection}>
          <Text style={styles.connectionTitle}>Our Connection</Text>

          {/* Two cups side by side */}
          <View style={styles.cupsPair}>
            {/* My Cup */}
            <View style={styles.cupWrapper}>
              <View style={[styles.cupGlow, { backgroundColor: colors.primary + '15' }]} />
              <CupVisualization
                level={myCupLevel}
                label={myName}
                size="small"
              />
            </View>

            {/* Connection indicator */}
            <View style={styles.connectionIndicator}>
              <View style={styles.connectionLine} />
              <Text style={styles.connectionHeart}>💕</Text>
              <View style={styles.connectionLine} />
            </View>

            {/* Partner's Cup */}
            <View style={styles.cupWrapper}>
              <View style={[styles.cupGlow, { backgroundColor: colors.emerald400 + '15' }]} />
              <CupVisualization
                level={partnerCupLevel}
                label={partnerName}
                size="small"
              />
            </View>
          </View>
        </View>

        {/* Collective Cup - Compact */}
        <View style={styles.collectiveCard}>
          <View style={styles.collectiveRow}>
            <View style={styles.collectiveCupSmall}>
              <CupVisualization
                level={collectiveLevel}
                label=""
                variant="collective"
                size="small"
              />
            </View>
            <View style={styles.collectiveInfo}>
              <View style={styles.collectiveHeader}>
                <Text style={styles.collectiveEmoji}>✨</Text>
                <Text style={styles.collectiveLabel}>Together</Text>
                <Text style={styles.collectiveEmoji}>✨</Text>
              </View>
              <Text style={styles.collectiveSublabel}>Our Shared Progress</Text>
            </View>
          </View>
        </View>

        {/* Gem Counter */}
        <GemCounter
          myGems={myGemCount}
          partnerGems={partnerGemCount}
          myName={myName}
          partnerName={partnerName}
          onPress={onNavigateToGemHistory}
        />
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
    justifyContent: 'space-between',
  },
  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  headerEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.textPrimary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  // Connection section
  connectionSection: {
    marginBottom: spacing.md,
  },
  connectionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '300',
    letterSpacing: 1,
  },
  cupsPair: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cupWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  cupGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    top: 10,
  },
  connectionIndicator: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  connectionLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.primary + '30',
  },
  connectionHeart: {
    fontSize: 16,
    marginVertical: spacing.xs,
  },
  // Collective section - compact horizontal layout
  collectiveCard: {
    backgroundColor: colors.surface + '80',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '20',
    marginBottom: spacing.md,
  },
  collectiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectiveCupSmall: {
    marginRight: spacing.md,
  },
  collectiveInfo: {
    flex: 1,
  },
  collectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  collectiveEmoji: {
    fontSize: 12,
  },
  collectiveLabel: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginHorizontal: spacing.xs,
  },
  collectiveSublabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

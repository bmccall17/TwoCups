import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl, Animated, Easing, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useMilestoneCelebration } from '../context/MilestoneCelebrationContext';
import { usePlayerData } from '../hooks';
import { Button, LoadingSpinner, ErrorState, GemCounter, SacredGeometryBackground } from '../components/common';
import { CupVisualization } from '../components/cups';
import { colors, spacing, typography, borderRadius } from '../theme';

interface HomeScreenProps {
  onNavigateToLogAttempt?: () => void;
  onNavigateToAcknowledge?: () => void;
  onNavigateToMakeRequest?: () => void;
  onNavigateToManageSuggestions?: () => void;
  onNavigateToGemHistory?: () => void;
}

export function HomeScreen({
  onNavigateToLogAttempt,
  onNavigateToAcknowledge,
  onNavigateToMakeRequest,
  onNavigateToManageSuggestions,
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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with mystical aesthetic */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>💜</Text>
          <Text style={styles.title}>Two Cups</Text>
          <Text style={styles.subtitle}>Welcome, {myName}</Text>
        </View>

        {/* Connection Section - Vesica Piscis inspired */}
        <View style={styles.connectionSection}>
          <Text style={styles.connectionTitle}>Our Connection</Text>

          {/* Two cups side by side representing the union */}
          <View style={styles.cupsPair}>
            {/* My Cup */}
            <View style={styles.cupWrapper}>
              <View style={[styles.cupGlow, { backgroundColor: colors.primary + '15' }]} />
              <CupVisualization
                level={myCupLevel}
                label={myName}
                size="large"
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
                size="large"
              />
            </View>
          </View>

          {/* Collective progress */}
          <View style={styles.collectiveSection}>
            <View style={styles.collectiveCard}>
              <View style={styles.collectiveHeader}>
                <Text style={styles.collectiveEmoji}>✨</Text>
                <Text style={styles.collectiveLabel}>Together</Text>
                <Text style={styles.collectiveEmoji}>✨</Text>
              </View>
              <View style={styles.collectiveCupContainer}>
                <CupVisualization
                  level={collectiveLevel}
                  label=""
                  variant="collective"
                  size="large"
                />
              </View>
              <Text style={styles.collectiveSublabel}>Our Shared Progress</Text>
            </View>
          </View>
        </View>

        {/* Gem Counter Section */}
        <GemCounter
          myGems={myGemCount}
          partnerGems={partnerGemCount}
          myName={myName}
          partnerName={partnerName}
          onPress={onNavigateToGemHistory}
        />

        {/* Quick Actions with better styling */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Ways to Connect</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={onNavigateToMakeRequest}
            activeOpacity={0.8}
          >
            <Text style={styles.actionEmoji}>📝</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Make a Request</Text>
              <Text style={styles.actionDescription}>Ask your partner for something meaningful</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={onNavigateToManageSuggestions}
            activeOpacity={0.8}
          >
            <Text style={styles.actionEmoji}>💡</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Suggestions</Text>
              <Text style={styles.actionDescription}>Ideas for how your partner can fill your cup</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Spacer for bottom nav */}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.md,
  },
  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: colors.textPrimary,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  // Connection section
  connectionSection: {
    marginBottom: spacing.lg,
  },
  connectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '300',
    letterSpacing: 1,
  },
  cupsPair: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cupWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  cupGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: 20,
  },
  connectionIndicator: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  connectionLine: {
    width: 2,
    height: 20,
    backgroundColor: colors.primary + '30',
  },
  connectionHeart: {
    fontSize: 20,
    marginVertical: spacing.xs,
  },
  // Collective section
  collectiveSection: {
    alignItems: 'center',
  },
  collectiveCard: {
    backgroundColor: colors.surface + '80',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '20',
    width: '100%',
  },
  collectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  collectiveEmoji: {
    fontSize: 14,
  },
  collectiveLabel: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginHorizontal: spacing.sm,
  },
  collectiveCupContainer: {
    alignItems: 'center',
  },
  collectiveSublabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  // Actions section
  actionsSection: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface + '60',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionEmoji: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

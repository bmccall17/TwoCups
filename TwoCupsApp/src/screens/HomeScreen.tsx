import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useMilestoneCelebration } from '../context/MilestoneCelebrationContext';
import { usePlayerData } from '../hooks';
import { Button, LoadingSpinner, ErrorState, GemCounter } from '../components/common';
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
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Two Cups</Text>
          <Text style={styles.subtitle}>Welcome, {myName}!</Text>
        </View>

        {/* Gem Counter Section */}
        <GemCounter
          myGems={myGemCount}
          partnerGems={partnerGemCount}
          myName={myName}
          partnerName={partnerName}
          onPress={onNavigateToGemHistory}
        />

        {/* Cups Section */}
        <View style={styles.cupsSection}>
          {/* Individual Cups Row */}
          <View style={styles.individualCups}>
            <CupVisualization
              level={myCupLevel}
              label="My Cup"
              sublabel={myName}
              size="large"
            />
            <CupVisualization
              level={partnerCupLevel}
              label="Partner's Cup"
              sublabel={partnerName}
              size="large"
            />
          </View>

          {/* Collective Cup */}
          <View style={styles.collectiveCupContainer}>
            <CupVisualization
              level={collectiveLevel}
              label="Our Cup"
              sublabel="Collective Progress"
              variant="collective"
              size="large"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <Button
            title="📝 Make a Request"
            onPress={onNavigateToMakeRequest ?? (() => {})}
            style={styles.actionButton}
            variant="outline"
          />

          <Button
            title="💡 Manage My Suggestions"
            onPress={onNavigateToManageSuggestions ?? (() => {})}
            style={styles.actionButton}
            variant="outline"
          />
        </View>
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
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  cupsSection: {
    marginBottom: spacing.xl,
  },
  individualCups: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  collectiveCupContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  actionsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
});

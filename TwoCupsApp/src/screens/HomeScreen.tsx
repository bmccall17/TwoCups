import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { usePlayerData } from '../hooks';
import { Button, LoadingSpinner } from '../components/common';
import { CupVisualization } from '../components/cups';
import { colors, spacing, typography, borderRadius } from '../theme';

interface HomeScreenProps {
  onNavigateToLogAttempt?: () => void;
  onNavigateToAcknowledge?: () => void;
  onNavigateToMakeRequest?: () => void;
}

export function HomeScreen({
  onNavigateToLogAttempt,
  onNavigateToAcknowledge,
  onNavigateToMakeRequest,
}: HomeScreenProps) {
  const { userData, coupleData, signOut } = useAuth();
  const { myPlayer, partnerPlayer, partnerName, loading } = usePlayerData();

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  const myName = userData?.displayName || 'Me';
  const collectiveLevel = coupleData?.collectiveCupLevel ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Two Cups</Text>
          <Text style={styles.subtitle}>Welcome, {myName}!</Text>
        </View>

        {/* Cups Section */}
        <View style={styles.cupsSection}>
          {/* Individual Cups Row */}
          <View style={styles.individualCups}>
            <CupVisualization
              level={myPlayer?.cupLevel ?? 0}
              label="My Cup"
              sublabel={myName}
              gemCount={myPlayer?.gemCount ?? 0}
              size="large"
            />
            <CupVisualization
              level={partnerPlayer?.cupLevel ?? 0}
              label="Partner's Cup"
              sublabel={partnerName}
              gemCount={partnerPlayer?.gemCount ?? 0}
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

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <Button
            title="📝 Make a Request"
            onPress={onNavigateToMakeRequest ?? (() => {})}
            style={styles.actionButton}
            variant="outline"
          />
          
          <Button
            title="💝 Log an Attempt"
            onPress={onNavigateToLogAttempt ?? (() => {})}
            style={styles.actionButton}
          />
          
          <Button
            title="✅ Acknowledge Attempts"
            onPress={onNavigateToAcknowledge ?? (() => {})}
            style={styles.actionButton}
            variant="secondary"
          />
        </View>

        {/* Sign Out */}
        <View style={styles.footer}>
          <Button
            title="Sign Out"
            onPress={signOut}
            variant="outline"
            style={styles.signOutButton}
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
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  signOutButton: {
    opacity: 0.7,
  },
});

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { usePlayerData } from '../hooks';
import { Button, ErrorState } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';

interface SettingsScreenProps {
  onNavigateToManageSuggestions?: () => void;
  onNavigateToMakeRequest?: () => void;
  onNavigateToGemHistory?: () => void;
}

export function SettingsScreen({
  onNavigateToManageSuggestions,
  onNavigateToMakeRequest,
  onNavigateToGemHistory,
}: SettingsScreenProps) {
  const { userData, coupleData, signOut } = useAuth();
  const { partnerName, error, refresh } = usePlayerData();

  const displayName = userData?.displayName || 'Guest';
  const inviteCode = coupleData?.inviteCode || '—';
  const isActive = coupleData?.status === 'active';

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
          </View>
          <ErrorState error={error} onRetry={refresh} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Display Name</Text>
            <Text style={styles.value}>{displayName}</Text>
          </View>
        </View>

        {/* Couple Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Couple</Text>
          {isActive ? (
            <View style={styles.card}>
              <Text style={styles.label}>Partner</Text>
              <Text style={styles.value}>{partnerName || 'Partner'}</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.label}>Invite Code</Text>
              <Text style={styles.value}>{inviteCode}</Text>
              <Text style={styles.hint}>Share this code with your partner</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <Button
            title="💎 Gem History"
            onPress={onNavigateToGemHistory ?? (() => {})}
            style={styles.actionButton}
            variant="outline"
          />
          
          <Button
            title="💡 Manage My Suggestions"
            onPress={onNavigateToManageSuggestions ?? (() => {})}
            style={styles.actionButton}
            variant="outline"
          />
          
          <Button
            title="📝 Make a Request"
            onPress={onNavigateToMakeRequest ?? (() => {})}
            style={styles.actionButton}
            variant="outline"
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
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
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

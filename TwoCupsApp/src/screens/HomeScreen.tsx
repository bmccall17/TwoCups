import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common';
import { colors, spacing, typography } from '../theme';

export function HomeScreen() {
  const { user, userData, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Two Cups</Text>
        <Text style={styles.subtitle}>Welcome, {userData?.displayName || 'Player'}!</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>User ID</Text>
          <Text style={styles.infoValue}>{user?.uid?.slice(0, 8)}...</Text>

          {userData?.activeCoupleId && (
            <>
              <Text style={styles.infoLabel}>Couple ID</Text>
              <Text style={styles.infoValue}>
                {userData.activeCoupleId.slice(0, 8)}...
              </Text>
            </>
          )}
        </View>

        <Text style={styles.placeholder}>
          Home dashboard coming soon...
        </Text>

        <Button
          title="Sign Out"
          onPress={signOut}
          variant="outline"
          style={styles.signOutButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  infoCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    width: '100%',
    marginBottom: spacing.xl,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  placeholder: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  signOutButton: {
    width: '100%',
  },
});

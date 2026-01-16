import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { usePlayerData } from '../hooks';
import { Button, ErrorState, TextInput } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';
import { isUsernameAvailable, updateUsername } from '../services/api/usernames';
import {
  validateUsername,
  sanitizeUsername,
  MAX_LENGTHS,
  MIN_LENGTHS,
} from '../utils/validation';
import { auth } from '../services/firebase/config';

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

  const username = userData?.username || 'Guest';
  const inviteCode = coupleData?.inviteCode || '—';
  const isActive = coupleData?.status === 'active';

  // Username change modal state
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [savingUsername, setSavingUsername] = useState(false);

  // Debounced username availability check
  useEffect(() => {
    if (!showUsernameModal) return;

    const sanitized = sanitizeUsername(newUsername);
    const validation = validateUsername(sanitized);

    // Reset availability if username is invalid or same as current
    if (!validation.isValid || sanitized.length < MIN_LENGTHS.USERNAME) {
      setUsernameAvailable(null);
      setUsernameError(validation.error);
      return;
    }

    if (sanitized === userData?.username?.toLowerCase()) {
      setUsernameAvailable(null);
      setUsernameError('This is your current username');
      return;
    }

    setUsernameError(undefined);
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(sanitized);
        setUsernameAvailable(available);
        if (!available) {
          setUsernameError('Username is already taken');
        }
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newUsername, showUsernameModal, userData?.username]);

  const handleOpenUsernameModal = () => {
    setNewUsername('');
    setUsernameAvailable(null);
    setUsernameError(undefined);
    setShowUsernameModal(true);
  };

  const handleSaveUsername = async () => {
    if (!usernameAvailable || !userData?.username) return;

    const uid = auth.currentUser?.uid;
    const email = auth.currentUser?.email;
    if (!uid || !email) {
      Alert.alert('Error', 'You must be logged in to change your username');
      return;
    }

    setSavingUsername(true);
    try {
      await updateUsername(
        userData.username,
        sanitizeUsername(newUsername),
        uid,
        email
      );
      setShowUsernameModal(false);
      Alert.alert('Success', 'Username updated successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update username';
      Alert.alert('Error', message);
    } finally {
      setSavingUsername(false);
    }
  };

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
            <View style={styles.profileRow}>
              <View>
                <Text style={styles.label}>Username</Text>
                <Text style={styles.value}>{username}</Text>
              </View>
              <Button
                title="Change"
                onPress={handleOpenUsernameModal}
                variant="secondary"
                style={styles.changeButton}
              />
            </View>
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

      {/* Username Change Modal */}
      <Modal
        visible={showUsernameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUsernameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Username</Text>
            <Text style={styles.modalSubtitle}>
              Current: {username}
            </Text>

            <View style={styles.usernameInputContainer}>
              <TextInput
                label="New Username"
                value={newUsername}
                onChangeText={setNewUsername}
                error={usernameError}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="letters, numbers, underscores"
                maxLength={MAX_LENGTHS.USERNAME}
              />
              {checkingUsername && (
                <View style={styles.usernameStatus}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
              {!checkingUsername && usernameAvailable === true && (
                <View style={styles.usernameStatus}>
                  <Text style={styles.availableText}>Available</Text>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowUsernameModal(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Save"
                onPress={handleSaveUsername}
                loading={savingUsername}
                disabled={!usernameAvailable}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  usernameInputContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  usernameStatus: {
    position: 'absolute',
    right: 12,
    top: 38,
  },
  availableText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});

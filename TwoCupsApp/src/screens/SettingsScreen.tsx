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
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { usePlayerData } from '../hooks';
import { Button, ErrorState, TextInput } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';
import { isUsernameAvailable, setUsername, updateUsername } from '../services/api/usernames';
import {
  validateUsername,
  validateEmail,
  validatePassword,
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
  const { user, userData, coupleData, signOut } = useAuth();
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

  // Email change modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [savingEmail, setSavingEmail] = useState(false);

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [savingPassword, setSavingPassword] = useState(false);

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
    console.log('[SettingsScreen] Save clicked, usernameAvailable:', usernameAvailable, 'newUsername:', newUsername);

    // Relaxed check - just need a non-empty username
    const sanitizedNewUsername = sanitizeUsername(newUsername);
    if (!sanitizedNewUsername) {
      console.log('[SettingsScreen] No username entered');
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    const uid = user?.uid;
    const email = user?.email || 'anonymous@guest.local'; // Fallback for anonymous users
    console.log('[SettingsScreen] Auth state:', { uid, email, isAnonymous: user?.isAnonymous });

    if (!uid) {
      Alert.alert('Error', 'You must be logged in to change your username');
      return;
    }

    setSavingUsername(true);
    try {
      console.log('[SettingsScreen] Calling username update...');

      if (userData?.username) {
        // User has existing username - update it
        console.log('[SettingsScreen] Updating existing username:', userData.username, '->', sanitizedNewUsername);
        await updateUsername(
          userData.username,
          sanitizedNewUsername,
          uid,
          email
        );
      } else {
        // User doesn't have a username yet - set it for the first time
        console.log('[SettingsScreen] Setting new username:', sanitizedNewUsername);
        await setUsername(sanitizedNewUsername, uid, email);
      }

      console.log('[SettingsScreen] Username update successful!');
      setShowUsernameModal(false);
      Alert.alert('Success', 'Username updated successfully');
    } catch (err) {
      console.error('[SettingsScreen] Username update failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to update username';
      Alert.alert('Error', message);
    } finally {
      setSavingUsername(false);
    }
  };

  // Email change handlers
  const handleOpenEmailModal = () => {
    setNewEmail('');
    setEmailCurrentPassword('');
    setEmailError(undefined);
    setShowEmailModal(true);
  };

  const handleSaveEmail = async () => {
    // Validate new email
    const emailValidation = validateEmail(newEmail.trim());
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error);
      return;
    }

    if (!emailCurrentPassword) {
      setEmailError('Please enter your current password');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      Alert.alert('Error', 'You must be logged in to change your email');
      return;
    }

    setSavingEmail(true);
    setEmailError(undefined);

    try {
      // Re-authenticate with current password
      const credential = EmailAuthProvider.credential(currentUser.email, emailCurrentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update email
      await updateEmail(currentUser, newEmail.trim().toLowerCase());

      setShowEmailModal(false);
      Alert.alert('Success', 'Email updated successfully');
    } catch (err: unknown) {
      console.error('[SettingsScreen] Email update failed:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/wrong-password') {
        setEmailError('Incorrect password');
      } else if (error.code === 'auth/email-already-in-use') {
        setEmailError('This email is already in use');
      } else if (error.code === 'auth/invalid-email') {
        setEmailError('Invalid email address');
      } else if (error.code === 'auth/requires-recent-login') {
        setEmailError('Please sign out and sign in again before changing your email');
      } else {
        setEmailError(error.message || 'Failed to update email');
      }
    } finally {
      setSavingEmail(false);
    }
  };

  // Password change handlers
  const handleOpenPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(undefined);
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    // Validate current password
    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error);
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      Alert.alert('Error', 'You must be logged in to change your password');
      return;
    }

    setSavingPassword(true);
    setPasswordError(undefined);

    try {
      // Re-authenticate with current password
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      setShowPasswordModal(false);
      Alert.alert('Success', 'Password updated successfully');
    } catch (err: unknown) {
      console.error('[SettingsScreen] Password update failed:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('New password is too weak');
      } else if (error.code === 'auth/requires-recent-login') {
        setPasswordError('Please sign out and sign in again before changing your password');
      } else {
        setPasswordError(error.message || 'Failed to update password');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  // Check if user is anonymous (can't change email/password)
  const isAnonymous = user?.isAnonymous ?? true;
  const userEmail = user?.email || 'Not set';

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

        {/* Account Section - Email & Password */}
        {!isAnonymous && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.card}>
              <View style={styles.profileRow}>
                <View style={styles.accountInfo}>
                  <Text style={styles.label}>Email</Text>
                  <Text style={styles.value} numberOfLines={1}>{userEmail}</Text>
                </View>
                <Button
                  title="Change"
                  onPress={handleOpenEmailModal}
                  variant="secondary"
                  style={styles.changeButton}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.profileRow}>
                <View>
                  <Text style={styles.label}>Password</Text>
                  <Text style={styles.value}>••••••••</Text>
                </View>
                <Button
                  title="Change"
                  onPress={handleOpenPasswordModal}
                  variant="secondary"
                  style={styles.changeButton}
                />
              </View>
            </View>
          </View>
        )}

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

      {/* Email Change Modal */}
      <Modal
        visible={showEmailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Email</Text>
            <Text style={styles.modalSubtitle}>
              Current: {userEmail}
            </Text>

            <TextInput
              label="New Email"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="your@newemail.com"
              maxLength={MAX_LENGTHS.EMAIL}
            />

            <TextInput
              label="Current Password"
              value={emailCurrentPassword}
              onChangeText={setEmailCurrentPassword}
              secureTextEntry
              placeholder="Enter your password to confirm"
              maxLength={MAX_LENGTHS.PASSWORD}
              error={emailError}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowEmailModal(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Save"
                onPress={handleSaveEmail}
                loading={savingEmail}
                disabled={!newEmail.trim() || !emailCurrentPassword}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Enter your current password"
              maxLength={MAX_LENGTHS.PASSWORD}
            />

            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Enter your new password"
              maxLength={MAX_LENGTHS.PASSWORD}
            />

            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Confirm your new password"
              maxLength={MAX_LENGTHS.PASSWORD}
              error={passwordError}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowPasswordModal(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Save"
                onPress={handleSavePassword}
                loading={savingPassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
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
  accountInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useFontSize, FontSizeOption } from '../context/FontSizeContext';
import { usePlayerData } from '../hooks';
import { AppText, Button, ErrorState, TextInput } from '../components/common';
import { colors, spacing, typography, borderRadius, fonts } from '../theme';
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

export function SettingsScreen() {
  const { user, userData, coupleData, signOut } = useAuth();
  const { fontSize, setFontSize, scaledTypography } = useFontSize();
  const { partnerName, error, refresh } = usePlayerData();
  const tabBarHeight = useBottomTabBarHeight();

  const FONT_SIZE_OPTIONS: { value: FontSizeOption; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  const username = userData?.username || 'Guest';
  const inviteCode = coupleData?.inviteCode || '—';
  const isActive = coupleData?.status === 'active';

  // Combined account edit modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | undefined>();

  // Debounced username availability check
  useEffect(() => {
    if (!showAccountModal) return;

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
  }, [newUsername, showAccountModal, userData?.username]);

  const handleOpenAccountModal = () => {
    setNewUsername('');
    setUsernameAvailable(null);
    setUsernameError(undefined);
    setNewEmail(user?.email || '');
    setEmailError(undefined);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(undefined);
    setAccountError(undefined);
    setShowAccountModal(true);
  };

  const handleSaveAccount = async () => {
    const sanitizedNewUsername = sanitizeUsername(newUsername);
    const emailChanged = newEmail.trim().toLowerCase() !== (user?.email || '').toLowerCase();
    const passwordChanged = newPassword.length > 0;
    const usernameChanged = sanitizedNewUsername.length > 0 && sanitizedNewUsername !== (userData?.username?.toLowerCase() || '');

    // Validate that at least one field is being changed
    if (!usernameChanged && !emailChanged && !passwordChanged) {
      setAccountError('No changes to save');
      return;
    }

    // If email or password is being changed, require current password
    if ((emailChanged || passwordChanged) && !currentPassword) {
      setAccountError('Please enter your current password to change email or password');
      return;
    }

    // Validate email if changed
    if (emailChanged) {
      const emailValidation = validateEmail(newEmail.trim());
      if (!emailValidation.isValid) {
        setEmailError(emailValidation.error);
        return;
      }
    }

    // Validate password if changed
    if (passwordChanged) {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        setPasswordError(passwordValidation.error);
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }
    }

    // Validate username if changed
    if (usernameChanged && !usernameAvailable) {
      setUsernameError('Please enter a valid, available username');
      return;
    }

    const currentUser = auth.currentUser;
    setSavingAccount(true);
    setAccountError(undefined);

    try {
      // Reauthenticate if needed for email/password change
      if ((emailChanged || passwordChanged) && currentUser?.email && currentPassword) {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
      }

      // Update username if changed
      if (usernameChanged && user?.uid) {
        const email = user.email || 'anonymous@guest.local';
        if (userData?.username) {
          await updateUsername(userData.username, sanitizedNewUsername, user.uid, email);
        } else {
          await setUsername(sanitizedNewUsername, user.uid, email);
        }
      }

      // Update email if changed
      if (emailChanged && currentUser) {
        await updateEmail(currentUser, newEmail.trim().toLowerCase());
      }

      // Update password if changed
      if (passwordChanged && currentUser) {
        await updatePassword(currentUser, newPassword);
      }

      setShowAccountModal(false);
      Alert.alert('Success', 'Account updated successfully');
    } catch (err: unknown) {
      console.error('[SettingsScreen] Account update failed:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/wrong-password') {
        setAccountError('Current password is incorrect');
      } else if (error.code === 'auth/email-already-in-use') {
        setEmailError('This email is already in use');
      } else if (error.code === 'auth/invalid-email') {
        setEmailError('Invalid email address');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('New password is too weak');
      } else if (error.code === 'auth/requires-recent-login') {
        setAccountError('Please sign out and sign in again before making changes');
      } else {
        setAccountError(error.message || 'Failed to update account');
      }
    } finally {
      setSavingAccount(false);
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
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight }]}>
        <View style={styles.header}>
          <AppText variant="h1">Settings</AppText>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <AppText variant="h3" style={styles.sectionTitle}>Profile</AppText>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View>
                <AppText variant="caption" color={colors.textSecondary} style={styles.label}>Username</AppText>
                <AppText variant="body">{username}</AppText>
              </View>
              <Button
                title="Change"
                onPress={handleOpenAccountModal}
                variant="secondary"
                style={styles.changeButton}
              />
            </View>
            {!isAnonymous && (
              <>
                <View style={styles.divider} />
                <View style={styles.profileRow}>
                  <View style={styles.accountInfo}>
                    <AppText variant="caption" color={colors.textSecondary} style={styles.label}>Email</AppText>
                    <AppText variant="body" numberOfLines={1}>{userEmail}</AppText>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.profileRow}>
                  <View>
                    <AppText variant="caption" color={colors.textSecondary} style={styles.label}>Password</AppText>
                    <AppText variant="body">••••••••</AppText>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Couple Section */}
        <View style={styles.section}>
          <AppText variant="h3" style={styles.sectionTitle}>Couple</AppText>
          {isActive ? (
            <View style={styles.card}>
              <AppText variant="caption" color={colors.textSecondary} style={styles.label}>Partner</AppText>
              <AppText variant="body">{partnerName || 'Partner'}</AppText>
            </View>
          ) : (
            <View style={styles.card}>
              <AppText variant="caption" color={colors.textSecondary} style={styles.label}>Invite Code</AppText>
              <AppText variant="body">{inviteCode}</AppText>
              <AppText variant="caption" color={colors.textMuted} style={styles.hint}>Share this code with your partner</AppText>
            </View>
          )}
        </View>

        {/* Accessibility Section */}
        <View style={styles.section}>
          <AppText variant="h3" style={styles.sectionTitle}>Accessibility</AppText>
          <View style={styles.card}>
            <AppText variant="caption" color={colors.textSecondary} style={styles.label}>Font Size</AppText>
            <View style={styles.fontSizeSelector}>
              {FONT_SIZE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={({ pressed }) => [
                    styles.fontSizeOption,
                    fontSize === option.value && styles.fontSizeOptionActive,
                    pressed && styles.fontSizeOptionPressed,
                  ]}
                  onPress={() => setFontSize(option.value)}
                >
                  <Text
                    style={[
                      { fontSize: scaledTypography.bodySmall.fontSize },
                      styles.fontSizeOptionText,
                      fontSize === option.value && styles.fontSizeOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Preview */}
            <View style={styles.fontSizePreview}>
              <Text style={styles.previewLabel}>Preview</Text>
              <AppText variant="h3" style={styles.previewHeading}>
                Heading Text
              </AppText>
              <AppText variant="body" style={styles.previewBody}>
                Body text shows how your content will look.
              </AppText>
              <AppText variant="caption" color={colors.textSecondary} style={styles.previewCaption}>
                Caption text for smaller details
              </AppText>
            </View>
          </View>
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

      {/* Edit Account Modal */}
      <Modal
        visible={showAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Account</Text>
              <Text style={styles.modalSubtitle}>
                Update your account details
              </Text>

              {accountError && (
                <Text style={styles.accountErrorText}>{accountError}</Text>
              )}

              {/* Username Section */}
              <Text style={styles.modalSectionTitle}>Username</Text>
              <View style={styles.usernameInputContainer}>
                <TextInput
                  label="New Username"
                  value={newUsername}
                  onChangeText={setNewUsername}
                  error={usernameError}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder={username}
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

              {/* Email Section - only show for non-anonymous users */}
              {!isAnonymous && (
                <>
                  <Text style={styles.modalSectionTitle}>Email</Text>
                  <TextInput
                    label="Email Address"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="your@email.com"
                    maxLength={MAX_LENGTHS.EMAIL}
                    error={emailError}
                  />

                  {/* Password Section */}
                  <Text style={styles.modalSectionTitle}>Password</Text>
                  <TextInput
                    label="Current Password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    placeholder="Required if changing email or password"
                    maxLength={MAX_LENGTHS.PASSWORD}
                  />

                  <TextInput
                    label="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholder="Leave blank to keep current"
                    maxLength={MAX_LENGTHS.PASSWORD}
                  />

                  <TextInput
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="Confirm new password"
                    maxLength={MAX_LENGTHS.PASSWORD}
                    error={passwordError}
                  />
                </>
              )}

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setShowAccountModal(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title="Save"
                  onPress={handleSaveAccount}
                  loading={savingAccount}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
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
    marginBottom: spacing.xs,
  },
  hint: {
    marginTop: spacing.xs,
  },
  fontSizeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 4,
    marginTop: spacing.sm,
  },
  fontSizeOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeOptionActive: {
    backgroundColor: colors.primary,
  },
  fontSizeOptionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  fontSizeOptionTextActive: {
    color: colors.textOnPrimary,
    fontFamily: fonts.bold,
  },
  fontSizeOptionPressed: {
    opacity: 0.7,
  },
  fontSizePreview: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  previewLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  previewHeading: {
    marginBottom: spacing.xs,
  },
  previewBody: {
    marginBottom: spacing.xs,
  },
  previewCaption: {
    // Color set via AppText color prop
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
    padding: spacing.md,
  },
  modalScrollView: {
    maxHeight: '90%',
    width: Math.min(Dimensions.get('window').width - spacing.md * 2, 400),
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
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
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountErrorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.sm,
  },
  usernameInputContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
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
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
});

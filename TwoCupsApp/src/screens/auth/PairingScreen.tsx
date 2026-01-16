import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, TextInput } from '../../components/common';
import { createCouple, joinCouple } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { getErrorMessage } from '../../types/utils';
import {
  validateDisplayName,
  validateInitial,
  validateInviteCode,
  sanitizeText,
  sanitizeInitial,
  sanitizeInviteCode,
  MAX_LENGTHS,
} from '../../utils/validation';

type Mode = 'choice' | 'create' | 'join';

export function PairingScreen() {
  const { signOut, coupleData } = useAuth();
  // If user already has a pending couple, show the invite code
  const existingInviteCode = coupleData?.status === 'pending' ? coupleData.inviteCode : null;

  const [mode, setMode] = useState<Mode>('choice');
  const [displayName, setDisplayName] = useState('');
  const [initial, setInitial] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    initial?: string;
    inviteCode?: string;
  }>({});

  // Update state when coupleData loads with existing pending couple
  useEffect(() => {
    if (existingInviteCode) {
      setMode('create');
      setGeneratedCode(existingInviteCode);
    }
  }, [existingInviteCode]);

  const validate = () => {
    const newErrors: typeof errors = {};

    const displayNameValidation = validateDisplayName(displayName);
    if (!displayNameValidation.isValid) {
      newErrors.displayName = displayNameValidation.error;
    }

    const initialValidation = validateInitial(initial);
    if (!initialValidation.isValid) {
      newErrors.initial = initialValidation.error;
    }

    if (mode === 'join') {
      const inviteCodeValidation = validateInviteCode(inviteCode);
      if (!inviteCodeValidation.isValid) {
        newErrors.inviteCode = inviteCodeValidation.error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateCouple = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await createCouple({
        displayName: sanitizeText(displayName),
        initial: sanitizeInitial(initial),
      });

      setGeneratedCode(result.inviteCode);
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error) || 'Failed to create couple');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCouple = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const sanitizedCode = sanitizeInviteCode(inviteCode);
      console.log('[PairingScreen] Joining couple with code:', sanitizedCode);
      const result = await joinCouple({
        inviteCode: sanitizedCode,
        displayName: sanitizeText(displayName),
        initial: sanitizeInitial(initial),
      });
      console.log('[PairingScreen] Join successful:', result);
      // Navigation happens automatically via AuthContext when coupleData.status becomes 'active'
    } catch (error: unknown) {
      console.error('[PairingScreen] Join failed:', error);
      Alert.alert('Error', getErrorMessage(error) || 'Failed to join couple');
    } finally {
      setLoading(false);
    }
  };

  const handleShareCode = async () => {
    if (!generatedCode) return;

    try {
      await Share.share({
        message: `Join me on Two Cups! Use invite code: ${generatedCode}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const renderChoice = () => (
    <View style={styles.choiceContainer}>
      <Text style={styles.title}>Get Started</Text>
      <Text style={styles.subtitle}>
        Two Cups is for couples. Create a new couple or join your partner.
      </Text>

      <Button
        title="Create New Couple"
        onPress={() => setMode('create')}
        style={styles.choiceButton}
      />

      <Button
        title="Join with Invite Code"
        onPress={() => setMode('join')}
        variant="outline"
        style={styles.choiceButton}
      />

      <Button
        title="Sign Out"
        onPress={signOut}
        variant="secondary"
        style={styles.signOutButton}
      />
    </View>
  );

  const renderCreateForm = () => (
    <View>
      <Text style={styles.title}>Create Couple</Text>
      <Text style={styles.subtitle}>
        Set up your profile and get an invite code for your partner.
      </Text>

      {generatedCode ? (
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Your Invite Code</Text>
          <Text style={styles.code}>{generatedCode}</Text>
          <Text style={styles.codeHint}>
            Share this code with your partner. It expires in 72 hours.
          </Text>
          <Button
            title="Share Code"
            onPress={handleShareCode}
            style={styles.shareButton}
          />
          <Text style={styles.waitingText}>
            Waiting for your partner to join...
          </Text>
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            label="Your Name"
            value={displayName}
            onChangeText={setDisplayName}
            error={errors.displayName}
            placeholder="How your partner knows you"
            maxLength={MAX_LENGTHS.DISPLAY_NAME}
            showCharacterCount
          />

          <TextInput
            label="Your Initial"
            value={initial}
            onChangeText={(text) => setInitial(text.slice(0, 1))}
            error={errors.initial}
            placeholder="A single letter"
            maxLength={MAX_LENGTHS.INITIAL}
            autoCapitalize="characters"
          />

          <Button
            title="Create & Get Code"
            onPress={handleCreateCouple}
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      )}

      {!existingInviteCode && (
        <Button
          title="Back"
          onPress={() => {
            setMode('choice');
            setGeneratedCode(null);
          }}
          variant="outline"
          style={styles.backButton}
        />
      )}
    </View>
  );

  const renderJoinForm = () => (
    <View>
      <Text style={styles.title}>Join Couple</Text>
      <Text style={styles.subtitle}>
        Enter the invite code from your partner.
      </Text>

      <View style={styles.form}>
        <TextInput
          label="Invite Code"
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          error={errors.inviteCode}
          placeholder="6-character code"
          maxLength={MAX_LENGTHS.INVITE_CODE}
          autoCapitalize="characters"
        />

        <TextInput
          label="Your Name"
          value={displayName}
          onChangeText={setDisplayName}
          error={errors.displayName}
          placeholder="How your partner knows you"
          maxLength={MAX_LENGTHS.DISPLAY_NAME}
          showCharacterCount
        />

        <TextInput
          label="Your Initial"
          value={initial}
          onChangeText={(text) => setInitial(text.slice(0, 1))}
          error={errors.initial}
          placeholder="A single letter"
          maxLength={MAX_LENGTHS.INITIAL}
          autoCapitalize="characters"
        />

        <Button
          title="Join Couple"
          onPress={handleJoinCouple}
          loading={loading}
          style={styles.submitButton}
        />
      </View>

      <Button
        title="Back"
        onPress={() => setMode('choice')}
        variant="outline"
        style={styles.backButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {mode === 'choice' && renderChoice()}
          {mode === 'create' && renderCreateForm()}
          {mode === 'join' && renderJoinForm()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  choiceContainer: {
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  choiceButton: {
    width: '100%',
    marginBottom: spacing.md,
  },
  signOutButton: {
    width: '100%',
    marginTop: spacing.lg,
  },
  form: {
    marginBottom: spacing.lg,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  backButton: {
    marginTop: spacing.md,
  },
  codeContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  codeLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  code: {
    ...typography.h1,
    color: colors.primary,
    letterSpacing: 8,
    marginBottom: spacing.md,
  },
  codeHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  shareButton: {
    width: '100%',
  },
  waitingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
});

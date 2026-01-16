import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, TextInput } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { isFirebaseError, getErrorMessage } from '../../types/utils';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateUsername,
  sanitizeEmail,
  sanitizeUsername,
  MAX_LENGTHS,
  MIN_LENGTHS,
} from '../../utils/validation';
import { isUsernameAvailable } from '../../services/api/usernames';

interface SignUpScreenProps {
  onNavigateToLogin: () => void;
}

export function SignUpScreen({ onNavigateToLogin }: SignUpScreenProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Debounced username availability check
  useEffect(() => {
    const sanitized = sanitizeUsername(username);
    const validation = validateUsername(sanitized);

    // Reset availability if username is invalid
    if (!validation.isValid || sanitized.length < MIN_LENGTHS.USERNAME) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(sanitized);
        setUsernameAvailable(available);
        if (!available) {
          setErrors(prev => ({ ...prev, username: 'Username is already taken' }));
        } else {
          setErrors(prev => {
            const { username: _, ...rest } = prev;
            return rest;
          });
        }
      } catch (error) {
        console.error('Error checking username availability:', error);
      } finally {
        setCheckingUsername(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [username]);

  const validate = useCallback(() => {
    const newErrors: typeof errors = {};

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      newErrors.username = usernameValidation.error;
    } else if (usernameAvailable === false) {
      newErrors.username = 'Username is already taken';
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }

    const confirmValidation = validatePasswordMatch(password, confirmPassword);
    if (!confirmValidation.isValid) {
      newErrors.confirmPassword = confirmValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, username, usernameAvailable, password, confirmPassword]);

  const handleSignUp = async () => {
    if (!validate()) return;

    // Double-check username availability before signup
    if (usernameAvailable !== true) {
      setErrors(prev => ({ ...prev, username: 'Please enter a valid, available username' }));
      return;
    }

    setLoading(true);
    try {
      await signUp(sanitizeEmail(email), password, sanitizeUsername(username));
      // After successful signup, auth state will update automatically
    } catch (error: unknown) {
      let message = 'Please try again';
      if (isFirebaseError(error)) {
        if (error.code === 'auth/email-already-in-use') {
          message = 'An account with this email already exists';
        } else if (error.code === 'auth/weak-password') {
          message = 'Password is too weak';
        } else {
          message = getErrorMessage(error);
        }
      } else if (error instanceof Error && error.message.includes('Username')) {
        message = error.message;
      } else {
        message = getErrorMessage(error);
      }
      Alert.alert('Sign Up Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Two Cups</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="your@email.com"
              maxLength={MAX_LENGTHS.EMAIL}
            />

            <View style={styles.usernameContainer}>
              <TextInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                error={errors.username}
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

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry
              placeholder="At least 6 characters"
              maxLength={MAX_LENGTHS.PASSWORD}
            />

            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              secureTextEntry
              placeholder="Re-enter your password"
              maxLength={MAX_LENGTHS.PASSWORD}
            />

            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              style={styles.button}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Button
              title="Sign In"
              onPress={onNavigateToLogin}
              variant="outline"
              style={styles.signInButton}
            />
          </View>
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
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
  form: {
    marginBottom: spacing.xl,
  },
  usernameContainer: {
    position: 'relative',
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
  button: {
    marginTop: spacing.md,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  signInButton: {
    width: '100%',
  },
});

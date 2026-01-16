import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, TextInput } from '../../components/common';
import { colors, spacing, typography } from '../../theme';
import { getErrorMessage } from '../../types/utils';
import {
  validateEmail,
  validateUsername,
  MAX_LENGTHS,
} from '../../utils/validation';

interface LoginScreenProps {
  onNavigateToSignUp: () => void;
}

export function LoginScreen({ onNavigateToSignUp }: LoginScreenProps) {
  const { signIn, signInAnonymously } = useAuth();
  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const isEmail = (value: string) => value.includes('@');

  const validate = () => {
    const newErrors: { identifier?: string; password?: string } = {};
    const trimmed = identifier.trim();

    if (!trimmed) {
      newErrors.identifier = 'Email or username is required';
    } else if (isEmail(trimmed)) {
      // Validate as email
      const emailValidation = validateEmail(trimmed);
      if (!emailValidation.isValid) {
        newErrors.identifier = emailValidation.error;
      }
    } else {
      // Validate as username
      const usernameValidation = validateUsername(trimmed);
      if (!usernameValidation.isValid) {
        newErrors.identifier = usernameValidation.error;
      }
    }

    // For login, we only check that password is provided (not strength)
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length > MAX_LENGTHS.PASSWORD) {
      newErrors.password = `Password must be ${MAX_LENGTHS.PASSWORD} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // signIn now handles both username and email lookup
      await signIn(identifier.trim(), password);
    } catch (error: unknown) {
      Alert.alert('Login Failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setLoading(true);
    try {
      await signInAnonymously();
    } catch (error: unknown) {
      Alert.alert('Login Failed', getErrorMessage(error));
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
            <Text style={styles.title}>Two Cups</Text>
            <Text style={styles.subtitle}>Fill each other's cups</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Email or Username"
              value={identifier}
              onChangeText={setIdentifier}
              error={errors.identifier}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="your@email.com or username"
              maxLength={MAX_LENGTHS.EMAIL}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry
              placeholder="Enter your password"
              maxLength={MAX_LENGTHS.PASSWORD}
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.button}
            />

            <Button
              title="Continue as Guest"
              onPress={handleAnonymousLogin}
              variant="outline"
              loading={loading}
              style={styles.button}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Button
              title="Create Account"
              onPress={onNavigateToSignUp}
              variant="secondary"
              style={styles.signUpButton}
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
  signUpButton: {
    width: '100%',
  },
});

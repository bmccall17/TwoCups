import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button } from './Button';

type ErrorType = 'network' | 'permission' | 'generic';

interface ErrorStateProps {
  error?: string | null;
  onRetry?: () => void;
  type?: ErrorType;
}

const ERROR_CONFIG: Record<ErrorType, { icon: string; title: string; subtitle: string }> = {
  network: {
    icon: '📡',
    title: 'No Connection',
    subtitle: 'Please check your internet connection and try again.',
  },
  permission: {
    icon: '🔒',
    title: 'Access Denied',
    subtitle: "You don't have permission to view this content.",
  },
  generic: {
    icon: '⚠️',
    title: 'Something Went Wrong',
    subtitle: 'An unexpected error occurred. Please try again.',
  },
};

function getErrorType(error: string | null | undefined): ErrorType {
  if (!error) return 'generic';
  
  const errorLower = error.toLowerCase();
  
  if (
    errorLower.includes('network') ||
    errorLower.includes('offline') ||
    errorLower.includes('unavailable') ||
    errorLower.includes('failed to fetch') ||
    errorLower.includes('connection')
  ) {
    return 'network';
  }
  
  if (
    errorLower.includes('permission') ||
    errorLower.includes('denied') ||
    errorLower.includes('unauthorized') ||
    errorLower.includes('forbidden')
  ) {
    return 'permission';
  }
  
  return 'generic';
}

export function ErrorState({ error, onRetry, type }: ErrorStateProps) {
  const errorType = type ?? getErrorType(error);
  const config = ERROR_CONFIG[errorType];
  
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.subtitle}>{config.subtitle}</Text>
      
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          style={styles.retryButton}
          variant="outline"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    minWidth: 140,
  },
});

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { recordComponentError, log } from '../../services/crashlytics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log to Crashlytics (works on native, no-op on web)
    recordComponentError(error, errorInfo.componentStack ?? undefined);

    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  handleRetry = (): void => {
    log('ErrorBoundary: User pressed retry');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😵</Text>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              We hit an unexpected error. Don't worry, your data is safe.
            </Text>

            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            {__DEV__ && (
              <>
                <TouchableOpacity
                  style={styles.detailsToggle}
                  onPress={this.toggleDetails}
                >
                  <Text style={styles.detailsToggleText}>
                    {this.state.showDetails ? 'Hide Details' : 'Show Error Details'}
                  </Text>
                </TouchableOpacity>

                {this.state.showDetails && (
                  <ScrollView style={styles.detailsContainer}>
                    <Text style={styles.detailsTitle}>Error:</Text>
                    <Text style={styles.detailsText}>
                      {this.state.error?.toString()}
                    </Text>
                    {this.state.errorInfo?.componentStack && (
                      <>
                        <Text style={styles.detailsTitle}>Component Stack:</Text>
                        <Text style={styles.detailsText}>
                          {this.state.errorInfo.componentStack}
                        </Text>
                      </>
                    )}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
  detailsToggle: {
    paddingVertical: spacing.sm,
  },
  detailsToggleText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
  detailsContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    maxHeight: 200,
    width: '100%',
  },
  detailsTitle: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  detailsText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
});

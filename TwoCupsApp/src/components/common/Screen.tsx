import React, { ReactNode } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { colors, spacing } from '../../theme';
import { useTabBarHeightContext } from '../../context/TabBarHeightContext';

/**
 * Hook to safely get tab bar height.
 * Uses our custom TabBarHeightContext (set by CustomTabBar) as primary source,
 * falls back to React Navigation's context, then to 0.
 * Exported for use in screens that use FlatList or other custom scroll implementations.
 */
export function useTabBarHeight(): number {
  // Try our custom context first (works with custom tab bar)
  const customHeight = useTabBarHeightContext();
  // Fall back to React Navigation's context
  const rnHeight = React.useContext(BottomTabBarHeightContext);

  // Prefer custom context if it has a value, otherwise use RN context
  return customHeight > 0 ? customHeight : (rnHeight ?? 0);
}

export interface ScreenProps {
  children: ReactNode;

  /** Enable scrolling (wraps content in ScrollView). Default: false */
  scroll?: boolean;

  /** Apply horizontal padding. Default: true */
  padding?: boolean;

  /** Account for bottom tab bar. Default: true (auto-detects if in tab navigator) */
  tabBarInset?: boolean;

  /** Override background color */
  backgroundColor?: string;

  /** Pull-to-refresh handler (only works when scroll=true) */
  onRefresh?: () => void;

  /** Whether refresh is in progress */
  refreshing?: boolean;

  /** Additional style for the content container */
  style?: StyleProp<ViewStyle>;

  /** Additional style for the scroll content (only when scroll=true) */
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Screen - Standard screen wrapper component
 *
 * Handles:
 * - Safe area insets (top/bottom)
 * - Tab bar bottom inset (automatic)
 * - Optional scrolling with pull-to-refresh
 * - Consistent padding
 *
 * Usage:
 * ```tsx
 * // Static screen
 * <Screen>
 *   <Stack gap="lg">...</Stack>
 * </Screen>
 *
 * // Scrollable screen
 * <Screen scroll>
 *   <Stack gap="lg">...</Stack>
 * </Screen>
 *
 * // With pull-to-refresh
 * <Screen scroll onRefresh={handleRefresh} refreshing={isRefreshing}>
 *   ...
 * </Screen>
 *
 * // Stack screen (no tab bar inset needed)
 * <Screen tabBarInset={false}>
 *   ...
 * </Screen>
 * ```
 */
export function Screen({
  children,
  scroll = false,
  padding = true,
  tabBarInset = true,
  backgroundColor = colors.background,
  onRefresh,
  refreshing = false,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const tabBarHeight = useTabBarHeight();
  const bottomInset = tabBarInset ? tabBarHeight : 0;

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
  };

  const contentStyle: ViewStyle = {
    ...(padding && { paddingHorizontal: spacing.md }),
    paddingBottom: bottomInset,
  };

  if (scroll) {
    return (
      <SafeAreaView style={containerStyle} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            contentStyle,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containerStyle} edges={['top', 'left', 'right']}>
      <View style={[styles.staticContent, contentStyle, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  staticContent: {
    flex: 1,
  },
});

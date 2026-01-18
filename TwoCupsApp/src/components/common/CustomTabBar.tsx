import React, { useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Icon mapping for tabs
const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  HomeTab: 'home',
  LogTab: 'heart',
  AcknowledgeTab: 'check-circle',
  HistoryTab: 'bar-chart-2',
  SettingsTab: 'settings',
};

const TAB_LABELS: Record<string, string> = {
  HomeTab: 'Home',
  LogTab: 'Give',
  AcknowledgeTab: 'Receive',
  HistoryTab: 'History',
  SettingsTab: 'Settings',
};

// Colors
const ACTIVE_COLOR = '#C084FC'; // purple-400
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.4)';
const NOTIFICATION_COLOR = '#34D399'; // emerald-400

// Tab Item Component
interface TabItemProps {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  badgeCount?: number;
}

const TabItem = memo(({ routeName, isFocused, onPress, onLongPress, badgeCount }: TabItemProps) => {
  const iconName = TAB_ICONS[routeName] || 'circle';
  const label = TAB_LABELS[routeName] || routeName;
  const hasNotification = badgeCount !== undefined && badgeCount > 0;

  // Pulse animation for active indicator
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (isFocused) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isFocused, pulseAnim]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      activeOpacity={0.7}
    >
      {/* Active glow background */}
      {isFocused && (
        <Animated.View
          style={[
            styles.activeGlow,
            { opacity: pulseAnim }
          ]}
        />
      )}

      {/* Icon */}
      <View style={styles.iconWrapper}>
        <Feather
          name={iconName}
          size={22}
          color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
        {/* Notification dot */}
        {hasNotification && <View style={styles.notificationDot} />}
      </View>

      {/* Label */}
      <Text style={[styles.label, isFocused && styles.labelActive]}>
        {label}
      </Text>

      {/* Active indicator dot */}
      {isFocused && <View style={styles.activeIndicatorDot} />}
    </TouchableOpacity>
  );
});

// Main CustomTabBar Component
export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Top border line */}
      <View style={styles.topBorder} />

      {/* Tab items */}
      <View style={styles.tabsContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Get badge count from options if available
          const badgeCount = (options as any).tabBarBadge;

          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              badgeCount={badgeCount}
            />
          );
        })}
      </View>

      {/* Bottom glow accent */}
      <View style={styles.bottomGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(10, 10, 15, 0.98)',
    borderTopWidth: 0,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
      },
      ios: {
        // @ts-ignore
        backdropFilter: 'blur(20px)',
      },
    }),
  },
  topBorder: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  activeGlow: {
    position: 'absolute',
    top: 4,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(192, 132, 252, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.25)',
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: -3,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NOTIFICATION_COLOR,
    borderWidth: 2,
    borderColor: 'rgba(10, 10, 15, 1)',
  },
  label: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.3,
    color: INACTIVE_COLOR,
  },
  labelActive: {
    color: '#D8B4FE', // purple-300
    fontWeight: '500',
  },
  activeIndicatorDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACTIVE_COLOR,
    ...Platform.select({
      ios: {
        shadowColor: ACTIVE_COLOR,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      web: {
        boxShadow: `0 0 6px ${ACTIVE_COLOR}`,
      },
    }),
  },
  bottomGlow: {
    height: 1,
    marginHorizontal: '25%',
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
  },
});

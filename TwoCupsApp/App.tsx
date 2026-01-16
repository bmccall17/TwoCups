import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();
import { ToastProvider } from './src/context/ToastContext';
import { GemAnimationProvider } from './src/context/GemAnimationContext';
import { MilestoneCelebrationProvider } from './src/context/MilestoneCelebrationContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { LoadingSpinner, InstallAppModal, ToastContainer, OfflineBanner, ErrorBoundary, UpdatePrompt } from './src/components/common';
import { useInstallPrompt } from './src/hooks';
import { LoginScreen, SignUpScreen, PairingScreen } from './src/screens/auth';
import { HomeScreen } from './src/screens/HomeScreen';
import { LogAttemptScreen } from './src/screens/LogAttemptScreen';
import { AcknowledgeScreen } from './src/screens/AcknowledgeScreen';
import { MakeRequestScreen } from './src/screens/MakeRequestScreen';
import { ManageSuggestionsScreen } from './src/screens/ManageSuggestionsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { GemHistoryScreen } from './src/screens/GemHistoryScreen';
import { colors } from './src/theme';
import { initializeCrashlytics, log } from './src/services/crashlytics';

type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

type MainTabParamList = {
  HomeTab: undefined;
  LogTab: undefined;
  AcknowledgeTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
};

type MainStackParamList = {
  Tabs: undefined;
  MakeRequest: undefined;
  ManageSuggestions: undefined;
  GemHistory: undefined;
};

type AppStackParamList = {
  Pairing: undefined;
  MainTabs: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
    </View>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <AuthStack.Screen name="Login">
        {(props) => (
          <LoginScreen
            onNavigateToSignUp={() => props.navigation.navigate('SignUp')}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="SignUp">
        {(props) => (
          <SignUpScreen
            onNavigateToLogin={() => props.navigation.navigate('Login')}
          />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 64,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <MainTab.Screen
        name="HomeTab"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      >
        {({ navigation }) => (
          <HomeScreen
            onNavigateToLogAttempt={() => navigation.navigate('LogTab')}
            onNavigateToAcknowledge={() => navigation.navigate('AcknowledgeTab')}
            onNavigateToMakeRequest={() => navigation.getParent()?.navigate('MakeRequest')}
            onNavigateToManageSuggestions={() => navigation.getParent()?.navigate('ManageSuggestions')}
            onNavigateToGemHistory={() => navigation.getParent()?.navigate('GemHistory')}
          />
        )}
      </MainTab.Screen>

      <MainTab.Screen
        name="LogTab"
        options={{
          tabBarLabel: 'Log',
          tabBarIcon: ({ focused }) => <TabIcon icon="💝" focused={focused} />,
        }}
      >
        {({ navigation }) => <LogAttemptScreen onGoBack={() => navigation.navigate('HomeTab')} />}
      </MainTab.Screen>

      <MainTab.Screen
        name="AcknowledgeTab"
        options={{
          tabBarLabel: 'Ack',
          tabBarIcon: ({ focused }) => <TabIcon icon="✅" focused={focused} />,
        }}
      >
        {() => <AcknowledgeScreen />}
      </MainTab.Screen>

      <MainTab.Screen
        name="HistoryTab"
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ focused }) => <TabIcon icon="📜" focused={focused} />,
        }}
      >
        {() => <HistoryScreen />}
      </MainTab.Screen>

      <MainTab.Screen
        name="SettingsTab"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      >
        {({ navigation }) => (
          <SettingsScreen
            onNavigateToManageSuggestions={() => navigation.getParent()?.navigate('ManageSuggestions')}
            onNavigateToMakeRequest={() => navigation.getParent()?.navigate('MakeRequest')}
            onNavigateToGemHistory={() => navigation.getParent()?.navigate('GemHistory')}
          />
        )}
      </MainTab.Screen>
    </MainTab.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <MainStack.Screen name="Tabs" component={TabNavigator} />
      <MainStack.Screen name="MakeRequest">
        {({ navigation }) => (
          <MakeRequestScreen onGoBack={() => navigation.goBack()} />
        )}
      </MainStack.Screen>
      <MainStack.Screen name="ManageSuggestions">
        {({ navigation }) => (
          <ManageSuggestionsScreen onGoBack={() => navigation.goBack()} />
        )}
      </MainStack.Screen>
      <MainStack.Screen name="GemHistory">
        {({ navigation }) => (
          <GemHistoryScreen onGoBack={() => navigation.goBack()} />
        )}
      </MainStack.Screen>
    </MainStack.Navigator>
  );
}

function AppNavigator() {
  const { coupleData } = useAuth();
  const coupleIsActive = coupleData?.status === 'active';

  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      {!coupleIsActive ? (
        <AppStack.Screen name="Pairing" component={PairingScreen} />
      ) : (
        <AppStack.Screen name="MainTabs" component={MainTabNavigator} />
      )}
    </AppStack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const { showPrompt, isIOS, triggerInstall, dismissPrompt } = useInstallPrompt();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      // App is ready when auth loading is complete
      setAppIsReady(true);
    }
  }, [loading]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide splash screen once the app is ready
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {user ? <AppNavigator /> : <AuthNavigator />}
      {/* Show install prompt only when user is logged in */}
      <InstallAppModal
        visible={showPrompt && !!user}
        isIOS={isIOS}
        onInstall={triggerInstall}
        onDismiss={dismissPrompt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
});

export default function App() {
  // Initialize Crashlytics when app starts
  useEffect(() => {
    void initializeCrashlytics().then(() => {
      log('App initialized');
    });
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar style="light" backgroundColor={colors.background} />
        <ToastProvider>
          <GemAnimationProvider>
            <AuthProvider>
              <NetworkProvider>
                <MilestoneCelebrationProvider>
                  <NavigationContainer>
                    <UpdatePrompt />
                    <RootNavigator />
                    <OfflineBanner />
                  </NavigationContainer>
                  <ToastContainer />
                </MilestoneCelebrationProvider>
              </NetworkProvider>
            </AuthProvider>
          </GemAnimationProvider>
        </ToastProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

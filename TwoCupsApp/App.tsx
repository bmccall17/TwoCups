import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();
import { ToastProvider } from './src/context/ToastContext';
import { GemAnimationProvider } from './src/context/GemAnimationContext';
import { MilestoneCelebrationProvider } from './src/context/MilestoneCelebrationContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { FontSizeProvider } from './src/context/FontSizeContext';
import { LoadingSpinner, InstallAppModal, ToastContainer, OfflineBanner, ErrorBoundary, UpdatePrompt, CustomTabBar } from './src/components/common';
import { useInstallPrompt, usePendingAcknowledgments } from './src/hooks';
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
  const { pendingCount } = usePendingAcknowledgments();

  return (
    <MainTab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <MainTab.Screen
        name="HomeTab"
        options={{
          tabBarLabel: 'Home',
        }}
      >
        {({ navigation }) => (
          <HomeScreen
            onNavigateToLogAttempt={() => navigation.navigate('LogTab')}
            onNavigateToAcknowledge={() => navigation.navigate('AcknowledgeTab')}
            onNavigateToGemHistory={() => navigation.getParent()?.navigate('GemHistory')}
          />
        )}
      </MainTab.Screen>

      <MainTab.Screen
        name="LogTab"
        options={{
          tabBarLabel: 'Give',
        }}
      >
        {({ navigation }) => <LogAttemptScreen onGoBack={() => navigation.navigate('HomeTab')} />}
      </MainTab.Screen>

      <MainTab.Screen
        name="AcknowledgeTab"
        options={{
          tabBarLabel: 'Receive',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      >
        {({ navigation }) => (
          <AcknowledgeScreen
            onNavigateToMakeRequest={() => navigation.getParent()?.navigate('MakeRequest')}
            onNavigateToManageSuggestions={() => navigation.getParent()?.navigate('ManageSuggestions')}
          />
        )}
      </MainTab.Screen>

      <MainTab.Screen
        name="HistoryTab"
        options={{
          tabBarLabel: 'History',
        }}
      >
        {() => <HistoryScreen />}
      </MainTab.Screen>

      <MainTab.Screen
        name="SettingsTab"
        options={{
          tabBarLabel: 'Settings',
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

  // Load icon fonts and OpenDyslexic font family
  const [fontsLoaded, fontError] = useFonts({
    ...Feather.font,
    'OpenDyslexic-Regular': require('./assets/fonts/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('./assets/fonts/OpenDyslexic-Bold.otf'),
    'OpenDyslexic-Italic': require('./assets/fonts/OpenDyslexic-Italic.otf'),
    'OpenDyslexic-BoldItalic': require('./assets/fonts/OpenDyslexic-BoldItalic.otf'),
  });

  useEffect(() => {
    if (!loading && (fontsLoaded || fontError)) {
      // Proceed even if fonts fail - icons will fall back gracefully
      if (fontError) {
        console.warn('Font loading failed, proceeding anyway:', fontError);
      }
      setAppIsReady(true);
    }
  }, [loading, fontsLoaded, fontError]);

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

// Styles removed - using CustomTabBar component

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
        <FontSizeProvider>
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
        </FontSizeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

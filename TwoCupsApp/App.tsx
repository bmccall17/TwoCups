import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoadingSpinner } from './src/components/common';
import { LoginScreen, SignUpScreen, PairingScreen } from './src/screens/auth';
import { HomeScreen } from './src/screens/HomeScreen';
import { LogAttemptScreen } from './src/screens/LogAttemptScreen';
import { AcknowledgeScreen } from './src/screens/AcknowledgeScreen';
import { MakeRequestScreen } from './src/screens/MakeRequestScreen';
import { ManageSuggestionsScreen } from './src/screens/ManageSuggestionsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme';

type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

type MainTabParamList = {
  HomeTab: undefined;
  LogTab: undefined;
  AcknowledgeTab: undefined;
  SettingsTab: undefined;
};

type AppStackParamList = {
  Pairing: undefined;
  MainTabs: undefined;
  MakeRequest: undefined;
  ManageSuggestions: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
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

function MainTabNavigator({ navigation }: { navigation: any }) {
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
          fontSize: 12,
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
        {() => (
          <HomeScreen
            onNavigateToLogAttempt={() => {}}
            onNavigateToAcknowledge={() => {}}
            onNavigateToMakeRequest={() => navigation.navigate('MakeRequest')}
            onNavigateToManageSuggestions={() => navigation.navigate('ManageSuggestions')}
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
        {() => <LogAttemptScreen onGoBack={() => navigation.navigate('MainTabs')} />}
      </MainTab.Screen>

      <MainTab.Screen
        name="AcknowledgeTab"
        options={{
          tabBarLabel: 'Acknowledge',
          tabBarIcon: ({ focused }) => <TabIcon icon="✅" focused={focused} />,
        }}
      >
        {() => <AcknowledgeScreen onGoBack={() => navigation.navigate('MainTabs')} />}
      </MainTab.Screen>

      <MainTab.Screen
        name="SettingsTab"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      >
        {() => (
          <SettingsScreen
            onNavigateToManageSuggestions={() => navigation.navigate('ManageSuggestions')}
            onNavigateToMakeRequest={() => navigation.navigate('MakeRequest')}
          />
        )}
      </MainTab.Screen>
    </MainTab.Navigator>
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
        <>
          <AppStack.Screen name="MainTabs">
            {(props) => <MainTabNavigator navigation={props.navigation} />}
          </AppStack.Screen>
          <AppStack.Screen name="MakeRequest">
            {(props) => (
              <MakeRequestScreen
                onGoBack={() => props.navigation.goBack()}
              />
            )}
          </AppStack.Screen>
          <AppStack.Screen name="ManageSuggestions">
            {(props) => (
              <ManageSuggestionsScreen
                onGoBack={() => props.navigation.goBack()}
              />
            )}
          </AppStack.Screen>
        </>
      )}
    </AppStack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return user ? <AppNavigator /> : <AuthNavigator />;
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
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.background} />
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

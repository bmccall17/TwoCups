import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoadingSpinner } from './src/components/common';
import { LoginScreen, SignUpScreen, PairingScreen } from './src/screens/auth';
import { HomeScreen } from './src/screens/HomeScreen';
import { LogAttemptScreen } from './src/screens/LogAttemptScreen';
import { AcknowledgeScreen } from './src/screens/AcknowledgeScreen';
import { MakeRequestScreen } from './src/screens/MakeRequestScreen';
import { ManageSuggestionsScreen } from './src/screens/ManageSuggestionsScreen';
import { colors } from './src/theme';

type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

type AppStackParamList = {
  Pairing: undefined;
  Home: undefined;
  LogAttempt: undefined;
  Acknowledge: undefined;
  MakeRequest: undefined;
  ManageSuggestions: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

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

function AppNavigator() {
  const { coupleData, userData } = useAuth();
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
          <AppStack.Screen name="Home">
            {(props) => (
              <HomeScreen
                onNavigateToLogAttempt={() => props.navigation.navigate('LogAttempt')}
                onNavigateToAcknowledge={() => props.navigation.navigate('Acknowledge')}
                onNavigateToMakeRequest={() => props.navigation.navigate('MakeRequest')}
                onNavigateToManageSuggestions={() => props.navigation.navigate('ManageSuggestions')}
              />
            )}
          </AppStack.Screen>
          <AppStack.Screen name="LogAttempt">
            {(props) => (
              <LogAttemptScreen
                onGoBack={() => props.navigation.goBack()}
              />
            )}
          </AppStack.Screen>
          <AppStack.Screen name="Acknowledge">
            {(props) => (
              <AcknowledgeScreen
                onGoBack={() => props.navigation.goBack()}
              />
            )}
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

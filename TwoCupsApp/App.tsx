import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoadingSpinner } from './src/components/common';
import { LoginScreen, SignUpScreen, PairingScreen } from './src/screens/auth';
import { HomeScreen } from './src/screens/HomeScreen';
import { colors } from './src/theme';

type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

type AppStackParamList = {
  Pairing: undefined;
  Home: undefined;
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
  const { coupleData } = useAuth();
  // Show HomeScreen only when couple is active (both partners joined)
  const coupleIsActive = coupleData?.status === 'active';

  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      {!coupleIsActive ? (
        <AppStack.Screen name="Pairing" component={PairingScreen} />
      ) : (
        <AppStack.Screen name="Home" component={HomeScreen} />
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

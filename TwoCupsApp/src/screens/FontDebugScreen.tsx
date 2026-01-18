import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../theme';

// Note: FontDebugScreen is accessed from MainStack, not tabs, so no useBottomTabBarHeight needed

interface FontDebugScreenProps {
  onGoBack: () => void;
}

export function FontDebugScreen({ onGoBack }: FontDebugScreenProps) {
  // Load fonts in isolation to test
  const [fontsLoaded, fontError] = useFonts({
    ...Feather.font,
    'OpenDyslexic-Regular': require('../../assets/fonts/OpenDyslexic-Regular.otf'),
    'OpenDyslexic-Bold': require('../../assets/fonts/OpenDyslexic-Bold.otf'),
    'OpenDyslexic-Italic': require('../../assets/fonts/OpenDyslexic-Italic.otf'),
    'OpenDyslexic-BoldItalic': require('../../assets/fonts/OpenDyslexic-BoldItalic.otf'),
  });

  // Log font loading status
  useEffect(() => {
    console.log('[FontDebugScreen] Font loading status:');
    console.log('  fontsLoaded:', fontsLoaded);
    console.log('  fontError:', fontError);
  }, [fontsLoaded, fontError]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Font Debug</Text>
          <Text style={styles.subtitle}>Testing font loading in isolation</Text>
        </View>

        {/* Font Loading Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Font Loading Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>fontsLoaded:</Text>
              <Text style={[
                styles.statusValue,
                { color: fontsLoaded ? colors.success : colors.error }
              ]}>
                {String(fontsLoaded)}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>fontError:</Text>
              <Text style={[
                styles.statusValue,
                { color: fontError ? colors.error : colors.success }
              ]}>
                {fontError ? fontError.message : 'null'}
              </Text>
            </View>
          </View>
        </View>

        {/* System Font Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Font (Default)</Text>
          <View style={styles.fontCard}>
            <Text style={styles.systemFontText}>
              The quick brown fox jumps over the lazy dog.
            </Text>
            <Text style={styles.systemFontText}>
              0123456789
            </Text>
          </View>
        </View>

        {/* OpenDyslexic Regular Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OpenDyslexic-Regular</Text>
          <View style={styles.fontCard}>
            <Text style={styles.openDyslexicRegular}>
              The quick brown fox jumps over the lazy dog.
            </Text>
            <Text style={styles.openDyslexicRegular}>
              0123456789
            </Text>
          </View>
        </View>

        {/* OpenDyslexic Bold Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OpenDyslexic-Bold</Text>
          <View style={styles.fontCard}>
            <Text style={styles.openDyslexicBold}>
              The quick brown fox jumps over the lazy dog.
            </Text>
            <Text style={styles.openDyslexicBold}>
              0123456789
            </Text>
          </View>
        </View>

        {/* OpenDyslexic Italic Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OpenDyslexic-Italic</Text>
          <View style={styles.fontCard}>
            <Text style={styles.openDyslexicItalic}>
              The quick brown fox jumps over the lazy dog.
            </Text>
            <Text style={styles.openDyslexicItalic}>
              0123456789
            </Text>
          </View>
        </View>

        {/* OpenDyslexic BoldItalic Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OpenDyslexic-BoldItalic</Text>
          <View style={styles.fontCard}>
            <Text style={styles.openDyslexicBoldItalic}>
              The quick brown fox jumps over the lazy dog.
            </Text>
            <Text style={styles.openDyslexicBoldItalic}>
              0123456789
            </Text>
          </View>
        </View>

        {/* Feather Icons Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feather Icons</Text>
          <View style={styles.fontCard}>
            <View style={styles.iconRow}>
              <View style={styles.iconBox}>
                <Feather name="home" size={24} color={colors.textPrimary} />
                <Text style={styles.iconLabel}>home</Text>
              </View>
              <View style={styles.iconBox}>
                <Feather name="heart" size={24} color={colors.textPrimary} />
                <Text style={styles.iconLabel}>heart</Text>
              </View>
              <View style={styles.iconBox}>
                <Feather name="check-circle" size={24} color={colors.textPrimary} />
                <Text style={styles.iconLabel}>check</Text>
              </View>
              <View style={styles.iconBox}>
                <Feather name="bar-chart-2" size={24} color={colors.textPrimary} />
                <Text style={styles.iconLabel}>chart</Text>
              </View>
              <View style={styles.iconBox}>
                <Feather name="settings" size={24} color={colors.textPrimary} />
                <Text style={styles.iconLabel}>settings</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: 100,
  },
  header: {
    marginBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  statusValue: {
    ...typography.body,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  fontCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  systemFontText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  openDyslexicRegular: {
    fontSize: 16,
    fontFamily: 'OpenDyslexic-Regular',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  openDyslexicBold: {
    fontSize: 16,
    fontFamily: 'OpenDyslexic-Bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  openDyslexicItalic: {
    fontSize: 16,
    fontFamily: 'OpenDyslexic-Italic',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  openDyslexicBoldItalic: {
    fontSize: 16,
    fontFamily: 'OpenDyslexic-BoldItalic',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  iconBox: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  iconLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

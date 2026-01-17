import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface HealthInsightsCardProps {
  responsivenessPercentage: number;
  gemCount: number;
  openLoopsCount: number;
  onResponsivenessPress?: () => void;
  onGemsPress?: () => void;
  onOpenLoopsPress?: () => void;
}

export const HealthInsightsCard = React.memo(function HealthInsightsCard({
  responsivenessPercentage,
  gemCount,
  openLoopsCount,
  onResponsivenessPress,
  onGemsPress,
  onOpenLoopsPress,
}: HealthInsightsCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.metricsContainer}>
        {/* Responsiveness */}
        <TouchableOpacity
          style={styles.metric}
          onPress={onResponsivenessPress}
          activeOpacity={0.7}
          disabled={!onResponsivenessPress}
        >
          <Text style={styles.icon}>🤝</Text>
          <Text style={styles.value}>{responsivenessPercentage}%</Text>
          <Text style={styles.label}>RESPONSE</Text>
          <View style={styles.indicatorContainer}>
            <View style={[styles.trendBar, { width: `${Math.min(responsivenessPercentage, 100)}%` }]} />
          </View>
        </TouchableOpacity>

        {/* Gems */}
        <TouchableOpacity
          style={styles.metric}
          onPress={onGemsPress}
          activeOpacity={0.7}
          disabled={!onGemsPress}
        >
          <Text style={styles.icon}>💎</Text>
          <Text style={styles.value}>{gemCount}</Text>
          <Text style={styles.label}>GEMS</Text>
          <View style={styles.indicatorContainer}>
            {[...Array(Math.min(5, Math.floor(gemCount / 20)))].map((_, i) => (
              <View key={i} style={styles.gemDot} />
            ))}
          </View>
        </TouchableOpacity>

        {/* Open Loops */}
        <TouchableOpacity
          style={styles.metric}
          onPress={onOpenLoopsPress}
          activeOpacity={0.7}
          disabled={!onOpenLoopsPress}
        >
          <Text style={styles.icon}>⭕</Text>
          <Text style={styles.value}>{openLoopsCount}</Text>
          <Text style={styles.label}>OPEN</Text>
          <View style={styles.indicatorContainer}>
            {[...Array(Math.min(3, openLoopsCount))].map((_, i) => (
              <View key={i} style={styles.loopDot} />
            ))}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface + '80',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '300',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  indicatorContainer: {
    height: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  trendBar: {
    height: 3,
    backgroundColor: colors.emerald400,
    borderRadius: 2,
    minWidth: 20,
    maxWidth: 40,
  },
  gemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gem,
  },
  loopDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.amber400,
    borderStyle: 'dotted',
  },
});

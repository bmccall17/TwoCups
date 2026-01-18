import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface HealthInsightsCardProps {
  responsivenessPercentage: number;
  gemCount: number;
  openLoopsCount: number;
  responseTrend?: number; // Optional: positive = up, negative = down, undefined = no trend shown
  onResponsivenessPress?: () => void;
  onGemsPress?: () => void;
  onOpenLoopsPress?: () => void;
}

// Wave Fill Component for Response metric
const WaveFill = React.memo(({ percentage }: { percentage: number }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Container is 56px tall, calculate fill height as pixels
  const containerHeight = 56;
  const fillHeightPx = Math.max((percentage / 100) * containerHeight, 3); // Minimum 3px visible

  return (
    <View style={styles.waveContainer}>
      <View style={[styles.waveFill, { height: fillHeightPx }]}>
        <Animated.View
          style={[
            styles.waveOverlay,
            { opacity: pulseAnim },
          ]}
        />
      </View>
    </View>
  );
});

// Energy Bars Component for Gems metric
const EnergyBars = React.memo(() => {
  const barHeights = [12, 20, 16, 28, 24, 32, 20];
  const pulseAnims = useRef(
    barHeights.map(() => new Animated.Value(1))
  ).current;

  useEffect(() => {
    const animations = pulseAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 100), // Stagger 0-600ms
          Animated.timing(anim, {
            toValue: 0.7,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      )
    );

    animations.forEach((animation) => animation.start());

    return () => animations.forEach((animation) => animation.stop());
  }, [pulseAnims]);

  const miniBarHeights = [4, 6, 4, 8, 6];

  return (
    <>
      <View style={styles.energyBarsContainer}>
        {barHeights.map((height, index) => (
          <Animated.View
            key={index}
            style={[
              styles.energyBar,
              {
                height,
                opacity: pulseAnims[index],
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.miniBarContainer}>
        {miniBarHeights.map((height, index) => (
          <View key={index} style={[styles.miniBar, { height }]} />
        ))}
      </View>
    </>
  );
});

// Chain Links Component for Open Loops metric
const ChainLinks = React.memo(() => {
  return (
    <>
      <View style={styles.chainContainer}>
        <View style={styles.chainLink} />
        <View style={[styles.chainLink, styles.chainLinkOverlap]} />
        <View style={[styles.chainLink, styles.chainLinkOverlap, styles.chainLinkDashed]} />
      </View>
      <View style={styles.dotContainer}>
        {[1, 2, 1].map((opacity, index) => (
          <View
            key={index}
            style={[styles.chainDot, { opacity: opacity * 0.4 }]}
          />
        ))}
      </View>
    </>
  );
});

export const HealthInsightsCard = React.memo(function HealthInsightsCard({
  responsivenessPercentage,
  gemCount,
  openLoopsCount,
  responseTrend,
  onResponsivenessPress,
  onGemsPress,
  onOpenLoopsPress,
}: HealthInsightsCardProps) {
  const displayGemCount = gemCount > 999 ? '999+' : gemCount.toString();

  // Format trend display
  const getTrendDisplay = () => {
    if (responseTrend === undefined || responseTrend === 0) return null;
    const arrow = responseTrend > 0 ? '↑' : '↓';
    const color = responseTrend > 0 ? colors.emerald400 : colors.amber400;
    return { text: `${arrow} ${Math.abs(responseTrend)}%`, color };
  };

  const trendDisplay = getTrendDisplay();

  return (
    <View style={styles.card}>
      <View style={styles.metricsContainer}>
        {/* Response Rate - Wave Fill */}
        <TouchableOpacity
          style={styles.metric}
          onPress={onResponsivenessPress}
          activeOpacity={0.7}
          disabled={!onResponsivenessPress}
        >
          <WaveFill percentage={responsivenessPercentage} />
          <Text style={styles.value}>{responsivenessPercentage}%</Text>
          <Text style={styles.label}>RESPONSE</Text>
          {trendDisplay && (
            <Text style={[styles.trend, { color: trendDisplay.color }]}>
              {trendDisplay.text}
            </Text>
          )}
        </TouchableOpacity>

        {/* Gems - Energy Bars */}
        <TouchableOpacity
          style={[styles.metric, styles.metricBordered]}
          onPress={onGemsPress}
          activeOpacity={0.7}
          disabled={!onGemsPress}
        >
          <EnergyBars />
          <Text style={styles.value}>{displayGemCount}</Text>
          <Text style={styles.label}>GEMS</Text>
        </TouchableOpacity>

        {/* Open Loops - Chain Links */}
        <TouchableOpacity
          style={styles.metric}
          onPress={onOpenLoopsPress}
          activeOpacity={0.7}
          disabled={!onOpenLoopsPress}
        >
          <ChainLinks />
          <Text style={styles.value}>{openLoopsCount}</Text>
          <Text style={styles.label}>OPEN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface + '80',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricBordered: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: colors.textPrimary + '05',
    borderRightColor: colors.textPrimary + '05',
  },
  value: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '300',
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  trend: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  // Wave Fill styles
  waveContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.emerald400 + '40',
    backgroundColor: colors.emerald500 + '05',
    overflow: 'hidden',
    position: 'relative',
  },
  waveFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.emerald500 + '60',
  },
  waveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: colors.emerald400 + '40',
  },
  // Energy Bars styles
  energyBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 48,
    gap: 4,
  },
  energyBar: {
    width: 8,
    borderRadius: 4,
    backgroundColor: colors.gem,
  },
  miniBarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 10,
    gap: 2,
    marginTop: 4,
  },
  miniBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.gem + '80',
  },
  // Chain Links styles
  chainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  chainLink: {
    width: 20,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.amber400,
    backgroundColor: 'transparent',
  },
  chainLinkOverlap: {
    marginLeft: -8,
  },
  chainLinkDashed: {
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
    height: 10,
  },
  chainDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.amber400,
    backgroundColor: 'transparent',
  },
});

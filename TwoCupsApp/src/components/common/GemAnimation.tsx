import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { colors, typography } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GemParticle {
  id: string;
  x: number;
  y: number;
  scale: Animated.Value;
  translateY: Animated.Value;
  opacity: Animated.Value;
  rotation: Animated.Value;
}

interface GemAnimationProps {
  visible: boolean;
  amount: number;
  startX?: number;
  startY?: number;
  onComplete?: () => void;
}

export function GemAnimation({
  visible,
  amount,
  startX = Dimensions.get('window').width / 2,
  startY = SCREEN_HEIGHT / 2,
  onComplete,
}: GemAnimationProps) {
  const [particles, setParticles] = useState<GemParticle[]>([]);

  useEffect(() => {
    if (visible && amount > 0) {
      const numGems = Math.min(amount, 5);
      const newParticles: GemParticle[] = [];

      for (let i = 0; i < numGems; i++) {
        const offsetX = (Math.random() - 0.5) * 60;
        newParticles.push({
          id: `gem-${Date.now()}-${i}`,
          x: startX + offsetX - 20,
          y: startY - 40,
          scale: new Animated.Value(0),
          translateY: new Animated.Value(0),
          opacity: new Animated.Value(1),
          rotation: new Animated.Value(0),
        });
      }

      setParticles(newParticles);

      newParticles.forEach((particle, index) => {
        const delay = index * 100;

        setTimeout(() => {
          Animated.sequence([
            Animated.parallel([
              Animated.spring(particle.scale, {
                toValue: 1,
                tension: 100,
                friction: 6,
                useNativeDriver: true,
              }),
              Animated.timing(particle.rotation, {
                toValue: (Math.random() - 0.5) * 0.5,
                duration: 300,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(particle.translateY, {
                toValue: -120 - Math.random() * 40,
                duration: 1200,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: 1200,
                delay: 200,
                useNativeDriver: true,
              }),
              Animated.timing(particle.scale, {
                toValue: 0.6,
                duration: 1200,
                useNativeDriver: true,
              }),
            ]),
          ]).start(() => {
            if (index === newParticles.length - 1) {
              onComplete?.();
            }
          });
        }, delay);
      });

      return () => {
        setParticles([]);
      };
    }
  }, [visible, amount, startX, startY, onComplete]);

  if (!visible || particles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <Animated.View
          key={particle.id}
          style={[
            styles.gemParticle,
            {
              left: particle.x,
              top: particle.y,
              transform: [
                { scale: particle.scale },
                { translateY: particle.translateY },
                {
                  rotate: particle.rotation.interpolate({
                    inputRange: [-0.5, 0.5],
                    outputRange: ['-15deg', '15deg'],
                  }),
                },
              ],
              opacity: particle.opacity,
            },
          ]}
        >
          <Text style={styles.gemEmoji}>💎</Text>
        </Animated.View>
      ))}
      
      <Animated.View
        style={[
          styles.amountBadge,
          {
            left: startX - 30,
            top: startY - 80,
            opacity: particles[0]?.opacity ?? 0,
            transform: [
              { translateY: particles[0]?.translateY ?? 0 },
              { scale: particles[0]?.scale ?? 0 },
            ],
          },
        ]}
      >
        <Text style={styles.amountText}>+{amount}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
  },
  gemParticle: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gemEmoji: {
    fontSize: 32,
  },
  amountBadge: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountText: {
    ...typography.h2,
    color: colors.gem,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

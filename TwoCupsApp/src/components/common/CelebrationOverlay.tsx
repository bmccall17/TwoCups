import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { colors, typography, spacing } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COUNT = 30;
const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#FF69B4', '#00CED1'];
const CONFETTI_EMOJIS = ['🎉', '✨', '💫', '⭐', '🌟', '💖', '🎊'];

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  scale: Animated.Value;
  color: string;
  emoji: string;
  startX: number;
}

interface CelebrationOverlayProps {
  visible: boolean;
  message: string;
  subMessage?: string;
  onDismiss: () => void;
  duration?: number;
}

export function CelebrationOverlay({
  visible,
  message,
  subMessage,
  onDismiss,
  duration = 3500,
}: CelebrationOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const confettiPieces = useRef<ConfettiPiece[]>([]);

  // Initialize confetti pieces
  if (confettiPieces.current.length === 0) {
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const startX = Math.random() * SCREEN_WIDTH;
      confettiPieces.current.push({
        x: new Animated.Value(startX),
        y: new Animated.Value(-50),
        rotate: new Animated.Value(0),
        scale: new Animated.Value(Math.random() * 0.5 + 0.5),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
        startX,
      });
    }
  }

  useEffect(() => {
    if (visible) {
      // Reset confetti positions
      confettiPieces.current.forEach((piece) => {
        piece.y.setValue(-50);
        piece.x.setValue(piece.startX);
        piece.rotate.setValue(0);
      });

      // Fade in and scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate confetti
      confettiPieces.current.forEach((piece, index) => {
        const delay = index * 50;
        const fallDuration = 2000 + Math.random() * 1000;
        const horizontalMovement = (Math.random() - 0.5) * 100;

        Animated.parallel([
          Animated.timing(piece.y, {
            toValue: SCREEN_HEIGHT + 50,
            duration: fallDuration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(piece.x, {
            toValue: piece.startX + horizontalMovement,
            duration: fallDuration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(piece.rotate, {
            toValue: Math.random() * 10 - 5,
            duration: fallDuration,
            delay,
            useNativeDriver: true,
          }),
        ]).start();
      });

      // Auto-dismiss
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.5,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss();
        });
      }, duration - 300);

      return () => clearTimeout(timer);
    }
  }, [visible, fadeAnim, scaleAnim, duration, onDismiss]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Confetti */}
        {confettiPieces.current.map((piece, index) => (
          <Animated.Text
            key={index}
            style={[
              styles.confetti,
              {
                transform: [
                  { translateX: piece.x },
                  { translateY: piece.y },
                  {
                    rotate: piece.rotate.interpolate({
                      inputRange: [-5, 5],
                      outputRange: ['-180deg', '180deg'],
                    }),
                  },
                  { scale: piece.scale },
                ],
              },
            ]}
          >
            {piece.emoji}
          </Animated.Text>
        ))}

        {/* Center content */}
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.celebrationEmoji}>🏆</Text>
          <Text style={styles.message}>{message}</Text>
          {subMessage && <Text style={styles.subMessage}>{subMessage}</Text>}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    fontSize: 24,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  celebrationEmoji: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  message: {
    ...typography.h1,
    color: colors.cupFilled,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

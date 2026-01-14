import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from './AuthContext';
import { colors, spacing, typography, borderRadius } from '../theme';

const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000];

const MILESTONE_MESSAGES: Record<number, string> = {
  100: "You've earned your first 100 gems! You're off to a great start!",
  250: "250 gems! You're building something beautiful together!",
  500: "500 gems! You're crushing it! Keep nurturing your relationship!",
  1000: "1000 gems! A true gem collector! Your love is shining bright!",
  2500: "2500 gems! You're a love champion! Amazing dedication!",
  5000: "5000 gems! Legendary status! Your connection is unbreakable!",
  10000: "10000 gems! You've reached the ultimate milestone! True relationship goals!",
};

const MILESTONE_BADGES: Record<number, string> = {
  100: '💎',
  250: '✨',
  500: '🏆',
  1000: '👑',
  2500: '🌟',
  5000: '💫',
  10000: '🎆',
};

interface MilestoneCelebrationContextType {
  checkMilestone: (newGemCount: number, achievedMilestones: number[]) => void;
}

const MilestoneCelebrationContext = createContext<MilestoneCelebrationContextType | undefined>(undefined);

interface MilestoneCelebrationProviderProps {
  children: React.ReactNode;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function CelebrationModal({
  visible,
  milestone,
  onClose,
}: {
  visible: boolean;
  milestone: number;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      sparkleAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim, sparkleAnim]);

  const badge = MILESTONE_BADGES[milestone] ?? '💎';
  const message = MILESTONE_MESSAGES[milestone] ?? `${milestone} gems! Amazing!`;

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View style={[styles.sparkleContainer, { opacity: sparkleOpacity }]}>
            <Text style={styles.sparkleEmoji}>✨</Text>
            <Text style={[styles.sparkleEmoji, styles.sparkleTopRight]}>✨</Text>
            <Text style={[styles.sparkleEmoji, styles.sparkleBottomLeft]}>✨</Text>
            <Text style={[styles.sparkleEmoji, styles.sparkleBottomRight]}>✨</Text>
          </Animated.View>

          <Text style={styles.badge}>{badge}</Text>
          <Text style={styles.milestoneTitle}>{milestone} Gems!</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.gemDisplay}>
            <Text style={styles.gemIcon}>💎</Text>
            <Text style={styles.gemCount}>{milestone}</Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Celebrate! 🎉</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function MilestoneCelebrationProvider({ children }: MilestoneCelebrationProviderProps) {
  const { user, userData } = useAuth();
  const [celebratingMilestone, setCelebratingMilestone] = useState<number | null>(null);
  const pendingMilestones = useRef<number[]>([]);

  const markMilestoneAchieved = useCallback(async (milestone: number) => {
    if (!user?.uid || !userData?.activeCoupleId) return;

    try {
      const playerDocRef = doc(db, 'couples', userData.activeCoupleId, 'players', user.uid);
      await updateDoc(playerDocRef, {
        achievedMilestones: arrayUnion(milestone),
      });
    } catch (error) {
      console.error('Error marking milestone achieved:', error);
    }
  }, [user?.uid, userData?.activeCoupleId]);

  const checkMilestone = useCallback((newGemCount: number, achievedMilestones: number[]) => {
    const newlyReachedMilestones = MILESTONES.filter(
      (m) => newGemCount >= m && !achievedMilestones.includes(m)
    );

    if (newlyReachedMilestones.length > 0) {
      const highestMilestone = Math.max(...newlyReachedMilestones);
      pendingMilestones.current = newlyReachedMilestones;
      setCelebratingMilestone(highestMilestone);
    }
  }, []);

  const handleClose = useCallback(() => {
    pendingMilestones.current.forEach((m) => {
      markMilestoneAchieved(m);
    });
    pendingMilestones.current = [];
    setCelebratingMilestone(null);
  }, [markMilestoneAchieved]);

  return (
    <MilestoneCelebrationContext.Provider value={{ checkMilestone }}>
      {children}
      <CelebrationModal
        visible={celebratingMilestone !== null}
        milestone={celebratingMilestone ?? 100}
        onClose={handleClose}
      />
    </MilestoneCelebrationContext.Provider>
  );
}

export function useMilestoneCelebration() {
  const context = useContext(MilestoneCelebrationContext);
  if (!context) {
    throw new Error('useMilestoneCelebration must be used within a MilestoneCelebrationProvider');
  }
  return context;
}

export { MILESTONES };

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    borderWidth: 2,
    borderColor: colors.gem,
    shadowColor: colors.gem,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkleEmoji: {
    position: 'absolute',
    fontSize: 24,
    top: -10,
    left: -10,
  },
  sparkleTopRight: {
    left: undefined,
    right: -10,
  },
  sparkleBottomLeft: {
    top: undefined,
    bottom: -10,
  },
  sparkleBottomRight: {
    top: undefined,
    left: undefined,
    bottom: -10,
    right: -10,
  },
  badge: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  milestoneTitle: {
    ...typography.h1,
    color: colors.gem,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  gemDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gem + '20',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  gemIcon: {
    fontSize: 32,
    marginRight: spacing.sm,
  },
  gemCount: {
    ...typography.h2,
    color: colors.gem,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  closeButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
});

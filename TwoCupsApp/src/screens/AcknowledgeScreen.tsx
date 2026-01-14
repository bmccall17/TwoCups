import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { acknowledgeAttempt } from '../services/api';
import { Button, LoadingSpinner, EmptyState, CelebrationOverlay } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';
import { Attempt } from '../types';

type FilterType = 'pending' | 'acknowledged' | 'all';

interface CelebrationState {
  visible: boolean;
  message: string;
  subMessage?: string;
}

export function AcknowledgeScreen() {
  const { user, userData, coupleData } = useAuth();
  const { showSuccess, showError } = useToast();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [partnerNames, setPartnerNames] = useState<Record<string, string>>({});
  const [celebration, setCelebration] = useState<CelebrationState>({
    visible: false,
    message: '',
  });

  const coupleId = userData?.activeCoupleId;
  const myUid = user?.uid;

  // Fetch partner names for display
  useEffect(() => {
    if (!coupleData?.partnerIds) return;

    const fetchNames = async () => {
      const names: Record<string, string> = {};
      for (const partnerId of coupleData.partnerIds) {
        if (partnerId !== myUid) {
          const userDoc = await getDoc(doc(db, 'users', partnerId));
          if (userDoc.exists()) {
            names[partnerId] = userDoc.data()?.displayName || 'Partner';
          }
        }
      }
      setPartnerNames(names);
    };

    fetchNames();
  }, [coupleData?.partnerIds, myUid]);

  // Fetch attempts for current user (as recipient)
  useEffect(() => {
    if (!coupleId || !myUid) return;

    const attemptsRef = collection(db, 'couples', coupleId, 'attempts');
    const q = query(
      attemptsRef,
      where('forPlayerId', '==', myUid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const attemptsList: Attempt[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() ?? new Date(),
        acknowledgedAt: doc.data().acknowledgedAt?.toDate(),
      })) as Attempt[];
      setAttempts(attemptsList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching attempts:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [coupleId, myUid]);

  const handleDismissCelebration = useCallback(() => {
    setCelebration({ visible: false, message: '' });
  }, []);

  const handleAcknowledge = async (attempt: Attempt) => {
    if (!coupleId) return;

    setAcknowledging(attempt.id);
    try {
      const result = await acknowledgeAttempt({
        coupleId,
        attemptId: attempt.id,
      });

      if (result.collectiveCupOverflow) {
        setCelebration({
          visible: true,
          message: 'Collective Cup Overflowed!',
          subMessage: `+${result.gemsAwarded} gems! You both reached 100 together!`,
        });
      } else if (result.cupOverflow) {
        setCelebration({
          visible: true,
          message: 'Your Cup Overflowed!',
          subMessage: `+${result.gemsAwarded} gems! Amazing work!`,
        });
      } else {
        showSuccess(`+${result.gemsAwarded} gems! Thank you for acknowledging.`);
      }
    } catch (error: any) {
      showError(error.message || 'Failed to acknowledge');
    } finally {
      setAcknowledging(null);
    }
  };

  const filteredAttempts = attempts.filter(attempt => {
    if (filter === 'pending') return !attempt.acknowledged;
    if (filter === 'acknowledged') return attempt.acknowledged;
    return true;
  });

  const pendingCount = attempts.filter(a => !a.acknowledged).length;
  const acknowledgedCount = attempts.filter(a => a.acknowledged).length;

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    }
    return date.toLocaleDateString();
  };

  const getPartnerName = (playerId: string) => {
    return partnerNames[playerId] || 'Partner';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Acknowledge Attempts</Text>
          <Text style={styles.subtitle}>
            {pendingCount > 0
              ? `${pendingCount} pending acknowledgment${pendingCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
              Pending ({pendingCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'acknowledged' && styles.filterTabActive]}
            onPress={() => setFilter('acknowledged')}
          >
            <Text style={[styles.filterText, filter === 'acknowledged' && styles.filterTextActive]}>
              Done ({acknowledgedCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({attempts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Attempts List */}
        {loading ? (
          <LoadingSpinner message="Loading attempts..." />
        ) : filteredAttempts.length === 0 ? (
          <EmptyState
            icon="✨"
            title={
              filter === 'pending'
                ? 'No pending attempts to acknowledge'
                : filter === 'acknowledged'
                ? 'No acknowledged attempts yet'
                : 'No attempts yet'
            }
            subtitle="Your partner can log attempts for you!"
          />
        ) : (
          <View style={styles.attemptsList}>
            {filteredAttempts.map((attempt) => (
              <View
                key={attempt.id}
                style={[
                  styles.attemptCard,
                  attempt.acknowledged && styles.attemptCardAcknowledged,
                ]}
              >
                <View style={styles.attemptHeader}>
                  <Text style={styles.attemptBy}>
                    {getPartnerName(attempt.byPlayerId)}
                  </Text>
                  <Text style={styles.attemptTime}>
                    {formatDate(attempt.createdAt)}
                  </Text>
                </View>

                <Text style={styles.attemptAction}>{attempt.action}</Text>

                {attempt.description && (
                  <Text style={styles.attemptDescription}>{attempt.description}</Text>
                )}

                {attempt.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{attempt.category}</Text>
                  </View>
                )}

                {attempt.fulfilledRequestId && (
                  <View style={styles.fulfilledBadge}>
                    <Text style={styles.fulfilledText}>Fulfilled your request!</Text>
                  </View>
                )}

                {!attempt.acknowledged ? (
                  <Button
                    title={acknowledging === attempt.id ? 'Acknowledging...' : 'Acknowledge'}
                    onPress={() => handleAcknowledge(attempt)}
                    loading={acknowledging === attempt.id}
                    disabled={acknowledging !== null}
                    style={styles.acknowledgeButton}
                  />
                ) : (
                  <View style={styles.acknowledgedStatus}>
                    <Text style={styles.acknowledgedText}>
                      Acknowledged {attempt.acknowledgedAt ? formatDate(attempt.acknowledgedAt) : ''}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <CelebrationOverlay
        visible={celebration.visible}
        message={celebration.message}
        subMessage={celebration.subMessage}
        onDismiss={handleDismissCelebration}
      />
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
  },
  header: {
    marginBottom: spacing.lg,
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
  filterContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  
  attemptsList: {
    gap: spacing.md,
  },
  attemptCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    marginBottom: spacing.md,
  },
  attemptCardAcknowledged: {
    borderLeftColor: colors.success,
    opacity: 0.8,
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  attemptBy: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  attemptTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  attemptAction: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  attemptDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  categoryText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  fulfilledBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  fulfilledText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  acknowledgeButton: {
    marginTop: spacing.sm,
  },
  acknowledgedStatus: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  acknowledgedText: {
    ...typography.caption,
    color: colors.success,
  },
});

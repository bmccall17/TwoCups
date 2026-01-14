import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { acknowledgeAttempt } from '../services/api';
import { Button } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';
import { Attempt } from '../types';

type FilterType = 'pending' | 'acknowledged' | 'all';

interface AcknowledgeScreenProps {
  onGoBack: () => void;
}

export function AcknowledgeScreen({ onGoBack }: AcknowledgeScreenProps) {
  const { user, userData, coupleData } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [partnerNames, setPartnerNames] = useState<Record<string, string>>({});

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

  const handleAcknowledge = async (attempt: Attempt) => {
    if (!coupleId) return;

    setAcknowledging(attempt.id);
    try {
      const result = await acknowledgeAttempt({
        coupleId,
        attemptId: attempt.id,
      });

      const message = result.cupOverflow
        ? `+${result.gemsAwarded} gems! Your cup overflowed!`
        : `+${result.gemsAwarded} gems! Thank you for acknowledging.`;

      Alert.alert('Acknowledged!', message);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to acknowledge');
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
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredAttempts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {filter === 'pending'
                ? 'No pending attempts to acknowledge'
                : filter === 'acknowledged'
                ? 'No acknowledged attempts yet'
                : 'No attempts yet'}
            </Text>
            <Text style={styles.emptyHint}>
              When your partner logs something they did for you, it will appear here.
            </Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
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

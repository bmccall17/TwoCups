import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useGemAnimation } from '../context/GemAnimationContext';
import { acknowledgeAttempt } from '../services/api';
import { Button, LoadingSpinner, EmptyState, ErrorState, CelebrationOverlay } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';
import { Attempt } from '../types';
import { getErrorMessage } from '../types/utils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type FilterType = 'pending' | 'acknowledged' | 'all';

interface CelebrationState {
  visible: boolean;
  message: string;
  subMessage?: string;
}

interface AttemptCardProps {
  attempt: Attempt;
  getPartnerName: (playerId: string) => string;
  formatDate: (date: Date) => string;
  acknowledging: string | null;
  onAcknowledge: (attempt: Attempt) => void;
}

const AttemptCard = memo(function AttemptCard({
  attempt,
  getPartnerName,
  formatDate,
  acknowledging,
  onAcknowledge,
}: AttemptCardProps) {
  return (
    <View
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
          onPress={() => onAcknowledge(attempt)}
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
  );
});

export function AcknowledgeScreen() {
  const { user, userData, coupleData } = useAuth();
  const { showSuccess, showError } = useToast();
  const { showGemAnimation } = useGemAnimation();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [partnerNames, setPartnerNames] = useState<Record<string, string>>({});
  const [celebration, setCelebration] = useState<CelebrationState>({
    visible: false,
    message: '',
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setRefreshKey(k => k + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
  }, []);

  // Fetch attempts for current user (as recipient)
  useEffect(() => {
    if (!coupleId || !myUid) return;

    setError(null);
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
      setRefreshing(false);
    }, (err) => {
      console.error('Error fetching attempts:', err);
      setError(err.message || 'Failed to load attempts');
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, [coupleId, myUid, refreshKey]);

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

      showGemAnimation(result.gemsAwarded, undefined, SCREEN_HEIGHT / 3);

      const gemsPerPlayer = result.gemsAwarded / 2;

      if (result.collectiveCupOverflow) {
        setCelebration({
          visible: true,
          message: 'Collective Cup Overflowed!',
          subMessage: `+${gemsPerPlayer} gems each! You both reached 100 together!`,
        });
      } else if (result.cupOverflow) {
        setCelebration({
          visible: true,
          message: 'Your Cup Overflowed!',
          subMessage: `+${gemsPerPlayer} gems each! Amazing work!`,
        });
      } else {
        showSuccess(
          `Thank you for acknowledging!`,
          undefined,
          { amount: gemsPerPlayer, partnerAmount: gemsPerPlayer }
        );
      }
    } catch (error: unknown) {
      showError(getErrorMessage(error));
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

  const formatDate = useCallback((date: Date) => {
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
  }, []);

  const getPartnerName = useCallback((playerId: string) => {
    return partnerNames[playerId] || 'Partner';
  }, [partnerNames]);

  const renderAttemptCard = useCallback(({ item: attempt }: ListRenderItemInfo<Attempt>) => (
    <AttemptCard
      attempt={attempt}
      getPartnerName={getPartnerName}
      formatDate={formatDate}
      acknowledging={acknowledging}
      onAcknowledge={handleAcknowledge}
    />
  ), [getPartnerName, formatDate, acknowledging, handleAcknowledge]);

  const keyExtractor = useCallback((item: Attempt) => item.id, []);

  const ListHeaderComponent = useMemo(() => (
    <>
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
    </>
  ), [pendingCount, acknowledgedCount, attempts.length, filter]);

  const ListEmptyComponent = useMemo(() => (
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
  ), [filter]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading attempts..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <ErrorState error={error} onRetry={handleRetry} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredAttempts}
        renderItem={renderAttemptCard}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={undefined}
      />

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
  listContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  errorContainer: {
    flex: 1,
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

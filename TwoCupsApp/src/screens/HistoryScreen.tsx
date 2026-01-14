import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, EmptyState } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';
import { Attempt } from '../types';

const PAGE_SIZE = 20;

export function HistoryScreen() {
  const { user, userData, coupleData } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});

  const coupleId = userData?.activeCoupleId;
  const myUid = user?.uid;

  useEffect(() => {
    if (!coupleData?.partnerIds) return;

    const fetchNames = async () => {
      const names: Record<string, string> = {};
      for (const partnerId of coupleData.partnerIds) {
        const userDoc = await getDoc(doc(db, 'users', partnerId));
        if (userDoc.exists()) {
          names[partnerId] = userDoc.data()?.displayName || 'Unknown';
        }
      }
      setPlayerNames(names);
    };

    fetchNames();
  }, [coupleData?.partnerIds]);

  const fetchAttempts = useCallback(async (isRefresh = false) => {
    if (!coupleId) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const attemptsRef = collection(db, 'couples', coupleId, 'attempts');
      const q = query(
        attemptsRef,
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const attemptsList: Attempt[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() ?? new Date(),
        acknowledgedAt: doc.data().acknowledgedAt?.toDate(),
      })) as Attempt[];

      setAttempts(attemptsList);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching attempts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coupleId]);

  const loadMore = useCallback(async () => {
    if (!coupleId || loadingMore || !hasMore || !lastDoc) return;

    setLoadingMore(true);

    try {
      const attemptsRef = collection(db, 'couples', coupleId, 'attempts');
      const q = query(
        attemptsRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const newAttempts: Attempt[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() ?? new Date(),
        acknowledgedAt: doc.data().acknowledgedAt?.toDate(),
      })) as Attempt[];

      setAttempts(prev => [...prev, ...newAttempts]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more attempts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [coupleId, loadingMore, hasMore, lastDoc]);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  const handleRefresh = useCallback(() => {
    fetchAttempts(true);
  }, [fetchAttempts]);

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

  const getPlayerName = (playerId: string) => {
    if (playerId === myUid) return 'You';
    return playerNames[playerId] || 'Partner';
  };

  const renderAttemptCard = ({ item: attempt }: { item: Attempt }) => (
    <View
      style={[
        styles.attemptCard,
        attempt.acknowledged && styles.attemptCardAcknowledged,
      ]}
    >
      <View style={styles.attemptHeader}>
        <View style={styles.playerInfo}>
          <Text style={styles.byPlayer}>
            {getPlayerName(attempt.byPlayerId)}
          </Text>
          <Text style={styles.arrowText}> → </Text>
          <Text style={styles.forPlayer}>
            {getPlayerName(attempt.forPlayerId)}
          </Text>
        </View>
        <Text style={styles.attemptTime}>
          {formatDate(attempt.createdAt)}
        </Text>
      </View>

      <Text style={styles.attemptAction}>{attempt.action}</Text>

      {attempt.description && (
        <Text style={styles.attemptDescription}>{attempt.description}</Text>
      )}

      <View style={styles.badgeRow}>
        {attempt.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{attempt.category}</Text>
          </View>
        )}

        {attempt.fulfilledRequestId && (
          <View style={styles.fulfilledBadge}>
            <Text style={styles.fulfilledText}>Fulfilled request</Text>
          </View>
        )}

        {attempt.acknowledged ? (
          <View style={styles.acknowledgedBadge}>
            <Text style={styles.acknowledgedText}>✓ Acknowledged</Text>
          </View>
        ) : (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Pending</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading history..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>
          {attempts.length > 0
            ? `${attempts.length}${hasMore ? '+' : ''} attempts`
            : 'No attempts yet'}
        </Text>
      </View>

      {attempts.length === 0 ? (
        <EmptyState
          icon="📜"
          title="No history yet"
          subtitle="Start logging attempts to see your relationship timeline!"
        />
      ) : (
        <FlatList
          data={attempts}
          renderItem={renderAttemptCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
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
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  byPlayer: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  arrowText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  forPlayer: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  fulfilledBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  fulfilledText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  acknowledgedBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  acknowledgedText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  pendingText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingMoreText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});

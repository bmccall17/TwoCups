import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
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

type PlayerFilterType = 'all' | 'byMe' | 'forMe' | 'byPartner' | 'forPartner';
type StatusFilterType = 'all' | 'pending' | 'acknowledged';

export function HistoryScreen() {
  const { user, userData, coupleData } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [playerFilter, setPlayerFilter] = useState<PlayerFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');

  const coupleId = userData?.activeCoupleId;
  const myUid = user?.uid;
  const partnerId = coupleData?.partnerIds?.find(id => id !== myUid);

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

  // Filter attempts by player and status
  const filteredAttempts = useMemo(() => {
    return attempts.filter(attempt => {
      // Player filter
      let matchesPlayer = true;
      switch (playerFilter) {
        case 'byMe':
          matchesPlayer = attempt.byPlayerId === myUid;
          break;
        case 'forMe':
          matchesPlayer = attempt.forPlayerId === myUid;
          break;
        case 'byPartner':
          matchesPlayer = attempt.byPlayerId === partnerId;
          break;
        case 'forPartner':
          matchesPlayer = attempt.forPlayerId === partnerId;
          break;
      }
      if (!matchesPlayer) return false;

      // Status filter
      switch (statusFilter) {
        case 'pending':
          return !attempt.acknowledged;
        case 'acknowledged':
          return attempt.acknowledged === true;
        default:
          return true;
      }
    });
  }, [attempts, playerFilter, statusFilter, myUid, partnerId]);

  // Calculate counts for each filter (respecting the other filter)
  const playerFilterCounts = useMemo(() => {
    const applyStatus = (a: Attempt) => {
      switch (statusFilter) {
        case 'pending': return !a.acknowledged;
        case 'acknowledged': return a.acknowledged === true;
        default: return true;
      }
    };
    return {
      all: attempts.filter(applyStatus).length,
      byMe: attempts.filter(a => a.byPlayerId === myUid && applyStatus(a)).length,
      forMe: attempts.filter(a => a.forPlayerId === myUid && applyStatus(a)).length,
      byPartner: attempts.filter(a => a.byPlayerId === partnerId && applyStatus(a)).length,
      forPartner: attempts.filter(a => a.forPlayerId === partnerId && applyStatus(a)).length,
    };
  }, [attempts, statusFilter, myUid, partnerId]);

  // Calculate status counts (respecting player filter)
  const statusFilterCounts = useMemo(() => {
    const applyPlayer = (a: Attempt) => {
      switch (playerFilter) {
        case 'byMe': return a.byPlayerId === myUid;
        case 'forMe': return a.forPlayerId === myUid;
        case 'byPartner': return a.byPlayerId === partnerId;
        case 'forPartner': return a.forPlayerId === partnerId;
        default: return true;
      }
    };
    return {
      all: attempts.filter(applyPlayer).length,
      pending: attempts.filter(a => !a.acknowledged && applyPlayer(a)).length,
      acknowledged: attempts.filter(a => a.acknowledged === true && applyPlayer(a)).length,
    };
  }, [attempts, playerFilter, myUid, partnerId]);

  const playerFilterOptions: { key: PlayerFilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'byMe', label: 'By Me' },
    { key: 'forMe', label: 'For Me' },
    { key: 'byPartner', label: 'By Partner' },
    { key: 'forPartner', label: 'For Partner' },
  ];

  const statusFilterOptions: { key: StatusFilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'acknowledged', label: 'Acknowledged' },
  ];

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
          {filteredAttempts.length > 0
            ? `${filteredAttempts.length}${hasMore && playerFilter === 'all' ? '+' : ''} attempts`
            : 'No attempts yet'}
        </Text>
      </View>

      {/* Player Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
        style={styles.filterScroll}
      >
        {playerFilterOptions.map(option => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterChip,
              playerFilter === option.key && styles.filterChipActive,
            ]}
            onPress={() => setPlayerFilter(option.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                playerFilter === option.key && styles.filterChipTextActive,
              ]}
            >
              {option.label} ({playerFilterCounts[option.key]})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
        style={styles.filterScroll}
      >
        {statusFilterOptions.map(option => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterChip,
              statusFilter === option.key && styles.filterChipActive,
              option.key === 'pending' && statusFilter !== option.key && styles.filterChipPending,
            ]}
            onPress={() => setStatusFilter(option.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === option.key && styles.filterChipTextActive,
                option.key === 'pending' && statusFilter !== option.key && styles.filterChipTextPending,
              ]}
            >
              {option.label} ({statusFilterCounts[option.key]})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredAttempts.length === 0 ? (
        <EmptyState
          icon="📜"
          title={playerFilter === 'all' && statusFilter === 'all' ? 'No history yet' : 'No matching attempts'}
          subtitle={
            playerFilter === 'all' && statusFilter === 'all'
              ? 'Start logging attempts to see your relationship timeline!'
              : 'Try a different filter to see more attempts.'
          }
        />
      ) : (
        <FlatList
          data={filteredAttempts}
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
  filterScroll: {
    maxHeight: 50,
    marginBottom: spacing.md,
  },
  filterScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  filterChipPending: {
    backgroundColor: colors.warning + '20',
    borderColor: colors.warning,
  },
  filterChipTextPending: {
    color: colors.warning,
    fontWeight: '600',
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

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
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
  where,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  or,
} from 'firebase/firestore';
import { db, getCurrentUserId } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, EmptyState, ErrorState, Button } from '../components/common';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';
import { Attempt } from '../types';

const PAGE_SIZE = 20;

const BASE_GEM_AWARD = 1;
const REQUEST_FULFILLMENT_BONUS = 2;
const ACK_GEM_AWARD = 3;

interface GemHistoryEntry {
  id: string;
  amount: number;
  reason: 'logged_attempt' | 'request_fulfilled' | 'acknowledged_received' | 'acknowledged_given';
  reasonLabel: string;
  timestamp: Date;
  attemptId?: string;
  attemptAction?: string;
}

interface GemHistoryScreenProps {
  onGoBack?: () => void;
}

export function GemHistoryScreen({ onGoBack }: GemHistoryScreenProps) {
  const { user, userData, coupleData } = useAuth();
  const [entries, setEntries] = useState<GemHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [runningTotal, setRunningTotal] = useState(0);
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
          names[partnerId] = userDoc.data()?.username || 'Unknown';
        }
      }
      setPlayerNames(names);
    };

    fetchNames();
  }, [coupleData?.partnerIds]);

  const processAttemptsToGemEntries = useCallback((
    docs: QueryDocumentSnapshot<DocumentData>[],
    uid: string
  ): GemHistoryEntry[] => {
    const gemEntries: GemHistoryEntry[] = [];

    docs.forEach((docSnap) => {
      const data = docSnap.data();
      const attemptId = docSnap.id;
      const attemptAction = data.action || 'Unknown action';
      const createdAt = data.createdAt?.toDate() ?? new Date();
      const acknowledgedAt = data.acknowledgedAt?.toDate();
      const byPlayerId = data.byPlayerId;
      const forPlayerId = data.forPlayerId;
      const fulfilledRequestId = data.fulfilledRequestId;
      const acknowledged = data.acknowledged;

      if (byPlayerId === uid) {
        gemEntries.push({
          id: `${attemptId}-logged`,
          amount: BASE_GEM_AWARD,
          reason: 'logged_attempt',
          reasonLabel: 'Logged attempt',
          timestamp: createdAt,
          attemptId,
          attemptAction,
        });

        if (fulfilledRequestId) {
          gemEntries.push({
            id: `${attemptId}-fulfilled`,
            amount: REQUEST_FULFILLMENT_BONUS,
            reason: 'request_fulfilled',
            reasonLabel: 'Fulfilled request bonus',
            timestamp: createdAt,
            attemptId,
            attemptAction,
          });
        }

        if (acknowledged && acknowledgedAt) {
          gemEntries.push({
            id: `${attemptId}-ack-given`,
            amount: ACK_GEM_AWARD,
            reason: 'acknowledged_given',
            reasonLabel: 'Partner acknowledged',
            timestamp: acknowledgedAt,
            attemptId,
            attemptAction,
          });
        }
      }

      if (forPlayerId === uid && acknowledged && acknowledgedAt) {
        gemEntries.push({
          id: `${attemptId}-ack-received`,
          amount: ACK_GEM_AWARD,
          reason: 'acknowledged_received',
          reasonLabel: 'You acknowledged',
          timestamp: acknowledgedAt,
          attemptId,
          attemptAction,
        });
      }
    });

    return gemEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, []);

  const fetchEntries = useCallback(async (isRefresh = false) => {
    if (!coupleId || !myUid) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const attemptsRef = collection(db, 'couples', coupleId, 'attempts');
      const q = query(
        attemptsRef,
        or(
          where('byPlayerId', '==', myUid),
          where('forPlayerId', '==', myUid)
        ),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const gemEntries = processAttemptsToGemEntries(snapshot.docs, myUid);

      setEntries(gemEntries);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

      const total = gemEntries.reduce((sum, entry) => sum + entry.amount, 0);
      setRunningTotal(total);
    } catch (err: unknown) {
      console.error('Error fetching gem history:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load gem history';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coupleId, myUid, processAttemptsToGemEntries]);

  const loadMore = useCallback(async () => {
    if (!coupleId || !myUid || loadingMore || !hasMore || !lastDoc) return;

    setLoadingMore(true);

    try {
      const attemptsRef = collection(db, 'couples', coupleId, 'attempts');
      const q = query(
        attemptsRef,
        or(
          where('byPlayerId', '==', myUid),
          where('forPlayerId', '==', myUid)
        ),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const newEntries = processAttemptsToGemEntries(snapshot.docs, myUid);

      setEntries(prev => [...prev, ...newEntries]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

      setRunningTotal(prev => prev + newEntries.reduce((sum, entry) => sum + entry.amount, 0));
    } catch (error) {
      console.error('Error loading more gem history:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [coupleId, myUid, loadingMore, hasMore, lastDoc, processAttemptsToGemEntries]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleRefresh = useCallback(() => {
    fetchEntries(true);
  }, [fetchEntries]);

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getReasonIcon = (reason: GemHistoryEntry['reason']): string => {
    switch (reason) {
      case 'logged_attempt':
        return '💝';
      case 'request_fulfilled':
        return '🎯';
      case 'acknowledged_received':
        return '✅';
      case 'acknowledged_given':
        return '🤝';
      default:
        return '💎';
    }
  };

  const getReasonColor = (reason: GemHistoryEntry['reason']): string => {
    switch (reason) {
      case 'logged_attempt':
        return colors.primary;
      case 'request_fulfilled':
        return colors.success;
      case 'acknowledged_received':
        return colors.primaryLight;
      case 'acknowledged_given':
        return colors.gem;
      default:
        return colors.textSecondary;
    }
  };

  const renderEntry = ({ item, index }: { item: GemHistoryEntry; index: number }) => {
    const reasonColor = getReasonColor(item.reason);
    const reasonIcon = getReasonIcon(item.reason);

    return (
      <View style={styles.entryCard}>
        <View style={styles.entryRow}>
          <View style={styles.entryIconContainer}>
            <Text style={styles.entryIcon}>{reasonIcon}</Text>
          </View>
          
          <View style={styles.entryContent}>
            <Text style={styles.entryReason}>{item.reasonLabel}</Text>
            {item.attemptAction && (
              <Text style={styles.entryAction} numberOfLines={1}>
                "{item.attemptAction}"
              </Text>
            )}
            <Text style={styles.entryTime}>{formatTime(item.timestamp)}</Text>
          </View>

          <View style={styles.entryAmount}>
            <Text style={[styles.gemBadge, { backgroundColor: reasonColor + '20' }]}>
              <Text style={[styles.gemBadgeText, { color: reasonColor }]}>+{item.amount}</Text>
              <Text style={styles.gemBadgeIcon}> 💎</Text>
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryIcon}>💎</Text>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryLabel}>Gems Shown</Text>
          <Text style={styles.summaryValue}>{runningTotal.toLocaleString()}</Text>
        </View>
      </View>
      <Text style={styles.summaryHint}>
        Showing gem earnings from your activity. Scroll for more history.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {onGoBack && (
            <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Gem History</Text>
        </View>
        <LoadingSpinner message="Loading gem history..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {onGoBack && (
            <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Gem History</Text>
        </View>
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <ErrorState error={error} onRetry={() => fetchEntries()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onGoBack && (
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Gem History</Text>
        <Text style={styles.subtitle}>💎</Text>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="💎"
            title="No gem history yet"
            subtitle="Start logging attempts and acknowledging your partner to earn gems!"
          />
        }
        ListFooterComponent={renderFooter}
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    marginRight: spacing.md,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    flex: 1,
  },
  subtitle: {
    fontSize: 20,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.gem + '40',
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.h1,
    color: colors.gem,
    fontWeight: '700',
  },
  summaryHint: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.gem,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  entryIcon: {
    fontSize: 20,
  },
  entryContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  entryReason: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  entryAction: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  entryTime: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  entryAmount: {
    alignItems: 'flex-end',
  },
  gemBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gemBadgeText: {
    ...typography.body,
    fontWeight: '700',
  },
  gemBadgeIcon: {
    fontSize: 14,
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

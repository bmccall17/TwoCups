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
  where,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, EmptyState } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';
import { Attempt } from '../types';
import { usePlayerData } from '../hooks/usePlayerData';

const PAGE_SIZE = 20;

const CATEGORIES = [
  'Words of Affirmation',
  'Acts of Service',
  'Quality Time',
  'Physical Touch',
  'Gifts',
  'Support & Encouragement',
  'Listening & Presence',
  'Shared Activities',
  'Surprises & Thoughtfulness',
];

type PlayerFilterType = 'all' | 'byMe' | 'forMe' | 'byPartner' | 'forPartner';
type StatusFilterType = 'all' | 'pending' | 'acknowledged';
type CategoryFilterType = 'all' | string;
type DateRangeFilterType = 'today' | 'last7days' | 'last30days' | 'alltime';

const getDateRangeStart = (filter: DateRangeFilterType): Date | null => {
  const now = new Date();
  switch (filter) {
    case 'today':
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return today;
    case 'last7days':
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return sevenDaysAgo;
    case 'last30days':
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      return thirtyDaysAgo;
    case 'alltime':
      return null;
  }
};

const formatDateRange = (filter: DateRangeFilterType): string => {
  const now = new Date();
  switch (filter) {
    case 'today':
      return `Today (${now.toLocaleDateString()})`;
    case 'last7days':
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return `${sevenDaysAgo.toLocaleDateString()} – ${now.toLocaleDateString()}`;
    case 'last30days':
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return `${thirtyDaysAgo.toLocaleDateString()} – ${now.toLocaleDateString()}`;
    case 'alltime':
      return 'All Time';
  }
};

export function HistoryScreen() {
  const { user, userData, coupleData } = useAuth();
  const { myPlayer, partnerPlayer, partnerName } = usePlayerData();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [playerFilter, setPlayerFilter] = useState<PlayerFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilterType>('last7days');
  const [showAnalytics, setShowAnalytics] = useState(true);

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
      const dateStart = getDateRangeStart(dateRangeFilter);
      
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)];
      if (dateStart) {
        constraints.unshift(where('createdAt', '>=', Timestamp.fromDate(dateStart)));
      }
      
      const q = query(attemptsRef, ...constraints);

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
  }, [coupleId, dateRangeFilter]);

  const loadMore = useCallback(async () => {
    if (!coupleId || loadingMore || !hasMore || !lastDoc) return;

    setLoadingMore(true);

    try {
      const attemptsRef = collection(db, 'couples', coupleId, 'attempts');
      const dateStart = getDateRangeStart(dateRangeFilter);
      
      const constraints: QueryConstraint[] = [
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE),
      ];
      if (dateStart) {
        constraints.unshift(where('createdAt', '>=', Timestamp.fromDate(dateStart)));
      }
      
      const q = query(attemptsRef, ...constraints);

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
  }, [coupleId, loadingMore, hasMore, lastDoc, dateRangeFilter]);

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

  // Filter attempts by player, status, and category
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
      let matchesStatus = true;
      switch (statusFilter) {
        case 'pending':
          matchesStatus = !attempt.acknowledged;
          break;
        case 'acknowledged':
          matchesStatus = attempt.acknowledged === true;
          break;
      }
      if (!matchesStatus) return false;

      // Category filter
      if (categoryFilter !== 'all') {
        return attempt.category === categoryFilter;
      }

      return true;
    });
  }, [attempts, playerFilter, statusFilter, categoryFilter, myUid, partnerId]);

  // Helper functions for filtering
  const applyPlayerFilter = (a: Attempt, filter: PlayerFilterType) => {
    switch (filter) {
      case 'byMe': return a.byPlayerId === myUid;
      case 'forMe': return a.forPlayerId === myUid;
      case 'byPartner': return a.byPlayerId === partnerId;
      case 'forPartner': return a.forPlayerId === partnerId;
      default: return true;
    }
  };

  const applyStatusFilter = (a: Attempt, filter: StatusFilterType) => {
    switch (filter) {
      case 'pending': return !a.acknowledged;
      case 'acknowledged': return a.acknowledged === true;
      default: return true;
    }
  };

  const applyCategoryFilter = (a: Attempt, filter: CategoryFilterType) => {
    if (filter === 'all') return true;
    return a.category === filter;
  };

  // Calculate counts for each filter (respecting other filters)
  const playerFilterCounts = useMemo(() => {
    const applyOthers = (a: Attempt) =>
      applyStatusFilter(a, statusFilter) && applyCategoryFilter(a, categoryFilter);
    return {
      all: attempts.filter(applyOthers).length,
      byMe: attempts.filter(a => a.byPlayerId === myUid && applyOthers(a)).length,
      forMe: attempts.filter(a => a.forPlayerId === myUid && applyOthers(a)).length,
      byPartner: attempts.filter(a => a.byPlayerId === partnerId && applyOthers(a)).length,
      forPartner: attempts.filter(a => a.forPlayerId === partnerId && applyOthers(a)).length,
    };
  }, [attempts, statusFilter, categoryFilter, myUid, partnerId]);

  // Calculate status counts (respecting other filters)
  const statusFilterCounts = useMemo(() => {
    const applyOthers = (a: Attempt) =>
      applyPlayerFilter(a, playerFilter) && applyCategoryFilter(a, categoryFilter);
    return {
      all: attempts.filter(applyOthers).length,
      pending: attempts.filter(a => !a.acknowledged && applyOthers(a)).length,
      acknowledged: attempts.filter(a => a.acknowledged === true && applyOthers(a)).length,
    };
  }, [attempts, playerFilter, categoryFilter, myUid, partnerId]);

  // Calculate category counts (respecting other filters) - only categories with attempts
  const categoryFilterData = useMemo(() => {
    const applyOthers = (a: Attempt) =>
      applyPlayerFilter(a, playerFilter) && applyStatusFilter(a, statusFilter);
    
    const counts: Record<string, number> = {};
    attempts.filter(applyOthers).forEach(a => {
      if (a.category) {
        counts[a.category] = (counts[a.category] || 0) + 1;
      }
    });

    // Only include categories that have attempts
    const categoriesWithAttempts = CATEGORIES.filter(cat => counts[cat] > 0);
    const totalCount = attempts.filter(applyOthers).length;

    return {
      categories: categoriesWithAttempts,
      counts,
      totalCount,
    };
  }, [attempts, playerFilter, statusFilter, myUid, partnerId]);

  // Analytics stats - calculated from loaded attempts (respects date range filter)
  const analyticsStats = useMemo(() => {
    const myAttempts = attempts.filter(a => a.byPlayerId === myUid);
    const partnerAttempts = attempts.filter(a => a.byPlayerId === partnerId);
    
    const totalAttempts = attempts.length;
    const acknowledgedAttempts = attempts.filter(a => a.acknowledged).length;
    const acknowledgeRate = totalAttempts > 0 ? Math.round((acknowledgedAttempts / totalAttempts) * 100) : 0;

    return {
      totalAttempts,
      myAttemptsCount: myAttempts.length,
      partnerAttemptsCount: partnerAttempts.length,
      acknowledgedCount: acknowledgedAttempts,
      pendingCount: totalAttempts - acknowledgedAttempts,
      acknowledgeRate,
    };
  }, [attempts, myUid, partnerId]);

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

  const dateRangeFilterOptions: { key: DateRangeFilterType; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'last7days', label: 'Last 7 Days' },
    { key: 'last30days', label: 'Last 30 Days' },
    { key: 'alltime', label: 'All Time' },
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
        <Text style={styles.dateRangeText}>{formatDateRange(dateRangeFilter)}</Text>
      </View>

      {/* Date Range Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
        style={styles.filterScroll}
      >
        {dateRangeFilterOptions.map(option => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterChip,
              styles.filterChipDate,
              dateRangeFilter === option.key && styles.filterChipActive,
            ]}
            onPress={() => setDateRangeFilter(option.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                styles.filterChipTextDate,
                dateRangeFilter === option.key && styles.filterChipTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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

      {/* Category Filter Chips - only show if there are categories with attempts */}
      {categoryFilterData.categories.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              categoryFilter === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setCategoryFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                categoryFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              All Categories ({categoryFilterData.totalCount})
            </Text>
          </TouchableOpacity>
          {categoryFilterData.categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                styles.filterChipCategory,
                categoryFilter === cat && styles.filterChipActive,
              ]}
              onPress={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  styles.filterChipTextCategory,
                  categoryFilter === cat && styles.filterChipTextActive,
                ]}
              >
                {cat} ({categoryFilterData.counts[cat]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Analytics Section */}
      <TouchableOpacity
        style={styles.analyticsHeader}
        onPress={() => setShowAnalytics(!showAnalytics)}
      >
        <Text style={styles.analyticsTitle}>📊 Analytics</Text>
        <Text style={styles.analyticsToggle}>{showAnalytics ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {showAnalytics && (
        <View style={styles.analyticsContainer}>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsStat}>
              <Text style={styles.analyticsValue}>{analyticsStats.myAttemptsCount}</Text>
              <Text style={styles.analyticsLabel}>My Attempts</Text>
            </View>
            <View style={styles.analyticsStat}>
              <Text style={styles.analyticsValue}>{analyticsStats.partnerAttemptsCount}</Text>
              <Text style={styles.analyticsLabel}>{partnerName}'s</Text>
            </View>
            <View style={styles.analyticsStat}>
              <Text style={styles.analyticsValue}>{analyticsStats.totalAttempts}</Text>
              <Text style={styles.analyticsLabel}>Total</Text>
            </View>
          </View>

          <View style={styles.analyticsRow}>
            <View style={styles.analyticsStat}>
              <Text style={[styles.analyticsValue, { color: colors.success }]}>
                {analyticsStats.acknowledgedCount}
              </Text>
              <Text style={styles.analyticsLabel}>Acknowledged</Text>
            </View>
            <View style={styles.analyticsStat}>
              <Text style={[styles.analyticsValue, { color: colors.warning }]}>
                {analyticsStats.pendingCount}
              </Text>
              <Text style={styles.analyticsLabel}>Pending</Text>
            </View>
            <View style={styles.analyticsStat}>
              <Text style={[styles.analyticsValue, { color: colors.primary }]}>
                {analyticsStats.acknowledgeRate}%
              </Text>
              <Text style={styles.analyticsLabel}>Ack Rate</Text>
            </View>
          </View>

          <View style={styles.analyticsRow}>
            <View style={styles.analyticsStat}>
              <Text style={[styles.analyticsValue, { color: colors.gem }]}>
                💎 {myPlayer?.gemCount ?? 0}
              </Text>
              <Text style={styles.analyticsLabel}>My Gems</Text>
            </View>
            <View style={styles.analyticsStat}>
              <Text style={[styles.analyticsValue, { color: colors.gem }]}>
                💎 {partnerPlayer?.gemCount ?? 0}
              </Text>
              <Text style={styles.analyticsLabel}>{partnerName}'s Gems</Text>
            </View>
          </View>
        </View>
      )}

      {filteredAttempts.length === 0 ? (
        <EmptyState
          icon="📜"
          title={playerFilter === 'all' && statusFilter === 'all' && categoryFilter === 'all' && dateRangeFilter === 'alltime' ? 'No history yet' : 'No matching attempts'}
          subtitle={
            playerFilter === 'all' && statusFilter === 'all' && categoryFilter === 'all' && dateRangeFilter === 'alltime'
              ? 'Start logging attempts to see your relationship timeline!'
              : 'Try a different filter or date range to see more attempts.'
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
  dateRangeText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
  filterChipCategory: {
    backgroundColor: colors.card,
    borderColor: colors.primary + '40',
  },
  filterChipDate: {
    backgroundColor: colors.surface,
    borderColor: colors.primary + '60',
  },
  filterChipTextDate: {
    color: colors.primary,
  },
  filterChipTextCategory: {
    color: colors.primary,
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
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
  },
  analyticsTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  analyticsToggle: {
    ...typography.body,
    color: colors.textMuted,
  },
  analyticsContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  analyticsStat: {
    alignItems: 'center',
    flex: 1,
  },
  analyticsValue: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  analyticsLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

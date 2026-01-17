import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  where,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/common';
import { colors, spacing, typography } from '../theme';
import { Attempt, Request, Suggestion } from '../types';
import { usePlayerData } from '../hooks/usePlayerData';
import {
  StatusSnapshotCard,
  HealthInsightsCard,
  CollapsibleFilterControls,
  TimelineEntryCard,
  DateRangeFilterType,
  StatusFilterType,
} from '../components/history';

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

export function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { user, userData, coupleData } = useAuth();
  const coupleId = userData?.activeCoupleId;
  const { myPlayer, partnerPlayer, partnerName } = usePlayerData();
  const myPlayerName = userData?.username || 'You';

  // State
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<Request[]>([]);
  const [partnerSuggestions, setPartnerSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateRangeFilterType>('last7days');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');

  const myUid = user?.uid;
  const partnerIds = coupleData?.partnerIds ?? [];
  const partnerId = partnerIds.find(id => id !== myUid);

  // Fetch attempts
  useEffect(() => {
    if (!coupleId || !user?.uid) return;

    setError(null);
    const attemptsRef = collection(db, 'couples', coupleId, 'attempts');
    const dateStart = getDateRangeStart(dateFilter);

    let q;
    if (dateStart) {
      q = query(
        attemptsRef,
        where('createdAt', '>=', Timestamp.fromDate(dateStart)),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(attemptsRef, orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const attemptsList: Attempt[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() ?? new Date(),
          acknowledgedAt: doc.data().acknowledgedAt?.toDate(),
        })) as Attempt[];
        setAttempts(attemptsList);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error('Error fetching attempts:', err);
        setError(err.message || 'Failed to load history');
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, [coupleId, user?.uid, dateFilter]);

  // Fetch partner's active requests (things partner requested ME to do)
  useEffect(() => {
    if (!coupleId || !myUid) return;

    const requestsRef = collection(db, 'couples', coupleId, 'requests');
    const q = query(
      requestsRef,
      where('forPlayerId', '==', myUid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests: Request[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() ?? new Date(),
      })) as Request[];
      setPartnerRequests(requests);
    });

    return unsubscribe;
  }, [coupleId, myUid]);

  // Fetch partner's suggestions (things partner suggested I could do)
  useEffect(() => {
    if (!coupleId || !partnerId) return;

    const suggestionsRef = collection(db, 'couples', coupleId, 'suggestions');
    const q = query(
      suggestionsRef,
      where('byPlayerId', '==', partnerId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const suggestions: Suggestion[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() ?? new Date(),
      })) as Suggestion[];
      setPartnerSuggestions(suggestions);
    });

    return unsubscribe;
  }, [coupleId, partnerId]);

  // Filter attempts by status
  const filteredAttempts = useMemo(() => {
    let filtered = attempts;

    if (statusFilter === 'pending') {
      filtered = filtered.filter((a) => !a.acknowledged);
    } else if (statusFilter === 'acknowledged') {
      filtered = filtered.filter((a) => a.acknowledged);
    }

    return filtered;
  }, [attempts, statusFilter]);

  // Calculate metrics
  // Waiting: Active requests + suggestions from partner (things waiting for ME to do)
  const waitingCount = useMemo(
    () => partnerRequests.length + partnerSuggestions.length,
    [partnerRequests, partnerSuggestions]
  );

  // Acknowledgements: Items partner logged for me that I need to acknowledge
  const needsAcknowledgementCount = useMemo(
    () => attempts.filter((a) => a.forPlayerId === user?.uid && !a.acknowledged).length,
    [attempts, user?.uid]
  );

  // Total pending for metrics
  const totalPendingCount = useMemo(
    () => attempts.filter((a) => !a.acknowledged).length,
    [attempts]
  );

  const acknowledgedCount = useMemo(
    () => attempts.filter((a) => a.acknowledged).length,
    [attempts]
  );

  const responsivenessPercent = useMemo(() => {
    const total = attempts.length;
    return total > 0 ? Math.round((acknowledgedCount / total) * 100) : 0;
  }, [attempts.length, acknowledgedCount]);

  const totalGems = useMemo(
    () => (myPlayer?.gemCount ?? 0) + (partnerPlayer?.gemCount ?? 0),
    [myPlayer, partnerPlayer]
  );

  // Helper functions
  const getPlayerName = useCallback(
    (playerId: string): string => {
      if (playerId === user?.uid) return myPlayerName;
      return partnerName;
    },
    [user?.uid, myPlayerName, partnerName]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Firestore listener will automatically update
  }, []);

  const handleWaitingPress = useCallback(() => {
    navigation.navigate('LogTab');
  }, [navigation]);

  const handleAcknowledgementsPress = useCallback(() => {
    navigation.navigate('AcknowledgeTab');
  }, [navigation]);

  const handleResponsivenessPress = useCallback(() => {
    navigation.navigate('AcknowledgeTab');
  }, [navigation]);

  const handleGemsPress = useCallback(() => {
    navigation.getParent()?.navigate('GemHistory');
  }, [navigation]);

  const handleOpenLoopsPress = useCallback(() => {
    navigation.navigate('LogTab');
  }, [navigation]);

  const renderAttemptCard = useCallback(
    ({ item }: ListRenderItemInfo<Attempt>) => {
      const isInitiatedByMe = item.byPlayerId === user?.uid;
      const initiatorName = getPlayerName(item.byPlayerId);
      const recipientName = getPlayerName(item.forPlayerId);

      return (
        <TimelineEntryCard
          attempt={item}
          isInitiatedByMe={isInitiatedByMe}
          initiatorName={initiatorName}
          recipientName={recipientName}
        />
      );
    },
    [user?.uid, getPlayerName]
  );

  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>💫</Text>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      {/* Status Snapshot */}
      <View style={styles.statusSnapshot}>
        <StatusSnapshotCard
          type="waiting"
          count={waitingCount}
          onPress={handleWaitingPress}
        />
        <StatusSnapshotCard
          type="acknowledged"
          count={needsAcknowledgementCount}
          onPress={handleAcknowledgementsPress}
        />
      </View>

      {/* Health Insights */}
      <HealthInsightsCard
        responsivenessPercentage={responsivenessPercent}
        gemCount={totalGems}
        openLoopsCount={totalPendingCount}
        onResponsivenessPress={handleResponsivenessPress}
        onGemsPress={handleGemsPress}
        onOpenLoopsPress={handleOpenLoopsPress}
      />

      {/* Collapsible Filters */}
      <CollapsibleFilterControls
        dateFilter={dateFilter}
        statusFilter={statusFilter}
        onDateFilterChange={setDateFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Timeline Header */}
      <Text style={styles.timelineHeader}>Timeline</Text>
    </View>
  ), [
    waitingCount,
    needsAcknowledgementCount,
    responsivenessPercent,
    totalGems,
    totalPendingCount,
    dateFilter,
    statusFilter,
    handleWaitingPress,
    handleAcknowledgementsPress,
    handleResponsivenessPress,
    handleGemsPress,
    handleOpenLoopsPress,
  ]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => setError(null)} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredAttempts}
        renderItem={renderAttemptCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="🌙"
            title="No entries for this period"
            subtitle="Try adjusting your filters"
          />
        }
        contentContainerStyle={styles.listContent}
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerEmoji: {
    fontSize: 32,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  statusSnapshot: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineHeader: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
});

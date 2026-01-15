import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createRequest, deleteRequest, getActiveRequestsInfo } from '../services/api';
import type { ActiveRequestsInfo } from '../services/api';
import { Button, TextInput, LoadingSpinner, EmptyState, ErrorState } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';
import { Request } from '../types';
import { getErrorMessage } from '../types/utils';

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

type FilterType = 'all' | 'active' | 'fulfilled';

interface MakeRequestScreenProps {
  onGoBack: () => void;
}

export function MakeRequestScreen({ onGoBack }: MakeRequestScreenProps) {
  const { user, userData, coupleData } = useAuth();
  const { showSuccess, showError } = useToast();
  const [action, setAction] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestsInfo, setRequestsInfo] = useState<ActiveRequestsInfo | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const coupleId = userData?.activeCoupleId;
  const myUid = user?.uid;
  const partnerIds = coupleData?.partnerIds ?? [];
  const partnerId = partnerIds.find(id => id !== myUid);

  const loadRequestsInfo = useCallback(async () => {
    if (!coupleId) return;
    try {
      const info = await getActiveRequestsInfo(coupleId);
      setRequestsInfo(info);
    } catch (error) {
      console.error('Failed to load active requests info:', error);
    }
  }, [coupleId]);

  useEffect(() => {
    loadRequestsInfo();
  }, [loadRequestsInfo]);

  const handleRetry = useCallback(() => {
    setError(null);
    setInitialLoading(true);
    setRefreshKey(k => k + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (!coupleId || !myUid) return;

    setError(null);
    const requestsRef = collection(db, 'couples', coupleId, 'requests');
    const q = query(
      requestsRef,
      where('byPlayerId', '==', myUid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsList: Request[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() ?? new Date(),
        fulfilledAt: doc.data().fulfilledAt?.toDate(),
      })) as Request[];
      setRequests(requestsList);
      setInitialLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.error('Error fetching requests:', err);
      setError(err.message || 'Failed to load requests');
      setInitialLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, [coupleId, myUid, refreshKey]);

  const atLimit = requestsInfo !== null && requestsInfo.remaining <= 0;

  const handleSubmit = async () => {
    if (!action.trim()) {
      showError('Please enter what you would like');
      return;
    }

    if (!coupleId || !partnerId) {
      showError('No couple found');
      return;
    }

    setLoading(true);
    try {
      await createRequest({
        coupleId,
        forPlayerId: partnerId,
        action: action.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
      });

      await loadRequestsInfo();
      showSuccess(`Request sent! (${requestsInfo ? requestsInfo.count + 1 : 1}/${requestsInfo?.limit || 5} active)`);
      setAction('');
      setDescription('');
      setCategory(null);
      setShowForm(false);
    } catch (error: unknown) {
      showError(getErrorMessage(error) || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = (request: Request) => {
    Alert.alert(
      'Delete Request',
      `Are you sure you want to delete "${request.action}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!coupleId) return;
            setDeleting(request.id);
            try {
              await deleteRequest({ coupleId, requestId: request.id });
              await loadRequestsInfo();
              showSuccess('Request deleted');
            } catch (error: unknown) {
              showError(getErrorMessage(error) || 'Failed to delete request');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'active') return request.status === 'active';
    if (filter === 'fulfilled') return request.status === 'fulfilled';
    return true;
  });

  const activeCount = requests.filter(r => r.status === 'active').length;
  const fulfilledCount = requests.filter(r => r.status === 'fulfilled').length;

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

  if (initialLoading) {
    return <LoadingSpinner message="Loading requests..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scrollContent}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <ErrorState error={error} onRetry={handleRetry} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Make a Request</Text>
          <Text style={styles.subtitle}>Ask your partner for something specific</Text>

          {/* Active Requests Counter */}
          {requestsInfo && (
            <View style={[styles.counterContainer, atLimit && styles.counterContainerLimit]}>
              <Text style={[styles.counterText, atLimit && styles.counterTextLimit]}>
                {atLimit
                  ? `⚠️ Limit reached (${requestsInfo.count}/${requestsInfo.limit} active requests)`
                  : `📋 ${requestsInfo.count}/${requestsInfo.limit} active requests`}
              </Text>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Your request will appear in your partner's Log Attempt screen. When they fulfill it, you both get bonus gems!
          </Text>
        </View>

        {/* Add Request Button */}
        {!showForm && (
          <Button
            title="+ Add Request"
            onPress={() => setShowForm(true)}
            style={styles.addButton}
            disabled={atLimit}
          />
        )}

        {/* Form */}
        {showForm && (
          <View style={styles.formSection}>
            <TextInput
              label="What would you like?"
              value={action}
              onChangeText={setAction}
              placeholder="e.g., Make me coffee in the morning"
              multiline
            />

            <TextInput
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Add more details..."
              multiline
            />

            {/* Category Picker */}
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipSelected,
                  ]}
                  onPress={() => setCategory(category === cat ? null : cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.formButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowForm(false);
                  setAction('');
                  setDescription('');
                  setCategory(null);
                }}
                variant="outline"
                style={styles.cancelButton}
              />
              <Button
                title="Send Request 💌"
                onPress={handleSubmit}
                loading={loading}
                disabled={!action.trim()}
                style={styles.submitButton}
              />
            </View>
          </View>
        )}

        {/* Requests Section */}
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>Your Requests</Text>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                All ({requests.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
              onPress={() => setFilter('active')}
            >
              <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
                Active ({activeCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'fulfilled' && styles.filterTabActive]}
              onPress={() => setFilter('fulfilled')}
            >
              <Text style={[styles.filterText, filter === 'fulfilled' && styles.filterTextActive]}>
                Fulfilled ({fulfilledCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Requests List */}
          {filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <View
                key={request.id}
                style={[
                  styles.requestCard,
                  request.status === 'fulfilled' && styles.requestCardFulfilled,
                ]}
              >
                <View style={styles.requestHeader}>
                  <View style={[
                    styles.statusBadge,
                    request.status === 'fulfilled' ? styles.statusBadgeFulfilled : styles.statusBadgeActive,
                  ]}>
                    <Text style={[
                      styles.statusText,
                      request.status === 'fulfilled' ? styles.statusTextFulfilled : styles.statusTextActive,
                    ]}>
                      {request.status === 'fulfilled' ? '✓ Fulfilled' : '● Active'}
                    </Text>
                  </View>
                  <Text style={styles.requestTime}>
                    {formatDate(request.createdAt)}
                  </Text>
                </View>

                <Text style={styles.requestAction}>{request.action}</Text>

                {request.description && (
                  <Text style={styles.requestDescription}>{request.description}</Text>
                )}

                {request.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{request.category}</Text>
                  </View>
                )}

                {request.status === 'fulfilled' && request.fulfilledAt && (
                  <View style={styles.fulfilledInfo}>
                    <Text style={styles.fulfilledInfoText}>
                      Fulfilled {formatDate(request.fulfilledAt)}
                    </Text>
                  </View>
                )}

                {request.status === 'active' && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteRequest(request)}
                    disabled={deleting === request.id}
                  >
                    <Text style={styles.deleteButtonText}>
                      {deleting === request.id ? 'Deleting...' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <EmptyState
              icon="📝"
              title={
                filter === 'active'
                  ? 'No active requests'
                  : filter === 'fulfilled'
                  ? 'No fulfilled requests yet'
                  : 'No requests yet'
              }
              subtitle="Create one above!"
            />
          )}
        </View>
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
    marginBottom: spacing.xl,
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
  counterContainer: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  counterContainerLimit: {
    backgroundColor: colors.error + '20',
  },
  counterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  counterTextLimit: {
    color: colors.error,
    fontWeight: '600',
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  categoryScroll: {
    marginBottom: spacing.md,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: colors.textOnPrimary,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  addButton: {
    marginBottom: spacing.lg,
  },
  formSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  submitButton: {
    flex: 2,
  },
  requestsSection: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
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
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  requestCardFulfilled: {
    borderLeftColor: colors.success,
    opacity: 0.9,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeActive: {
    backgroundColor: colors.primary + '20',
  },
  statusBadgeFulfilled: {
    backgroundColor: colors.success + '20',
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  statusTextActive: {
    color: colors.primary,
  },
  statusTextFulfilled: {
    color: colors.success,
  },
  requestTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  requestAction: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  requestDescription: {
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
  categoryBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  fulfilledInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fulfilledInfoText: {
    ...typography.caption,
    color: colors.success,
  },
  deleteButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.sm,
  },
  deleteButtonText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
});

import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { Feather } from '@expo/vector-icons';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useGemAnimation } from '../context/GemAnimationContext';
import { acknowledgeAttempt } from '../services/api';
import { Screen, Stack, Row, AppText, Button, LoadingSpinner, EmptyState, ErrorState, CelebrationOverlay, SectionHeader, EmptyHint } from '../components/common';
import { AttemptGemIndicator } from '../components/gems';
import { colors, spacing, borderRadius } from '../theme';
import { Attempt, Request, Suggestion, GemType, GemState } from '../types';
import { getErrorMessage } from '../types/utils';
import { GEM_VALUES, GEM_COLORS } from '../services/api/actions';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CelebrationState {
  visible: boolean;
  message: string;
  subMessage?: string;
}

interface AcknowledgeScreenProps {
  onNavigateToMakeRequest?: () => void;
  onNavigateToManageSuggestions?: () => void;
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  count: number;
  icon: string;
  accentColor: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection = memo(function CollapsibleSection({
  title,
  count,
  icon,
  accentColor,
  defaultExpanded = true,
  children,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.collapsibleSection, { borderLeftColor: accentColor }]}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <SectionHeader
          icon={icon}
          title={title}
          count={count}
          accentColor={accentColor}
          rightElement={
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Feather name="chevron-down" size={20} color={colors.textSecondary} />
            </Animated.View>
          }
        />
      </TouchableOpacity>
      {expanded && <View style={styles.collapsibleContent}>{children}</View>}
    </View>
  );
});

// Attempt Card for Acknowledgements
interface AttemptCardProps {
  attempt: Attempt;
  partnerName: string;
  formatDate: (date: Date) => string;
  acknowledging: string | null;
  onAcknowledge: (attempt: Attempt) => void;
}

const AttemptCard = memo(function AttemptCard({
  attempt,
  partnerName,
  formatDate,
  acknowledging,
  onAcknowledge,
}: AttemptCardProps) {
  // Determine gem type from attempt data or infer from fulfilledRequestId
  const gemType: GemType = attempt.gemType || (attempt.fulfilledRequestId ? 'sapphire' : 'emerald');
  const gemState: GemState = attempt.gemState || 'solid';
  const isCoal = gemState === 'coal';
  const gemColor = GEM_COLORS[gemType];

  return (
    <View style={[styles.attemptCard, isCoal && styles.attemptCardCoal]}>
      <View style={styles.attemptHeader}>
        <View style={styles.attemptHeaderLeft}>
          <AppText variant="bodySmall" color={colors.primary} bold style={styles.attemptBy}>{partnerName}</AppText>
          <AttemptGemIndicator gemType={gemType} gemState={gemState} size="small" />
        </View>
        <AppText variant="caption" color={colors.textMuted}>{formatDate(attempt.createdAt)}</AppText>
      </View>
      <AppText variant="body" bold style={styles.attemptAction}>{attempt.action}</AppText>
      {attempt.description && (
        <AppText variant="bodySmall" color={colors.textSecondary} style={styles.attemptDescription}>{attempt.description}</AppText>
      )}
      {attempt.fulfilledRequestId && (
        <View style={[styles.fulfilledBadge, { backgroundColor: gemColor + '20' }]}>
          <AppText variant="caption" color={gemColor} bold>✨ Fulfilled your request!</AppText>
        </View>
      )}
      {isCoal && (
        <View style={styles.coalBadge}>
          <AppText variant="caption" color={colors.warning} bold>🔥 Reignite this with acknowledgment!</AppText>
        </View>
      )}
      <Button
        title={acknowledging === attempt.id ? 'Acknowledging...' : isCoal ? 'Reignite with Gratitude' : 'Acknowledge with Gratitude'}
        onPress={() => onAcknowledge(attempt)}
        loading={acknowledging === attempt.id}
        disabled={acknowledging !== null}
        style={styles.acknowledgeButton}
      />
    </View>
  );
});

// Request Item Component
interface RequestItemProps {
  request: Request;
  partnerName: string;
}

const RequestItem = memo(function RequestItem({ request, partnerName }: RequestItemProps) {
  const statusColor = request.status === 'fulfilled' ? colors.success : colors.warning;
  const statusText = request.status === 'fulfilled' ? 'Fulfilled' : 'Active';

  return (
    <View style={styles.listItem}>
      <View style={styles.listItemContent}>
        <AppText variant="body" style={styles.listItemTitle}>{request.action}</AppText>
        {request.description && (
          <AppText variant="bodySmall" color={colors.textSecondary} style={styles.listItemDescription}>{request.description}</AppText>
        )}
        <View style={styles.listItemMeta}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <AppText variant="caption" color={statusColor} bold>{statusText}</AppText>
          <AppText variant="caption" color={colors.textMuted} style={styles.metaSeparator}>•</AppText>
          <AppText variant="caption" color={colors.textMuted}>for {partnerName}</AppText>
        </View>
      </View>
    </View>
  );
});

// Suggestion Item Component
interface SuggestionItemProps {
  suggestion: Suggestion;
}

const SuggestionItem = memo(function SuggestionItem({ suggestion }: SuggestionItemProps) {
  return (
    <View style={styles.listItem}>
      <View style={styles.listItemContent}>
        <AppText variant="body" style={styles.listItemTitle}>{suggestion.action}</AppText>
        {suggestion.description && (
          <AppText variant="bodySmall" color={colors.textSecondary} style={styles.listItemDescription}>{suggestion.description}</AppText>
        )}
        {suggestion.category && (
          <View style={styles.categoryChip}>
            <AppText variant="caption" color={colors.textSecondary}>{suggestion.category}</AppText>
          </View>
        )}
      </View>
    </View>
  );
});

// Add Button Component
interface AddButtonProps {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}

const AddButton = memo(function AddButton({ title, subtitle, icon, onPress }: AddButtonProps) {
  return (
    <TouchableOpacity style={styles.addButton} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.addButtonIcon}>
        <AppText style={styles.addButtonEmoji}>{icon}</AppText>
      </View>
      <View style={styles.addButtonContent}>
        <AppText variant="body" color={colors.primary} bold style={styles.addButtonTitle}>{title}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>{subtitle}</AppText>
      </View>
      <Feather name="plus-circle" size={24} color={colors.primary} />
    </TouchableOpacity>
  );
});

export function AcknowledgeScreen({
  onNavigateToMakeRequest,
  onNavigateToManageSuggestions,
}: AcknowledgeScreenProps) {
  const { user, userData, coupleData } = useAuth();
  const { showSuccess, showError } = useToast();
  const { showGemAnimation } = useGemAnimation();

  // State
  const [pendingAttempts, setPendingAttempts] = useState<Attempt[]>([]);
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [mySuggestions, setMySuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>('Partner');
  const [celebration, setCelebration] = useState<CelebrationState>({
    visible: false,
    message: '',
  });
  const [refreshing, setRefreshing] = useState(false);

  const coupleId = userData?.activeCoupleId;
  const myUid = user?.uid;
  const partnerIds = coupleData?.partnerIds ?? [];
  const partnerId = partnerIds.find(id => id !== myUid);

  // Fetch partner name
  useEffect(() => {
    if (!partnerId) return;

    const fetchName = async () => {
      const userDoc = await getDoc(doc(db, 'users', partnerId));
      if (userDoc.exists()) {
        setPartnerName(userDoc.data()?.username || 'Partner');
      }
    };
    fetchName();
  }, [partnerId]);

  // Fetch pending attempts (things I need to acknowledge)
  useEffect(() => {
    if (!coupleId || !myUid) return;

    const attemptsRef = collection(db, 'couples', coupleId, 'attempts');
    const q = query(
      attemptsRef,
      where('forPlayerId', '==', myUid),
      where('acknowledged', '==', false),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Attempt[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() ?? new Date(),
        })) as Attempt[];
        setPendingAttempts(items);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error('Error fetching attempts:', err);
        setError(err.message || 'Failed to load attempts');
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, [coupleId, myUid]);

  // Fetch my requests (things I asked partner to do)
  useEffect(() => {
    if (!coupleId || !myUid) return;

    const requestsRef = collection(db, 'couples', coupleId, 'requests');
    const q = query(
      requestsRef,
      where('byPlayerId', '==', myUid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Request[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() ?? new Date(),
        fulfilledAt: doc.data().fulfilledAt?.toDate(),
      })) as Request[];
      setMyRequests(items);
    });

    return unsubscribe;
  }, [coupleId, myUid]);

  // Fetch my suggestions (ideas for partner)
  useEffect(() => {
    if (!coupleId || !myUid) return;

    const suggestionsRef = collection(db, 'couples', coupleId, 'suggestions');
    const q = query(
      suggestionsRef,
      where('byPlayerId', '==', myUid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Suggestion[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() ?? new Date(),
      })) as Suggestion[];
      setMySuggestions(items);
    });

    return unsubscribe;
  }, [coupleId, myUid]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  const handleAcknowledge = useCallback(async (attempt: Attempt) => {
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
  }, [coupleId, showGemAnimation, showSuccess, showError]);

  const handleDismissCelebration = useCallback(() => {
    setCelebration({ visible: false, message: '' });
  }, []);

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

  const hasPendingItems = pendingAttempts.length > 0;
  const activeRequests = myRequests.filter(r => r.status === 'active');

  if (loading) {
    return (
      <Screen>
        <LoadingSpinner message="Loading..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={() => setError(null)} />
      </Screen>
    );
  }

  return (
    <Screen scroll onRefresh={handleRefresh} refreshing={refreshing}>
      <Stack gap="lg">
        {/* Header */}
        <Stack gap="xs">
          <AppText variant="h1" color={colors.primary}>Receive</AppText>
          <AppText variant="body" color={colors.textSecondary}>
            {hasPendingItems
              ? `${pendingAttempts.length} item${pendingAttempts.length !== 1 ? 's' : ''} need${pendingAttempts.length === 1 ? 's' : ''} your attention`
              : 'All caught up! Manage your requests below.'}
          </AppText>
        </Stack>

        {/* Dynamic Layout based on pending items */}
        {hasPendingItems ? (
          <>
            {/* Pending Acknowledgements - Expanded by default when items exist */}
            <CollapsibleSection
              title="Needs Acknowledgement"
              count={pendingAttempts.length}
              icon="💝"
              accentColor={colors.warning}
              defaultExpanded={true}
            >
              {pendingAttempts.map((attempt) => (
                <AttemptCard
                  key={attempt.id}
                  attempt={attempt}
                  partnerName={partnerName}
                  formatDate={formatDate}
                  acknowledging={acknowledging}
                  onAcknowledge={handleAcknowledge}
                />
              ))}
            </CollapsibleSection>

            {/* Requests & Suggestions - Collapsed when acknowledgements exist */}
            <CollapsibleSection
              title="My Requests"
              count={activeRequests.length}
              icon="📝"
              accentColor={colors.primary}
              defaultExpanded={false}
            >
              <AddButton
                title="Make a Request"
                subtitle="Ask your partner for something meaningful"
                icon="📝"
                onPress={onNavigateToMakeRequest || (() => {})}
              />
              {myRequests.slice(0, 3).map((request) => (
                <RequestItem key={request.id} request={request} partnerName={partnerName} />
              ))}
              {myRequests.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={onNavigateToMakeRequest}
                >
                  <AppText variant="bodySmall" color={colors.primary}>View all {myRequests.length} requests</AppText>
                  <Feather name="arrow-right" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="My Suggestions"
              count={mySuggestions.length}
              icon="💡"
              accentColor={colors.emerald400}
              defaultExpanded={false}
            >
              <AddButton
                title="Add a Suggestion"
                subtitle="Ideas for how your partner can fill your cup"
                icon="💡"
                onPress={onNavigateToManageSuggestions || (() => {})}
              />
              {mySuggestions.slice(0, 3).map((suggestion) => (
                <SuggestionItem key={suggestion.id} suggestion={suggestion} />
              ))}
              {mySuggestions.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={onNavigateToManageSuggestions}
                >
                  <AppText variant="bodySmall" color={colors.primary}>View all {mySuggestions.length} suggestions</AppText>
                  <Feather name="arrow-right" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </CollapsibleSection>
          </>
        ) : (
          <>
            {/* When no pending items - Show Requests & Suggestions prominently */}
            <View style={styles.emptyStateCard}>
              <AppText style={styles.emptyStateIcon}>✨</AppText>
              <AppText variant="h3" style={styles.emptyStateTitle}>All caught up!</AppText>
              <AppText variant="body" color={colors.textSecondary} style={styles.emptyStateText}>
                No pending acknowledgements. Take this time to manage your requests and suggestions.
              </AppText>
            </View>

            {/* Requests Section - Prominent */}
            <View style={styles.prominentSection}>
              <View style={styles.sectionHeader}>
                <SectionHeader
                  icon="📝"
                  title="My Requests"
                  count={activeRequests.length}
                  countSuffix="active"
                  accentColor={colors.primary}
                  prominent
                />
              </View>

              <AddButton
                title="Make a Request"
                subtitle="Ask your partner for something meaningful"
                icon="📝"
                onPress={onNavigateToMakeRequest || (() => {})}
              />

              {myRequests.length > 0 ? (
                <>
                  {myRequests.slice(0, 3).map((request) => (
                    <RequestItem key={request.id} request={request} partnerName={partnerName} />
                  ))}
                  {myRequests.length > 3 && (
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={onNavigateToMakeRequest}
                    >
                      <AppText variant="bodySmall" color={colors.primary}>View all {myRequests.length} requests</AppText>
                      <Feather name="arrow-right" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <EmptyHint message="No requests yet. Tap above to ask your partner for something!" />
              )}
            </View>

            {/* Suggestions Section - Prominent */}
            <View style={styles.prominentSection}>
              <View style={styles.sectionHeader}>
                <SectionHeader
                  icon="💡"
                  title="My Suggestions"
                  count={mySuggestions.length}
                  accentColor={colors.emerald400}
                  prominent
                />
              </View>

              <AddButton
                title="Add a Suggestion"
                subtitle="Ideas for how your partner can fill your cup"
                icon="💡"
                onPress={onNavigateToManageSuggestions || (() => {})}
              />

              {mySuggestions.length > 0 ? (
                <>
                  {mySuggestions.slice(0, 3).map((suggestion) => (
                    <SuggestionItem key={suggestion.id} suggestion={suggestion} />
                  ))}
                  {mySuggestions.length > 3 && (
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={onNavigateToManageSuggestions}
                    >
                      <AppText variant="bodySmall" color={colors.primary}>View all {mySuggestions.length} suggestions</AppText>
                      <Feather name="arrow-right" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <EmptyHint message="No suggestions yet. Help your partner know what fills your cup!" />
              )}
            </View>
          </>
        )}
      </Stack>

      <CelebrationOverlay
        visible={celebration.visible}
        message={celebration.message}
        subMessage={celebration.subMessage}
        onDismiss={handleDismissCelebration}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Collapsible Section
  collapsibleSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  // Note: collapsibleTitleRow, collapsibleIcon, collapsibleTitle, countBadge, countBadgeText
  // removed in DOM refactor - now using SectionHeader component
  collapsibleContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  // Attempt Card
  attemptCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  attemptCardCoal: {
    borderWidth: 1,
    borderColor: colors.warning + '40',
    backgroundColor: colors.card + 'CC',
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  attemptHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  coalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  attemptBy: {
    // Handled by AppText
  },
  attemptAction: {
    marginBottom: spacing.xs,
  },
  attemptDescription: {
    marginBottom: spacing.sm,
  },
  fulfilledBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  acknowledgeButton: {
    marginTop: spacing.xs,
  },
  // List Items (Requests/Suggestions)
  listItem: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    marginBottom: 4,
  },
  listItemDescription: {
    marginBottom: spacing.xs,
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  metaSeparator: {
    marginHorizontal: spacing.xs,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  addButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  addButtonEmoji: {
    fontSize: 18,
  },
  addButtonContent: {
    flex: 1,
  },
  addButtonTitle: {
    marginBottom: 2,
  },
  // View All Button
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginRight: spacing.xs,
  },
  // Empty State
  emptyStateCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyStateTitle: {
    marginBottom: spacing.xs,
  },
  emptyStateText: {
    textAlign: 'center',
  },
  // Prominent Section (when no pending items)
  prominentSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  // Note: sectionIcon, sectionTitle removed in DOM refactor - now using SectionHeader component
  // Note: emptyListHint, emptyListHintText removed in DOM refactor - now using EmptyHint component
});

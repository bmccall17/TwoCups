import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useGemAnimation } from '../context/GemAnimationContext';
import { logAttempt, getDailyAttemptsInfo, DailyAttemptsInfo } from '../services/api';
import { AppText, Button, TextInput, LoadingSpinner, EmptyState, ErrorState } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';
import { Request, Suggestion } from '../types';
import { getErrorMessage } from '../types/utils';
import {
  validateAction,
  validateDescription,
  sanitizeText,
  MAX_LENGTHS,
} from '../utils/validation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

interface LogAttemptScreenProps {
  onGoBack: () => void;
}

export function LogAttemptScreen({ onGoBack }: LogAttemptScreenProps) {
  const { user, userData, coupleData } = useAuth();
  const { showSuccess, showError, showCelebration } = useToast();
  const { showGemAnimation } = useGemAnimation();
  const tabBarHeight = useBottomTabBarHeight();
  const [action, setAction] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerRequests, setPartnerRequests] = useState<Request[]>([]);
  const [partnerSuggestions, setPartnerSuggestions] = useState<Suggestion[]>([]);
  const [dailyAttemptsInfo, setDailyAttemptsInfo] = useState<DailyAttemptsInfo | null>(null);
  const [suggestionFilter, setSuggestionFilter] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const coupleId = userData?.activeCoupleId;
  const myUid = user?.uid;
  const partnerIds = coupleData?.partnerIds ?? [];
  const partnerId = partnerIds.find(id => id !== myUid);

  // Fetch daily attempts info
  useEffect(() => {
    if (!coupleId) return;

    const fetchDailyInfo = async () => {
      try {
        const info = await getDailyAttemptsInfo(coupleId);
        setDailyAttemptsInfo(info);
      } catch (error) {
        console.error('Error fetching daily attempts info:', error);
      }
    };

    fetchDailyInfo();
  }, [coupleId]);

  // Fetch partner's active requests (requests they made for ME to fulfill)
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

  const handleRetry = useCallback(() => {
    setError(null);
    setInitialLoading(true);
    setRefreshKey(k => k + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
  }, []);

  // Fetch partner's suggestions (ways to fill their cup)
  useEffect(() => {
    if (!coupleId || !partnerId) return;

    setError(null);
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
      setInitialLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.error('Error fetching suggestions:', err);
      setError(err.message || 'Failed to load data');
      setInitialLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, [coupleId, partnerId, refreshKey]);

  const handleSelectRequest = (request: Request) => {
    setAction(request.action);
    setDescription(request.description || '');
    setCategory(request.category || null);
    setShowForm(true);
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setAction(suggestion.action);
    setDescription(suggestion.description || '');
    setCategory(suggestion.category || null);
    setShowForm(true);
  };

  // Compute category counts for filter chips
  const categoryCounts = partnerSuggestions.reduce((acc, s) => {
    if (s.category) {
      acc[s.category] = (acc[s.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Filter suggestions by selected category
  const filteredSuggestions = suggestionFilter
    ? partnerSuggestions.filter(s => s.category === suggestionFilter)
    : partnerSuggestions;

  // Get categories that have suggestions
  const categoriesWithSuggestions = CATEGORIES.filter(cat => categoryCounts[cat] > 0);

  const handleSubmit = async () => {
    // Validate action
    const actionValidation = validateAction(action);
    if (!actionValidation.isValid) {
      showError(actionValidation.error || 'Please enter an action');
      return;
    }

    // Validate description (optional but has max length)
    const descValidation = validateDescription(description);
    if (!descValidation.isValid) {
      showError(descValidation.error || 'Description is too long');
      return;
    }

    if (!coupleId || !partnerId) {
      showError('No couple found');
      return;
    }

    if (dailyAttemptsInfo && dailyAttemptsInfo.remaining <= 0) {
      showError(`You've logged ${dailyAttemptsInfo.limit} attempts today. Try again tomorrow!`);
      return;
    }

    setLoading(true);
    try {
      const result = await logAttempt({
        coupleId,
        forPlayerId: partnerId,
        action: sanitizeText(action, true),
        description: description.trim() ? sanitizeText(description, true) : undefined,
        category: category || undefined,
      });

      const remainingAfter = dailyAttemptsInfo ? dailyAttemptsInfo.remaining - 1 : null;
      const remainingMessage = remainingAfter !== null ? ` (${remainingAfter} remaining today)` : '';

      showGemAnimation(result.gemsAwarded, undefined, SCREEN_HEIGHT / 3);

      if (result.fulfilledRequestId) {
        showCelebration(
          `Request fulfilled!${remainingMessage}`,
          undefined,
          { amount: result.gemsAwarded, isBonus: true }
        );
      } else {
        showSuccess(
          `Attempt logged!${remainingMessage}`,
          undefined,
          { amount: result.gemsAwarded }
        );
      }

      if (dailyAttemptsInfo) {
        setDailyAttemptsInfo({
          ...dailyAttemptsInfo,
          count: dailyAttemptsInfo.count + 1,
          remaining: dailyAttemptsInfo.remaining - 1,
        });
      }

      setAction('');
      setDescription('');
      setCategory(null);
      setShowForm(false);

      setTimeout(() => onGoBack(), 1500);
    } catch (error: unknown) {
      showError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner message="Loading suggestions..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scrollContent}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <AppText variant="body" color={colors.primary}>← Back</AppText>
          </TouchableOpacity>
          <ErrorState error={error} onRetry={handleRetry} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight }]}
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
            <AppText variant="body" color={colors.primary}>← Back</AppText>
          </TouchableOpacity>
          <AppText variant="h1" color={colors.primary} style={styles.title}>Log an Attempt</AppText>
          <AppText variant="body" color={colors.textSecondary}>What did you do for your partner?</AppText>
          
          {/* Daily attempts counter */}
          {dailyAttemptsInfo && (
            <View style={[
              styles.attemptsCounter,
              dailyAttemptsInfo.remaining === 0 && styles.attemptsCounterLimit
            ]}>
              <AppText
                variant="bodySmall"
                color={dailyAttemptsInfo.remaining === 0 ? colors.error : colors.textSecondary}
                bold={dailyAttemptsInfo.remaining === 0}
                style={styles.attemptsCounterText}
              >
                {dailyAttemptsInfo.remaining === 0
                  ? `Daily limit reached (${dailyAttemptsInfo.limit}/${dailyAttemptsInfo.limit})`
                  : `${dailyAttemptsInfo.remaining} of ${dailyAttemptsInfo.limit} attempts remaining today`}
              </AppText>
            </View>
          )}
        </View>

        {/* Partner's Requests */}
        {partnerRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <AppText variant="h3" style={styles.sectionTitle}>Partner's Requests</AppText>
            <AppText variant="caption" color={colors.success} style={styles.sectionHint}>Fulfill a request for +2 bonus gems!</AppText>
            {partnerRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => handleSelectRequest(request)}
              >
                <AppText variant="body" style={styles.requestAction}>{request.action}</AppText>
                {request.category && (
                  <AppText variant="caption" color={colors.textSecondary}>{request.category}</AppText>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Partner's Suggestions */}
        <View style={styles.suggestionsSection}>
          <AppText variant="h3" style={styles.sectionTitle}>Partner's Suggestions</AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.suggestionHint}>Ways to fill your partner's cup</AppText>
          
          {/* Category filter chips */}
          {partnerSuggestions.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.filterChipsScroll}
              contentContainerStyle={styles.filterChipsContainer}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  suggestionFilter === null && styles.filterChipSelected,
                ]}
                onPress={() => setSuggestionFilter(null)}
              >
                <AppText
                  variant="caption"
                  color={suggestionFilter === null ? colors.textOnPrimary : colors.textSecondary}
                >
                  All ({partnerSuggestions.length})
                </AppText>
              </TouchableOpacity>
              {categoriesWithSuggestions.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    suggestionFilter === cat && styles.filterChipSelected,
                  ]}
                  onPress={() => setSuggestionFilter(suggestionFilter === cat ? null : cat)}
                >
                  <AppText
                    variant="caption"
                    color={suggestionFilter === cat ? colors.textOnPrimary : colors.textSecondary}
                  >
                    {cat} ({categoryCounts[cat]})
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Suggestions list */}
          {partnerSuggestions.length > 0 ? (
            <View style={styles.suggestionsList}>
              {filteredSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={styles.suggestionCard}
                  onPress={() => handleSelectSuggestion(suggestion)}
                >
                  <AppText variant="body" style={styles.suggestionAction}>{suggestion.action}</AppText>
                  {suggestion.category && (
                    <AppText variant="caption" color={colors.textSecondary}>{suggestion.category}</AppText>
                  )}
                </TouchableOpacity>
              ))}
              {filteredSuggestions.length === 0 && suggestionFilter && (
                <AppText variant="body" color={colors.textMuted} style={styles.noSuggestionsText}>
                  No suggestions in this category
                </AppText>
              )}
            </View>
          ) : (
            <EmptyState
              icon="💡"
              title="Your partner hasn't added suggestions yet"
              subtitle="You can still log custom attempts!"
            />
          )}
        </View>

        {/* Add Attempt Button */}
        {!showForm && (
          <Button
            title="+ Log an Attempt"
            onPress={() => setShowForm(true)}
            style={styles.addButton}
            disabled={dailyAttemptsInfo?.remaining === 0}
          />
        )}

        {/* Custom Entry Section */}
        {showForm && (
          <View style={styles.formSection}>
            <AppText variant="h3" style={styles.formSectionTitle}>Log an Attempt</AppText>
            <TextInput
              label="Action"
              value={action}
              onChangeText={setAction}
              placeholder="What did you do?"
              multiline
              maxLength={MAX_LENGTHS.ACTION}
              showCharacterCount
            />

            <TextInput
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Add more details..."
              multiline
              maxLength={MAX_LENGTHS.DESCRIPTION}
              showCharacterCount
            />

            {/* Category Picker */}
            <AppText variant="caption" color={colors.textSecondary} style={styles.inputLabel}>Category</AppText>
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
                  <AppText
                    variant="caption"
                    color={category === cat ? colors.textOnPrimary : colors.textSecondary}
                  >
                    {cat}
                  </AppText>
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
                title="Log Attempt 💝"
                onPress={handleSubmit}
                loading={loading}
                disabled={!action.trim()}
                style={styles.submitButton}
              />
            </View>
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
    marginBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.xs,
  },
  attemptsCounter: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attemptsCounterLimit: {
    backgroundColor: colors.error + '20',
    borderColor: colors.error,
  },
  attemptsCounterText: {
    textAlign: 'center',
  },
  requestsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  sectionHint: {
    marginBottom: spacing.md,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  requestAction: {
    // Handled by AppText
  },
  suggestionsSection: {
    marginBottom: spacing.xl,
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  suggestionHint: {
    marginBottom: spacing.md,
  },
  filterChipsScroll: {
    marginBottom: spacing.md,
  },
  filterChipsContainer: {
    paddingRight: spacing.md,
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  suggestionAction: {
    // Handled by AppText
  },
  noSuggestionsText: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  addButton: {
    marginBottom: spacing.lg,
  },
  formSection: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  formSectionTitle: {
    marginBottom: spacing.md,
  },
  inputLabel: {
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
  submitButton: {
    flex: 2,
  },
});

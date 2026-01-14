import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { logAttempt, getDailyAttemptsInfo, DailyAttemptsInfo } from '../services/api';
import { Button, TextInput, LoadingSpinner, EmptyState } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';
import { Request, Suggestion } from '../types';

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
  const [action, setAction] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [partnerRequests, setPartnerRequests] = useState<Request[]>([]);
  const [partnerSuggestions, setPartnerSuggestions] = useState<Suggestion[]>([]);
  const [dailyAttemptsInfo, setDailyAttemptsInfo] = useState<DailyAttemptsInfo | null>(null);
  const [suggestionFilter, setSuggestionFilter] = useState<string | null>(null);

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

  // Fetch partner's suggestions (ways to fill their cup)
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
      setInitialLoading(false);
    });

    return unsubscribe;
  }, [coupleId, partnerId]);

  const handleSelectRequest = (request: Request) => {
    setAction(request.action);
    setDescription(request.description || '');
    setCategory(request.category || null);
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setAction(suggestion.action);
    setDescription(suggestion.description || '');
    setCategory(suggestion.category || null);
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
    if (!action.trim()) {
      showError('Please enter an action');
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
        action: action.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
      });

      const remainingAfter = dailyAttemptsInfo ? dailyAttemptsInfo.remaining - 1 : null;
      const remainingMessage = remainingAfter !== null ? ` (${remainingAfter} remaining today)` : '';

      if (result.fulfilledRequestId) {
        showCelebration(`+${result.gemsAwarded} gems! Request fulfilled!${remainingMessage}`);
      } else {
        showSuccess(`+${result.gemsAwarded} gem!${remainingMessage}`);
      }

      if (dailyAttemptsInfo) {
        setDailyAttemptsInfo({
          ...dailyAttemptsInfo,
          count: dailyAttemptsInfo.count + 1,
          remaining: dailyAttemptsInfo.remaining - 1,
        });
      }

      setTimeout(() => onGoBack(), 1500);
    } catch (error: any) {
      showError(error.message || 'Failed to log attempt');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingSpinner message="Loading suggestions..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Log an Attempt</Text>
          <Text style={styles.subtitle}>What did you do for your partner?</Text>
          
          {/* Daily attempts counter */}
          {dailyAttemptsInfo && (
            <View style={[
              styles.attemptsCounter,
              dailyAttemptsInfo.remaining === 0 && styles.attemptsCounterLimit
            ]}>
              <Text style={[
                styles.attemptsCounterText,
                dailyAttemptsInfo.remaining === 0 && styles.attemptsCounterTextLimit
              ]}>
                {dailyAttemptsInfo.remaining === 0
                  ? `Daily limit reached (${dailyAttemptsInfo.limit}/${dailyAttemptsInfo.limit})`
                  : `${dailyAttemptsInfo.remaining} of ${dailyAttemptsInfo.limit} attempts remaining today`}
              </Text>
            </View>
          )}
        </View>

        {/* Partner's Requests */}
        {partnerRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <Text style={styles.sectionTitle}>Partner's Requests</Text>
            <Text style={styles.sectionHint}>Fulfill a request for +2 bonus gems!</Text>
            {partnerRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => handleSelectRequest(request)}
              >
                <Text style={styles.requestAction}>{request.action}</Text>
                {request.category && (
                  <Text style={styles.requestCategory}>{request.category}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Partner's Suggestions */}
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>Partner's Suggestions</Text>
          <Text style={styles.suggestionHint}>Ways to fill your partner's cup</Text>
          
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
                <Text
                  style={[
                    styles.filterChipText,
                    suggestionFilter === null && styles.filterChipTextSelected,
                  ]}
                >
                  All ({partnerSuggestions.length})
                </Text>
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
                  <Text
                    style={[
                      styles.filterChipText,
                      suggestionFilter === cat && styles.filterChipTextSelected,
                    ]}
                  >
                    {cat} ({categoryCounts[cat]})
                  </Text>
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
                  <Text style={styles.suggestionAction}>{suggestion.action}</Text>
                  {suggestion.category && (
                    <Text style={styles.suggestionCategory}>{suggestion.category}</Text>
                  )}
                </TouchableOpacity>
              ))}
              {filteredSuggestions.length === 0 && suggestionFilter && (
                <Text style={styles.noSuggestionsText}>
                  No suggestions in this category
                </Text>
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

        {/* Custom Entry Section */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Or Log a Custom Attempt</Text>
          <TextInput
            label="Action"
            value={action}
            onChangeText={setAction}
            placeholder="What did you do?"
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
        </View>

        {/* Submit Button */}
        <Button
          title={dailyAttemptsInfo?.remaining === 0 ? "Daily Limit Reached" : "Log Attempt 💝"}
          onPress={handleSubmit}
          loading={loading}
          disabled={!action.trim() || dailyAttemptsInfo?.remaining === 0}
          style={styles.submitButton}
        />
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
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  attemptsCounterTextLimit: {
    color: colors.error,
    fontWeight: '600',
  },
  requestsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.success,
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
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  requestCategory: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
    ...typography.caption,
    color: colors.textSecondary,
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
  filterChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  filterChipTextSelected: {
    color: colors.textOnPrimary,
    fontWeight: '600',
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
    ...typography.body,
    color: colors.textPrimary,
  },
  suggestionCategory: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  noSuggestionsText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  formSection: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formSectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
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
  submitButton: {
    marginTop: 'auto',
  },
});

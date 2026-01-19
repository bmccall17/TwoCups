import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { createSuggestion, deleteSuggestion } from '../services/api';
import { Screen, Stack, Row, Button, TextInput, LoadingSpinner, EmptyState, ErrorState, AppText } from '../components/common';
import { colors, spacing, borderRadius } from '../theme';
import { Suggestion } from '../types';
import { getErrorMessage } from '../types/utils';
import {
  validateAction,
  validateDescription,
  sanitizeText,
  MAX_LENGTHS,
} from '../utils/validation';

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

interface ManageSuggestionsScreenProps {
  onGoBack: () => void;
}

export function ManageSuggestionsScreen({ onGoBack }: ManageSuggestionsScreenProps) {
  const { user, userData } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [action, setAction] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const coupleId = userData?.activeCoupleId;
  const myUid = user?.uid;

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
      setSuggestions(items);
      setInitialLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.error('Error fetching suggestions:', err);
      setError(err.message || 'Failed to load suggestions');
      setInitialLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, [coupleId, myUid, refreshKey]);

  const handleSubmit = async () => {
    // Validate action
    const actionValidation = validateAction(action);
    if (!actionValidation.isValid) {
      Alert.alert('Error', actionValidation.error || 'Please enter a suggestion');
      return;
    }

    // Validate description (optional but has max length)
    const descValidation = validateDescription(description);
    if (!descValidation.isValid) {
      Alert.alert('Error', descValidation.error || 'Description is too long');
      return;
    }

    if (!coupleId) {
      Alert.alert('Error', 'No couple found');
      return;
    }

    setLoading(true);
    try {
      await createSuggestion({
        coupleId,
        action: sanitizeText(action, true),
        description: description.trim() ? sanitizeText(description, true) : undefined,
        category: category || undefined,
      });

      setAction('');
      setDescription('');
      setCategory(null);
      setShowForm(false);
      Alert.alert('Success', 'Suggestion added! Your partner will see this.');
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error) || 'Failed to create suggestion');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (suggestionId: string) => {
    if (!coupleId) return;

    const doDelete = async () => {
      try {
        await deleteSuggestion({ coupleId, suggestionId });
      } catch (error: unknown) {
        if (Platform.OS === 'web') {
          alert(getErrorMessage(error) || 'Failed to delete');
        } else {
          Alert.alert('Error', getErrorMessage(error) || 'Failed to delete');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this suggestion?')) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Delete Suggestion',
        'Are you sure you want to delete this suggestion?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    const cat = suggestion.category || 'Uncategorized';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(suggestion);
    return acc;
  }, {} as Record<string, Suggestion[]>);

  if (initialLoading) {
    return <LoadingSpinner message="Loading suggestions..." />;
  }

  if (error) {
    return (
      <Screen tabBarInset={false}>
        <Stack gap="md">
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <AppText variant="body" color={colors.primary}>← Back</AppText>
          </TouchableOpacity>
          <ErrorState error={error} onRetry={handleRetry} />
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen scroll tabBarInset={false} onRefresh={handleRefresh} refreshing={refreshing}>
      <Stack gap="lg">
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <AppText variant="body" color={colors.primary}>← Back</AppText>
          </TouchableOpacity>
          <AppText variant="h1" color={colors.primary} style={styles.title}>My Suggestions</AppText>
          <AppText variant="body" color={colors.textSecondary}>Ways your partner can fill your cup</AppText>
        </View>

        {suggestions.length === 0 && (
          <View style={styles.infoBox}>
            <AppText variant="bodySmall" color={colors.textSecondary}>
              Add suggestions for things that make you feel loved. Your partner will see these in their Log Attempt screen.
            </AppText>
          </View>
        )}

        {!showForm && (
          <Button
            title="+ Add Suggestion"
            onPress={() => setShowForm(true)}
            style={styles.addButton}
          />
        )}

        {showForm && (
          <View style={styles.formSection}>
            <TextInput
              label="What would fill your cup?"
              value={action}
              onChangeText={setAction}
              placeholder="e.g., Bring me coffee in the morning"
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

            <AppText variant="bodySmall" color={colors.textSecondary} style={styles.inputLabel}>Category</AppText>
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
                title="Add Suggestion"
                onPress={handleSubmit}
                loading={loading}
                disabled={!action.trim()}
                style={styles.submitButton}
              />
            </View>
          </View>
        )}

        <View style={styles.suggestionsSection}>
          <AppText variant="h3" style={styles.sectionTitle}>
            Your Suggestions ({suggestions.length})
          </AppText>

          {suggestions.length === 0 ? (
            <EmptyState
              icon="💝"
              title="No suggestions yet"
              subtitle="Add ways your partner can fill your cup!"
            />
          ) : (
            Object.entries(groupedSuggestions).map(([cat, items]) => (
              <View key={cat} style={styles.categoryGroup}>
                <AppText variant="bodySmall" color={colors.primary} bold style={styles.categoryTitle}>{cat}</AppText>
                {items.map((suggestion) => (
                  <View key={suggestion.id} style={styles.suggestionCard}>
                    <View style={styles.suggestionContent}>
                      <AppText variant="body" bold>{suggestion.action}</AppText>
                      {suggestion.description && (
                        <AppText variant="bodySmall" color={colors.textSecondary} style={styles.suggestionDescription}>
                          {suggestion.description}
                        </AppText>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(suggestion.id)}
                      style={styles.deleteButton}
                    >
                      <AppText variant="body" color={colors.error} bold style={styles.deleteText}>✕</AppText>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.sm,
  },
  backButton: {
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: spacing.xs,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
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
  inputLabel: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  categoryScroll: {
    marginBottom: spacing.md,
  },
  categoryChip: {
    backgroundColor: colors.background,
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
  suggestionsSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  categoryGroup: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    marginBottom: spacing.sm,
  },
  suggestionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionDescription: {
    marginTop: spacing.xs,
  },
  deleteButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  deleteText: {
    fontSize: 18,
  },
});

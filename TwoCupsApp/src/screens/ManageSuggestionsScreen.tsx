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
import { createSuggestion, deleteSuggestion } from '../services/api';
import { Button, TextInput, LoadingSpinner, EmptyState, ErrorState } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';
import { Suggestion } from '../types';

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
    if (!action.trim()) {
      Alert.alert('Error', 'Please enter a suggestion');
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
        action: action.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
      });

      setAction('');
      setDescription('');
      setCategory(null);
      setShowForm(false);
      Alert.alert('Success', 'Suggestion added! Your partner will see this.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create suggestion');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (suggestionId: string) => {
    if (!coupleId) return;

    Alert.alert(
      'Delete Suggestion',
      'Are you sure you want to delete this suggestion?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSuggestion({ coupleId, suggestionId });
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
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
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Suggestions</Text>
          <Text style={styles.subtitle}>Ways your partner can fill your cup</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Add suggestions for things that make you feel loved. Your partner will see these in their Log Attempt screen.
          </Text>
        </View>

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
            />

            <TextInput
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Add more details..."
              multiline
            />

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
          <Text style={styles.sectionTitle}>
            Your Suggestions ({suggestions.length})
          </Text>

          {suggestions.length === 0 ? (
            <EmptyState
              icon="💝"
              title="No suggestions yet"
              subtitle="Add ways your partner can fill your cup!"
            />
          ) : (
            Object.entries(groupedSuggestions).map(([cat, items]) => (
              <View key={cat} style={styles.categoryGroup}>
                <Text style={styles.categoryTitle}>{cat}</Text>
                {items.map((suggestion) => (
                  <View key={suggestion.id} style={styles.suggestionCard}>
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionAction}>{suggestion.action}</Text>
                      {suggestion.description && (
                        <Text style={styles.suggestionDescription}>
                          {suggestion.description}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(suggestion.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))
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
    marginBottom: spacing.lg,
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
  categoryChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: colors.textOnPrimary,
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
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  categoryGroup: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
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
  suggestionAction: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  suggestionDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  deleteButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  deleteText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
});
